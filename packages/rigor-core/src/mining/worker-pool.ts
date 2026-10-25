/**
 * Web Worker pool backend — spawns `workerCount` workers, splits the nonce
 * space into chunks, and aggregates stats.
 *
 * The actual worker script is provided by the consumer (the web app) so that
 * the bundler can resolve it correctly. The pool only needs the worker URL.
 */

import { Miner, type MinerBackend, type MinerOptions } from './miner';
import type { MiningJob, WorkerMessage } from './worker';

export class WorkerPoolMiner extends Miner {
  readonly backend: MinerBackend = 'worker-pool';
  readonly parallelism: number;
  private workers: Worker[] = [];
  private workerUrl: string | URL;
  private chunkSize: number;

  constructor(workerUrl: string | URL, options: MinerOptions = {}) {
    super();
    this.workerUrl = workerUrl;
    this.parallelism =
      options.workerCount ??
      (typeof navigator !== 'undefined' && navigator.hardwareConcurrency
        ? Math.max(1, Math.min(8, navigator.hardwareConcurrency - 1))
        : 2);
    this.chunkSize = options.chunkSize ?? 0x01000000; // 16M nonces per chunk
  }

  async start(job: MiningJob): Promise<void> {
    this.stopped = false;
    this.startMs = Date.now();
    this.hashes = 0;
    this.lastNonce = job.startNonce;

    // Spawn workers
    for (let i = 0; i < this.parallelism; i++) {
      const w = new Worker(this.workerUrl, { type: 'module' });
      w.onmessage = (ev: MessageEvent<WorkerMessage>) => this.handleWorkerMessage(ev.data);
      w.onerror = (e) => this.emit('error', { message: String(e.message ?? e) });
      this.workers.push(w);
    }

    // Distribute chunks across workers in a round-robin pattern.
    let nextStart = job.startNonce >>> 0;
    let workerIdx = 0;
    while (!this.stopped && nextStart !== job.endNonce) {
      const end = Math.min(
        job.endNonce,
        (nextStart + this.chunkSize) >>> 0,
      );
      const w = this.workers[workerIdx % this.workers.length]!;
      w.postMessage({
        type: 'job',
        job: { ...job, startNonce: nextStart, endNonce: end },
      });
      workerIdx++;
      nextStart = end;
      if (end === 0 && job.endNonce === 0) break; // wrap-around guard
    }

    // Wait for all workers to finish their current chunk
    await Promise.all(this.workers.map((w) => this.waitForWorker(w)));
    this.emit('stopped', undefined);
    this.teardown();
  }

  private waitForWorker(w: Worker): Promise<void> {
    return new Promise((resolve) => {
      const handler = (ev: MessageEvent<WorkerMessage>) => {
        if (ev.data.type === 'done') {
          w.removeEventListener('message', handler);
          resolve();
        }
      };
      w.addEventListener('message', handler);
    });
  }

  private teardown(): void {
    for (const w of this.workers) {
      try {
        w.terminate();
      } catch {
        /* ignore */
      }
    }
    this.workers = [];
  }

  override stop(): void {
    super.stop();
    this.teardown();
  }
}
