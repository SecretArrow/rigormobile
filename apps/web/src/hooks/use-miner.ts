/**
 * Client-side miner hook — wraps {@link Miner} and exposes reactive state
 * (hashes, hps, solutions, status) for the React UI.
 *
 * The hook picks the best backend at startup (WebGPU → Worker pool → CPU)
 * and reconnects to the RigorChain RPC node (configurable) to refresh the
 * block template periodically. Solutions are submitted back via
 * `submitblock`.
 */

"use client";

import * as React from "react";
import {
  detectBackend,
  Miner,
  WorkerPoolMiner,
  CpuMiner,
  WebGpuMiner,
  isWebGpuAvailable,
  templateToJob,
  type BlockTemplate,
  type MinerStats,
} from "@rigormobile/rigor-core/mining";
import { RigorRpcClient } from "@rigormobile/rigor-core/rpc";
import { formatHashRate, formatDuration } from "@rigormobile/rigor-core/utils";

export interface MinerState {
  status: "idle" | "starting" | "running" | "stopping" | "error";
  backend: "webgpu" | "worker-pool" | "cpu" | "unknown";
  parallelism: number;
  hashes: number;
  hashesPerSecond: number;
  elapsedMs: number;
  lastNonce: number;
  lastDigest: string;
  solutionsFound: number;
  lastSolutionAt: number | null;
  blockHeight: number | null;
  blockBits: string | null;
  errorMessage: string | null;
}

const INITIAL_STATE: MinerState = {
  status: "idle",
  backend: "unknown",
  parallelism: 0,
  hashes: 0,
  hashesPerSecond: 0,
  elapsedMs: 0,
  lastNonce: 0,
  lastDigest: "",
  solutionsFound: 0,
  lastSolutionAt: null,
  blockHeight: null,
  blockBits: null,
  errorMessage: null,
};

export interface UseMinerOptions {
  rpcUrl?: string;
  rpcUsername?: string;
  rpcPassword?: string;
  preferredBackend?: "webgpu" | "worker-pool" | "cpu";
  autoStart?: boolean;
  /** Refresh block template every N seconds (default 60). */
  refreshIntervalSec?: number;
}

