/** Tiny platform-agnostic helpers used throughout the package. */

export { bytesToHex, hexToBytes } from '../wallet/hd';

/** Format a hash-rate (H/s) as a human-friendly string. */
export function formatHashRate(hps: number): string {
  if (hps >= 1e9) return `${(hps / 1e9).toFixed(2)} GH/s`;
  if (hps >= 1e6) return `${(hps / 1e6).toFixed(2)} MH/s`;
  if (hps >= 1e3) return `${(hps / 1e3).toFixed(2)} kH/s`;
  return `${hps.toFixed(1)} H/s`;
}

/** Format a duration in ms as `HH:MM:SS`. */
export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, '0')).join(':');
}

/** Convert an amount of ORU (integer base units) to a display string. */
export function formatOru(satoshis: number): string {
  const whole = Math.floor(satoshis / 1e8);
  const frac = satoshis % 1e8;
  return `${whole}.${frac.toString().padStart(8, '0')} ORU`;
}

/** Promise-based delay. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Type guard: object has a key. */
export function hasKey<T extends object>(obj: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/** Generate a random hex string of `bytes` bytes. */
export function randomHex(bytes: number): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  let s = '';
  for (let i = 0; i < arr.length; i++) {
    s += arr[i]!.toString(16).padStart(2, '0');
  }
  return s;
}
