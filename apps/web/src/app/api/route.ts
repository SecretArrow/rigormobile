import { NextResponse } from "next/server";
import {
  CHAIN_NAME,
  MAGIC_BYTES,
  P2P_PORT,
  RPC_PORT,
  BECH32_HRP,
  RGR_POW_TAG,
  HEADER_SIZE,
  ORU_BLOCK_SUBSIDY,
  TARGET_BLOCK_TIME,
  GENESIS_HASH,
} from "@rigormobile/rigor-core/protocol";

/**
 * GET /api — public network info. Used by the UI and by health checks.
 */
export async function GET() {
  return NextResponse.json({
    app: "rigormobile-web",
    version: "0.1.0",
    chain: {
      name: CHAIN_NAME,
      magic: Array.from(MAGIC_BYTES)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" "),
      p2pPort: P2P_PORT,
      rpcPort: RPC_PORT,
      bech32Hrp: BECH32_HRP,
      genesisHash: GENESIS_HASH,
    },
    pow: {
      algorithm: "SHA3-256",
      tag: RGR_POW_TAG,
      headerSize: HEADER_SIZE,
      targetBlockTime: TARGET_BLOCK_TIME,
      blockSubsidy: ORU_BLOCK_SUBSIDY,
    },
    time: new Date().toISOString(),
  });
}