export function useMiner(options: UseMinerOptions = {}) {
  const [state, setState] = React.useState<MinerState>(INITIAL_STATE);
  const minerRef = React.useRef<Miner | null>(null);
  const rpcRef = React.useRef<RigorRpcClient | null>(null);
  const currentTemplateRef = React.useRef<BlockTemplate | null>(null);
  const statsBufferRef = React.useRef<MinerStats[]>([]); // last 60 samples for sparkline

  const rpc = React.useMemo(() => {
    if (!options.rpcUrl && !options.rpcUsername) return null;
    return new RigorRpcClient({
      url: options.rpcUrl,
      username: options.rpcUsername,
      password: options.rpcPassword,
    });
  }, [options.rpcUrl, options.rpcUsername, options.rpcPassword]);
  React.useEffect(() => {
    rpcRef.current = rpc;
  }, [rpc]);

  const initMiner = React.useCallback(async () => {
    if (minerRef.current) return minerRef.current;
    let backend = options.preferredBackend ?? detectBackend();
    if (backend === "webgpu" && !(await isWebGpuAvailable())) {
      backend = "worker-pool";
    }
    let miner: Miner;
    if (backend === "webgpu") {
      const m = new WebGpuMiner();
      const ok = await m.init();
      miner = ok
        ? m
        : new WorkerPoolMiner(
            new URL("../miner-worker/index.ts", import.meta.url),
          );
    } else if (backend === "worker-pool") {
      miner = new WorkerPoolMiner(
        new URL("../miner-worker/index.ts", import.meta.url),
      );
    } else {
      miner = new CpuMiner();
    }
    miner.on("stats", (s) => {
      setState((prev) => ({
        ...prev,
        hashes: s.hashes,
        hashesPerSecond: s.hashesPerSecond,
        backend: s.backend,
        parallelism: s.parallelism,
        lastNonce: s.lastNonce,
        elapsedMs: s.elapsedMs,
      }));
      statsBufferRef.current.push(s);
      if (statsBufferRef.current.length > 60) statsBufferRef.current.shift();
    });
    miner.on("solution", (sol) => {
      setState((prev) => ({
        ...prev,
        solutionsFound: prev.solutionsFound + 1,
        lastSolutionAt: Date.now(),
        lastDigest: Array.from(sol.digest)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
      }));
      // Best-effort submit back to the node
      if (rpcRef.current) {
        rpcRef.current
          .submitBlock(
            Array.from(sol.header)
              .map((b) => b.toString(16).padStart(2, "0"))
              .join(""),
          )
          .then((res) => {
            if (res !== null) {
              console.warn("submitblock rejected:", res);
            }
          })
          .catch((err) => console.warn("submitblock error:", err));
      }
    });
    miner.on("error", (err) => {
      setState((prev) => ({
        ...prev,
        status: "error",
        errorMessage: err.message,
      }));
    });
    miner.on("stopped", () => {
      setState((prev) => ({ ...prev, status: "idle" }));
    });
    minerRef.current = miner;
    return miner;
  }, [options.preferredBackend]);

  const refreshTemplate = React.useCallback(async () => {
    if (!rpcRef.current) return null;
    try {
      const tpl = (await rpcRef.current.getBlockTemplate()) as BlockTemplate;
      currentTemplateRef.current = tpl;
      setState((prev) => ({
        ...prev,
        blockHeight: tpl.height ?? prev.blockHeight,
        blockBits: tpl.bits ?? prev.blockBits,
        errorMessage: null,
      }));
      return tpl;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        errorMessage: err instanceof Error ? err.message : String(err),
      }));
      return null;
    }
  }, []);

  const start = React.useCallback(async () => {
    setState((prev) => ({ ...prev, status: "starting", errorMessage: null }));
    const miner = await initMiner();
    let tpl = currentTemplateRef.current;
    if (!tpl) {
      tpl = await refreshTemplate();
    }
    if (!tpl) {
      // No RPC connection — mine on a synthetic "demo" template so the UI
      // shows live hashrate even without a local node.
      tpl = makeDemoTemplate();
    }
    const job = templateToJob(tpl, { jobId: `job-${Date.now()}` });
    setState((prev) => ({ ...prev, status: "running" }));
    await miner.start(job);
  }, [initMiner, refreshTemplate]);

  const stop = React.useCallback(() => {
    setState((prev) => ({ ...prev, status: "stopping" }));
    minerRef.current?.stop();
  }, []);

  // Periodic template refresh (every 60s by default)
  React.useEffect(() => {
    if (!options.rpcUrl) return;
    const sec = options.refreshIntervalSec ?? 60;
    const id = setInterval(refreshTemplate, sec * 1000);
    return () => clearInterval(id);
  }, [options.rpcUrl, options.refreshIntervalSec, refreshTemplate]);

  React.useEffect(() => {
    return () => {
      minerRef.current?.stop();
    };
  }, []);

  return {
    state,
    start,
    stop,
    refreshTemplate,
    statsHistory: statsBufferRef.current,
    formatHashRate: (n: number) => formatHashRate(n),
    formatDuration: (n: number) => formatDuration(n),
  };
}

/** Construct a fake block template so the UI can demo mining without a node. */
function makeDemoTemplate(): BlockTemplate {
  return {
    version: 0x20000000,
    previousblockhash:
      "e2ce92cfef740f92e8cc84a8541d8e760c776c668afd9b61740b3a4315241468",
    transactions: [],
    coinbasetxn: {
      data: "",
      txid: "0000000000000000000000000000000000000000000000000000000000000000",
    },
    coinbasevalue: 128 * 1e8,
    bits: "207fffff", // very easy target — finds shares quickly for demo
    curtime: Math.floor(Date.now() / 1000),
    height: 1,
    _id: `demo-${Date.now()}`,
  };
}
