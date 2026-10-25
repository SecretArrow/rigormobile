/**
 * Mining-strategy controller — picks the best available backend
 * (WebGPU → Web Worker pool → single-thread JS) and exposes a uniform
 * `Miner` interface to the UI.
 *
 * The backend choice happens at runtime; this module is safe to import from
 * the browser, a Web Worker, Node, or React Native. On platforms without
 * `navigator` (Node, RN), only the `cpu` backend is available.
 */

import type { MiningJob, WorkerMessage } from "./worker";

export type MinerBackend = "webgpu" | "worker-pool" | "cpu";

export interface MinerOptions {
  /** Preferred backend. If unavailable, falls back to the next in the list. */
  backend?: MinerBackend;
  /** For worker-pool: number of workers to spawn. Default: hardwareConcurrency. */
  workerCount?: number;
  /** For worker-pool: size of each nonce range assigned to a worker. Default: 0x01000000 (16M). */
  chunkSize?: number;
  /** Stats callback interval in ms. Default: 1000. */
  statsIntervalMs?: number;
}

export interface MinerStats {
  /** Total hashes computed across all backends. */
  hashes: number;
  /** Rolling hashes-per-second. */
  hashesPerSecond: number;
  /** Active backend (after fallback resolution). */
  backend: MinerBackend;
  /** Number of workers/threads currently active. */
  parallelism: number;
  /** Most recent nonce attempted. */
  lastNonce: number;
  /** Time the current job has been running, in ms. */
  elapsedMs: number;
}

export interface MinerEventMap {
  stats: MinerStats;
  solution: {
    jobId?: string;
    nonce: number;
    header: Uint8Array;
    digest: Uint8Array;
  };
  error: { message: string };
  stopped: void;
}

/** Tiny typed event emitter — no Node `events` dependency so it works in
 *  browser workers and React Native without polyfills. */
export class TypedEmitter<M extends object> {
  private listeners: { [K in keyof M]?: Array<(payload: M[K]) => void> } = {};

  on<K extends keyof M>(event: K, fn: (payload: M[K]) => void): () => void {
    (this.listeners[event] ??= []).push(fn);
    return () => this.off(event, fn);
  }
  off<K extends keyof M>(event: K, fn: (payload: M[K]) => void): void {
    const arr = this.listeners[event];
    if (arr) {
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    }
  }
  protected emit<K extends keyof M>(event: K, payload: M[K]): void {
    const arr = this.listeners[event];
    if (arr) for (const fn of arr.slice()) fn(payload);
  }
}

/**
 * Detect which mining backend is available in the current environment.
 * Order: WebGPU → Worker pool → single-thread CPU.
 */
export function detectBackend(): MinerBackend {
  if (typeof navigator !== "undefined" && "gpu" in navigator) {
    return "webgpu";
  }
  if (typeof Worker !== "undefined") {
    return "worker-pool";
  }
  return "cpu";
}

/**
 * Abstract miner — concretely implemented by `WebGpuMiner`, `WorkerPoolMiner`
 * and `CpuMiner`. UIs should hold a `Miner` reference and not care which
 * concrete class is active.
 */
export abstract class Miner extends TypedEmitter<MinerEventMap> {
  abstract readonly backend: MinerBackend;
  abstract readonly parallelism: number;
  protected currentJob?: MiningJob;
  protected stopped = false;
  protected startMs = 0;
  protected hashes = 0;
  protected lastNonce = 0;

  /** Begin scanning a job. Resolves when the job range is exhausted or
   *  `stop()` is called. Solutions are emitted via the 'solution' event. */
  abstract start(job: MiningJob): Promise<void>;

  /** Stop the current job as soon as possible. */
  stop(): void {
    this.stopped = true;
  }

  protected handleWorkerMessage = (msg: WorkerMessage): void => {
    if (msg.type === "stats") {
      this.hashes = msg.hashes;
      this.lastNonce = msg.lastNonce;
      this.emit("stats", {
        hashes: this.hashes,
        hashesPerSecond: msg.hashesPerSecond,
        backend: this.backend,
        parallelism: this.parallelism,
        lastNonce: this.lastNonce,
        elapsedMs: Date.now() - this.startMs,
      });
    } else if (msg.type === "solution") {
      this.emit("solution", {
        jobId: msg.jobId,
        nonce: msg.nonce,
        header: msg.header,
        digest: msg.digest,
      });
    } else if (msg.type === "error") {
      this.emit("error", { message: msg.message });
    }
  };
}
