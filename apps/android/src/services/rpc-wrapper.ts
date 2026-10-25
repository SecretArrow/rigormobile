/**
 * RPC client wrapper for React Native.
 *
 * RN doesn't ship `btoa` natively (the @rigormobile/rigor-core RpcClient
 * uses it for Basic auth) — we polyfill it here. We also allow the URL /
 * credentials to be configured via AsyncStorage / SecureStore at runtime.
 */

import * as React from 'react';
import { Platform } from 'react-native';
import { RigorRpcClient } from '@rigormobile/rigor-core/rpc';

// RN lacks btoa — install a base64 encoder if needed.
if (Platform.OS !== 'web') {
  const g = globalThis as unknown as {
    btoa?: (s: string) => string;
    atob?: (s: string) => string;
  };
  if (typeof g.btoa !== 'function') {
    g.btoa = (s: string) => {
      // Lazy import to avoid pulling base64 into the bundle on web.
      const { Buffer } = require('buffer');
      return Buffer.from(s, 'utf-8').toString('base64');
    };
    g.atob = (s: string) => {
      const { Buffer } = require('buffer');
      return Buffer.from(s, 'base64').toString('utf-8');
    };
  }
}

export class RpcClientWrapper {
  static fromEnv(): RigorRpcClient | null {
    const url = process.env.RIGOR_RPC_URL;
    if (!url) return null;
    return new RigorRpcClient({
      url,
      username: process.env.RIGOR_RPC_USER,
      password: process.env.RIGOR_RPC_PASS,
    });
  }

  static fromConfig(config: {
    url: string;
    username?: string;
    password?: string;
  }): RigorRpcClient {
    return new RigorRpcClient(config);
  }
}
