/**
 * RigorChain JSON-RPC client.
 *
 * Talks to a local `rigor` node over HTTP (default port 8761). Supports:
 *   - getblockchaininfo
 *   - getblocktemplate
 *   - submitblock
 *   - getblock (by hash or height)
 *   - getnewaddress (wallet)
 *   - getbalance (wallet)
 *   - sendtoaddress (wallet)
 *   - listunspent (wallet)
 *
 * The client never stores the wallet password — it is passed per-call by the
 * caller. This makes it safe to share a single RPC client across many UI
 * components without leaking credentials.
 *
 * Both `fetch` (browser) and `node:fetch` (Node 20+) work — no polyfills
 * needed. React Native provides `fetch` globally too.
 */

import { RPC_PORT } from '../protocol/constants';

export interface RpcOptions {
  /** RPC URL, e.g. `http://127.0.0.1:8761`. */
  url?: string;
  /** RPC username. */
  username?: string;
  /** RPC password (kept in memory only, never logged). */
  password?: string;
  /** Request timeout in ms. Default 30 000. */
  timeoutMs?: number;
  /** Optional fetch implementation (defaults to global fetch). */
  fetchImpl?: typeof fetch;
  /** Optional headers to add to every request. */
  headers?: Record<string, string>;
}

export interface RpcResponse<T> {
  result: T;
  error: { code: number; message: string } | null;
  id: string | number;
}

export class RpcError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(`RPC ${code}: ${message}`);
    this.code = code;
    this.name = 'RpcError';
  }
}

/** Default JSON-RPC client for a local RIGOR node. */
export class RigorRpcClient {
  readonly url: string;
  private username?: string;
  private password?: string;
  private timeoutMs: number;
  private fetchImpl: typeof fetch;
  private extraHeaders: Record<string, string>;
  private nextId = 1;

  constructor(opts: RpcOptions = {}) {
    const port = opts.url ? '' : `:${RPC_PORT}`;
    this.url = opts.url ?? `http://127.0.0.1${port}`;
    this.username = opts.username;
    this.password = opts.password;
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.extraHeaders = opts.headers ?? {};
  }

  /** Issue a single JSON-RPC call. */
  async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const id = this.nextId++;
    const body = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.extraHeaders,
    };
    if (this.username && this.password) {
      const creds = btoaSafe(`${this.username}:${this.password}`);
      headers.Authorization = `Basic ${creds}`;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(this.url, {
        method: 'POST',
        headers,
        body,
        signal: ctrl.signal,
      });
      if (!res.ok) {
        throw new RpcError(res.status, `HTTP ${res.status} ${res.statusText}`);
      }
      const json = (await res.json()) as RpcResponse<T>;
      if (json.error) throw new RpcError(json.error.code, json.error.message);
      return json.result;
    } finally {
      clearTimeout(timer);
    }
  }

  // --- Blockchain methods ---

  getBlockchainInfo() {
    return this.call<{
      chain: string;
      blocks: number;
      headers: number;
      bestblockhash: string;
      difficulty: number;
      verificationprogress: number;
      chainwork: string;
      pruned: boolean;
    }>('getblockchaininfo');
  }

  getBlockTemplate(options?: { rules?: string[]; capabilities?: string[] }) {
    return this.call<unknown>('getblocktemplate', [options ?? {}]);
  }

  submitBlock(blockHex: string) {
    return this.call<
      | null
      | 'invalid'
      | 'invalid-cb-found'
      | 'invalid-chain-locked'
      | 'invalid-prior-block'
      | 'unknown-error'
    >('submitblock', [blockHex]);
  }

  getBlock(hashOrHeight: string | number, verbosity = 1) {
    return this.call<unknown>('getblock', [hashOrHeight, verbosity]);
  }

  getBlockHash(height: number) {
    return this.call<string>('getblockhash', [height]);
  }

  getMiningInfo() {
    return this.call<{
      blocks: number;
      currentblockweight: number;
      currentblocktx: number;
      difficulty: number;
      networkhashps: number;
      pooledtx: number;
      chain: string;
      warnings: string;
    }>('getmininginfo');
  }

  // --- Wallet methods ---

  getNewAddress(label?: string) {
    return this.call<string>('getnewaddress', label ? [label] : []);
  }

  getBalance() {
    return this.call<number>('getbalance');
  }

  sendToAddress(address: string, amount: number, comment?: string) {
    return this.call<string>('sendtoaddress', [
      address,
      amount,
      comment ?? '',
      '',
    ]);
  }

  listUnspent(minConf = 1, maxConf = 9_999_999) {
    return this.call<
      Array<{
        txid: string;
        vout: number;
        address: string;
        amount: number;
        confirmations: number;
        spendable: boolean;
      }>
    >('listunspent', [minConf, maxConf]);
  }

  validateAddress(address: string) {
    return this.call<{ isvalid: boolean; address: string }>('validateaddress', [
      address,
    ]);
  }
}

/** btoa that works in Node, browser, and RN. */
function btoaSafe(s: string): string {
  if (typeof btoa === 'function') return btoa(s);
  // Node
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(s, 'utf-8').toString('base64');
  }
  throw new Error('no btoa implementation available');
}
