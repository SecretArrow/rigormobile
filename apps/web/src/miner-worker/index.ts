/**
 * Web Worker entry point — wraps `@rigormobile/rigor-core` mining kernel.
 *
 * Receives a `MiningJob` and posts back stats/solution/done messages.
 * The worker terminates itself after `done` so the pool can re-dispatch.
 */

/// <reference lib="webworker" />

import { runJob, type MiningJob, type WorkerMessage } from '@rigormobile/rigor-core/mining';

interface InboundJob {
  type: 'job';
  job: MiningJob;
}

interface InboundStop {
  type: 'stop';
}

type Inbound = InboundJob | InboundStop;

let stopped = false;

self.onmessage = (ev: MessageEvent<Inbound>) => {
  const msg = ev.data;
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'stop') {
    stopped = true;
    return;
  }
  if (msg.type === 'job') {
    stopped = false;
    runJob(
      msg.job,
      (m: WorkerMessage) => {
        (self as unknown as Worker).postMessage(m);
      },
      {
        statsIntervalMs: 1000,
        shouldStop: () => stopped,
      },
    );
  }
};
