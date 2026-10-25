import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/route';

describe('/api route', () => {
  it('returns the RigorChain network info', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.chain.name).toBe('RIGOR');
    expect(json.chain.bech32Hrp).toBe('rg');
    expect(json.chain.p2pPort).toBe(8760);
    expect(json.chain.rpcPort).toBe(8761);
    expect(json.pow.tag).toBe('RGRPOW01');
    expect(json.pow.algorithm).toBe('SHA3-256');
    expect(json.pow.headerSize).toBe(80);
    expect(json.pow.blockSubsidy).toBe(128);
  });
});
