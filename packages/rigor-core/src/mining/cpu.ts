/**
 * Single-threaded CPU backend — used as the last-resort fallback when neither
 * WebGPU nor Worker is available. Also useful for unit tests.
 */

import { Miner, type MinerBackend } from './miner';
import { runJob, type MiningJob } from './worker';

export class CpuMiner extends Miner {
  readonly backend: MinerBackend = 'cpu';
  readonly parallelism = 1;
  private runner: Promise<void> | null = null;

  async start(job: MiningJob): Promise<void> {
    this.stopped = false;
    this.startMs = Date.now();
    this.hashes = 0;
    this.lastNonce = job.startNonce;
    this.currentJob = job;
    this.runner = new Promise<void>((resolve) => {
      runJob(job, this.handleWorkerMessage, {
        statsIntervalMs: 1000,
        shouldStop: () => this.stopped,
      });
      resolve();
    });
    await this.runner;
    this.emit('stopped', undefined);
  }
}
