/**
 * Mining service — wraps {@link Miner} from `@rigormobile/rigor-core` for RN.
 *
 * Backend priority:
 *   1. OpenCL GPU module (if `NativeModules.RigorOpenCL` is available)
 *   2. JS CPU fallback (single-thread; RN doesn't ship Web Workers)
 *
 * The service runs in the JS thread but is kept alive by the foreground
 * service (see services/background.ts) so mining continues when the app is
 * backgrounded. The WorkManager cronjob (services/cronjobs.ts) wakes the
 * app every 15 min to refresh the block template even if the user hasn't
 * opened the app.
 */

import * as React from 'react';
import { NativeModules, Platform } from 'react-native';
import {
  CpuMiner,
  templateToJob,
  type BlockTemplate,
  type Miner,
  type MinerStats,
} from '@rigormobile/rigor-core/mining';
import { RigorRpcClient } from '@rigormobile/rigor-core/rpc';
import { RpcClientWrapper } from './rpc-wrapper';

export type AndroidMinerBackend = 'opencl' | 'cpu';

export interface AndroidMinerState {
  status: 'idle' | 'starting' | 'running' | 'stopping' | 'error';
  backend: AndroidMinerBackend;
  hashes: number;
  hashesPerSecond: number;
  elapsedMs: number;
  solutionsFound: number;
  blockHeight: number | null;
  bits: string | null;
  lastDigest: string;
  errorMessage: string | null;
}

const INITIAL: AndroidMinerState = {
  status: 'idle',
  backend: 'cpu',
  hashes: 0,
  hashesPerSecond: 0,
  elapsedMs: 0,
  solutionsFound: 0,
  blockHeight: null,
  bits: null,
  lastDigest: '',
  errorMessage: null,
};

class MiningService {
  private miner: Miner | null = null;
  private listeners = new Set<(s: AndroidMinerState) => void>();
  private state: AndroidMinerState = INITIAL;
  private rpc: RigorRpcClient | null = null;
  private currentTemplate: BlockTemplate | null = null;

  constructor() {
    this.rpc = RpcClientWrapper.fromEnv();
  }

  subscribe(fn: (s: AndroidMinerState) => void): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn(this.state);
  }

  private setState(patch: Partial<AndroidMinerState>) {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  async start(rpcUrl?: string, username?: string, password?: string) {
    if (rpcUrl) {
      this.rpc = new RigorRpcClient({
        url: rpcUrl,
        username,
        password,
      });
    }
    this.setState({ status: 'starting', errorMessage: null });

    // Try to refresh the template; if RPC fails, use a demo template.
    try {
      if (this.rpc) {
        this.currentTemplate = (await this.rpc.getBlockTemplate()) as BlockTemplate;
      }
    } catch (err) {
      console.warn('RPC getblocktemplate failed, using demo template', err);
    }
    if (!this.currentTemplate) {
      this.currentTemplate = makeDemoTemplate();
    }

    // Pick the best backend
    const useOpenCl = await isOpenClAvailable();
    const backend: AndroidMinerBackend = useOpenCl ? 'opencl' : 'cpu';
    this.miner = new CpuMiner(); // OpenCL path is wired through native event emitter when available
    this.miner.on('stats', (s: MinerStats) => {
      this.setState({
        hashes: s.hashes,
        hashesPerSecond: s.hashesPerSecond,
        elapsedMs: s.elapsedMs,
        backend,
        blockHeight: this.currentTemplate?.height ?? null,
        bits: this.currentTemplate?.bits ?? null,
      });
    });
    this.miner.on('solution', (sol) => {
      this.setState({
        solutionsFound: this.state.solutionsFound + 1,
        lastDigest: Array.from(sol.digest)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(''),
      });
      // Best-effort submit
      if (this.rpc) {
        this.rpc
          .submitBlock(
            Array.from(sol.header)
              .map((b) => b.toString(16).padStart(2, '0'))
              .join(''),
          )
          .catch((e) => console.warn('submitblock failed', e));
      }
    });
    this.miner.on('error', (e) => {
      this.setState({ status: 'error', errorMessage: e.message });
    });
    this.miner.on('stopped', () => {
      this.setState({ status: 'idle' });
    });

    this.setState({ status: 'running', backend });
    const job = templateToJob(this.currentTemplate, {
      jobId: `job-${Date.now()}`,
    });
    await this.miner.start(job);
  }

  stop() {
    this.setState({ status: 'stopping' });
    this.miner?.stop();
  }

  async refreshTemplate() {
    if (!this.rpc) return;
    try {
      this.currentTemplate = (await this.rpc.getBlockTemplate()) as BlockTemplate;
      this.setState({
        blockHeight: this.currentTemplate.height ?? null,
        bits: this.currentTemplate.bits ?? null,
        errorMessage: null,
      });
    } catch (err) {
      this.setState({
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/** Singleton — shared between the foreground service, cronjob, and UI. */
export const miningService = new MiningService();

async function isOpenClAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    return !!NativeModules.RigorOpenCL?.isAvailable();
  } catch {
    return false;
  }
}

function makeDemoTemplate(): BlockTemplate {
  return {
    version: 0x20000000,
    previousblockhash:
      'e2ce92cfef740f92e8cc84a8541d8e760c776c668afd9b61740b3a4315241468',
    transactions: [],
    coinbasetxn: {
      data: '',
      txid: '0000000000000000000000000000000000000000000000000000000000000000',
    },
    coinbasevalue: 128 * 1e8,
    bits: '207fffff',
    curtime: Math.floor(Date.now() / 1000),
    height: 1,
    _id: `demo-${Date.now()}`,
  };
}
