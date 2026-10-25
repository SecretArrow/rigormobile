/**
 * CPU mining worker loop — runs inside a Web Worker (browser) or a Node
 * worker_thread. Iterates nonces over a job spec, calls the kernel, and posts
 * back stats + any valid solutions found.
 *
 * This module is intentionally framework-agnostic: it does not depend on
 * `self` or `worker_threads` directly. The host (browser worker / RN worker
 * / Node) is responsible for wiring up the `postMessage` callback.
 */

import { rigorHash } from './kernel';
import { checkHash } from './kernel';
import { setNonce, setTimestamp } from '../protocol/header';
import { HEADER_SIZE } from '../protocol/constants';

/** A mining job: a fully-formed 80-byte header with nonce = 0, plus the
 *  compact `bits` target and the range of nonces this worker should scan. */
export interface MiningJob {
  /** 80-byte header with nonce=0 — the worker mutates bytes 76..80 only. */
  header: Uint8Array;
  /** Compact target (the `bits` field from `getblocktemplate`). */
  bits: number;
  /** Inclusive start nonce. */
  startNonce: number;
  /** Exclusive end nonce. */
  endNonce: number;
  /** Optional: refresh the timestamp every N nonces (default 0 = never). */
  refreshTimestampEvery?: number;
  /** Optional job ID for correlation. */
  jobId?: string;
}

/** Periodic stats posted by the worker to the host. */
export interface MiningStats {
  type: 'stats';
  jobId?: string;
  hashes: number;
  hashesPerSecond: number;
  elapsedMs: number;
  /** Last nonce attempted (for resume). */
  lastNonce: number;
}

/** Posted when a valid solution is found. */
export interface SolutionFound {
  type: 'solution';
  jobId?: string;
  nonce: number;
  header: Uint8Array;
  digest: Uint8Array;
}

/** Posted when the worker has finished scanning its assigned range. */
export interface JobDone {
  type: 'done';
  jobId?: string;
  hashes: number;
  elapsedMs: number;
}

/** Posted when an error occurs in the worker. */
export interface JobError {
  type: 'error';
  jobId?: string;
  message: string;
}

export type WorkerMessage = MiningStats | SolutionFound | JobDone | JobError;

/**
 * Run a mining job. The `post` callback is invoked with stats every
 * `statsIntervalMs` ms, immediately when a solution is found, and once when
 * the scan completes. The function returns when the range is exhausted or
 * when `shouldStop()` returns true.
 *
 * This is the function you call from your Worker's `onmessage` handler.
 */
export function runJob(
  job: MiningJob,
  post: (msg: WorkerMessage) => void,
  options: {
    statsIntervalMs?: number;
    shouldStop?: () => boolean;
  } = {},
): void {
  const statsIntervalMs = options.statsIntervalMs ?? 1000;
  const shouldStop = options.shouldStop ?? (() => false);

  if (job.header.length !== HEADER_SIZE) {
    post({
      type: 'error',
      jobId: job.jobId,
      message: `header must be ${HEADER_SIZE} bytes, got ${job.header.length}`,
    });
    return;
  }

  // Copy the header so we can mutate the nonce without affecting the caller.
  const header = new Uint8Array(job.header);
  const start = Date.now();
  let lastStats = start;
  let hashes = 0;
  let nonce = job.startNonce >>> 0;
  const end = job.endNonce >>> 0;
  let lastTimestampRefresh = 0;

  while (nonce !== end) {
    setNonce(header, nonce);
    if (
      job.refreshTimestampEvery &&
      hashes - lastTimestampRefresh >= job.refreshTimestampEvery
    ) {
      setTimestamp(header, Math.floor(Date.now() / 1000));
      lastTimestampRefresh = hashes;
    }

    const { valid, digest } = checkHash(header, job.bits);
    hashes++;

    if (valid) {
      // Post the solution immediately; the host will stop us via shouldStop.
      post({
        type: 'solution',
        jobId: job.jobId,
        nonce,
        header: header.slice(),
        digest,
      });
    }

    if ((nonce & 0xfff) === 0) {
      // Check stop + stats every 4096 hashes to keep per-iter overhead low.
      if (shouldStop()) {
        const now = Date.now();
        post({
          type: 'stats',
          jobId: job.jobId,
          hashes,
          hashesPerSecond: (hashes * 1000) / Math.max(1, now - start),
          elapsedMs: now - start,
          lastNonce: nonce,
        });
        return;
      }
      const now = Date.now();
      if (now - lastStats >= statsIntervalMs) {
        post({
          type: 'stats',
          jobId: job.jobId,
          hashes,
          hashesPerSecond: (hashes * 1000) / Math.max(1, now - start),
          elapsedMs: now - start,
          lastNonce: nonce,
        });
        lastStats = now;
      }
    }

    nonce = (nonce + 1) >>> 0;
    if (nonce === job.startNonce) break; // wrapped around the uint32 space
  }

  const now = Date.now();
  post({
    type: 'stats',
    jobId: job.jobId,
    hashes,
    hashesPerSecond: (hashes * 1000) / Math.max(1, now - start),
    elapsedMs: now - start,
    lastNonce: nonce,
  });
  post({
    type: 'done',
    jobId: job.jobId,
    hashes,
    elapsedMs: now - start,
  });
}

/** Hash a single header + nonce and return the digest. Used by unit tests
 *  and by the WebGPU fallback when only one hash is needed. */
export function hashWithNonce(header: Uint8Array, nonce: number): Uint8Array {
  const copy = new Uint8Array(header);
  setNonce(copy, nonce);
  return rigorHash(copy);
}
