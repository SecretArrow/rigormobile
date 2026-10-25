"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Blocks,
  Cpu,
  Gauge,
  Globe2,
  Hash,
  Zap,
  Timer,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CHAIN_NAME,
  GENESIS_HASH,
  HEADER_SIZE,
  ORU_BLOCK_SUBSIDY,
  RPC_PORT,
  P2P_PORT,
  BECH32_HRP,
  RGR_POW_TAG,
  TARGET_BLOCK_TIME,
} from "@rigormobile/rigor-core/protocol";

interface DashboardProps {
  hashrate: number;
  minerStatus: "idle" | "starting" | "running" | "stopping" | "error";
  minerBackend: string;
}

export function Dashboard({
  hashrate,
  minerStatus,
  minerBackend,
}: DashboardProps) {
  return (
    <div className="space-y-4">
      {/* Top stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Zap className="size-4" />}
          label="Hashrate"
          value={formatHr(hashrate)}
          accent
          delay={0}
        />
        <StatCard
          icon={<Cpu className="size-4" />}
          label="Backend"
          value={minerBackend}
          delay={0.05}
        />
        <StatCard
          icon={<Timer className="size-4" />}
          label="Block time"
          value={`${TARGET_BLOCK_TIME / 60} min`}
          delay={0.1}
        />
        <StatCard
          icon={<Blocks className="size-4" />}
          label="Subsidy"
          value={`${ORU_BLOCK_SUBSIDY} ORU`}
          delay={0.15}
        />
      </div>

      {/* Mining pipeline + network */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              Mining pipeline
            </CardTitle>
            <CardDescription>
              How a block flows from your miner to the chain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <PipelineStep
              n={1}
              title="getblocktemplate"
              detail="Fetch the latest block template from your local RIGOR node (RPC 8761)."
            />
            <PipelineStep
              n={2}
              title="Build 80-byte header"
              detail="version + prevBlock + merkleRoot + curtime + bits + nonce(0)."
            />
            <PipelineStep
              n={3}
              title="Iterate nonce"
              detail={
                <span className="hash-mono text-[11px]">
                  SHA3-256("RGRPOW01" || header_80) &lt; target(bits)
                </span>
              }
            />
            <PipelineStep
              n={4}
              title="submitblock"
              detail="Push the solved block back to the node. Payout: 128 ORU coinbase."
            />
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe2 className="size-4 text-primary" />
              Network constants
            </CardTitle>
            <CardDescription>RigorChain mainnet v0.2</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <KV label="Chain" value={CHAIN_NAME} />
            <KV label="Magic bytes" value="ce f1 db fa" mono />
            <KV label="P2P port" value={String(P2P_PORT)} mono />
            <KV label="RPC port" value={String(RPC_PORT)} mono />
            <KV label="Bech32 HRP" value={BECH32_HRP} mono />
            <KV label="Header size" value={`${HEADER_SIZE} bytes`} mono />
            <KV label="PoW tag" value={RGR_POW_TAG} mono />
            <KV
              label="Genesis"
              value={`${GENESIS_HASH.slice(0, 16)}…${GENESIS_HASH.slice(-8)}`}
              mono
            />
          </CardContent>
        </Card>
      </div>

      {/* Active engine card */}
      <Card className="glass relative overflow-hidden">
        <div className="absolute inset-0 mesh-bg opacity-30 pointer-events-none" />
        <CardHeader className="relative">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="size-4 text-primary" />
            Engine load
          </CardTitle>
          <CardDescription>
            Current mining activity in this browser tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Hashrate vs. 1 MH/s reference</span>
              <span className="hash-mono">
                {((hashrate / 1_000_000) * 100).toFixed(2)}%
              </span>
            </div>
            <Progress
              value={Math.min(100, (hashrate / 1_000_000) * 100)}
              className="h-2.5"
            />
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-md border border-border/40 bg-background/40 p-3">
              <div className="text-muted-foreground flex items-center gap-1.5">
                <Hash className="size-3" /> Status
              </div>
              <div className="font-semibold mt-1 capitalize">{minerStatus}</div>
            </div>
            <div className="rounded-md border border-border/40 bg-background/40 p-3">
              <div className="text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="size-3" /> Backend
              </div>
              <div className="font-semibold mt-1">{minerBackend}</div>
            </div>
            <div className="rounded-md border border-border/40 bg-background/40 p-3">
              <div className="text-muted-foreground flex items-center gap-1.5">
                <Zap className="size-3" /> H/s
              </div>
              <div className="font-semibold mt-1 hash-mono">
                {hashrate.toFixed(1)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className={accent ? "glass glow-emerald" : "glass"}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="inline-flex items-center gap-1.5">
              {icon}
              {label}
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight hash-mono">
            {value}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PipelineStep({
  n,
  title,
  detail,
}: {
  n: number;
  title: string;
  detail: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="size-7 rounded-full bg-primary/15 border border-primary/30 grid place-items-center text-xs font-bold text-primary shrink-0">
        {n}
      </div>
      <div className="flex-1 pt-0.5">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}

function KV({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "hash-mono" : ""}>{value}</span>
    </div>
  );
}

function formatHr(hps: number): string {
  if (hps >= 1e9) return `${(hps / 1e9).toFixed(2)} GH/s`;
  if (hps >= 1e6) return `${(hps / 1e6).toFixed(2)} MH/s`;
  if (hps >= 1e3) return `${(hps / 1e3).toFixed(2)} kH/s`;
  return `${hps.toFixed(1)} H/s`;
}
