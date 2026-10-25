"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Square,
  RefreshCw,
  Cpu,
  Zap,
  TrendingUp,
  Hash,
  Award,
  AlertCircle,
  Settings2,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMiner } from "@/hooks/use-miner";
import { cn } from "@/lib/utils";

interface MinerPanelProps {
  onHashRate?: (hps: number) => void;
}

export function MinerPanel({ onHashRate }: MinerPanelProps) {
  const [rpcUrl, setRpcUrl] = React.useState("");
  const [rpcUser, setRpcUser] = React.useState("");
  const [rpcPass, setRpcPass] = React.useState("");
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const miner = useMiner({
    rpcUrl: rpcUrl || undefined,
    rpcUsername: rpcUser || undefined,
    rpcPassword: rpcPass || undefined,
    refreshIntervalSec: 60,
  });

  React.useEffect(() => {
    onHashRate?.(miner.state.hashesPerSecond);
  }, [miner.state.hashesPerSecond, onHashRate]);

  const running = miner.state.status === "running";
  const starting = miner.state.status === "starting";

  const utilization = Math.min(
    100,
    (miner.state.hashesPerSecond / 1_000_000) * 100, // visual proxy
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left column: big hashrate display + controls */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="glass overflow-hidden relative">
          {/* Mesh background */}
          <div className="absolute inset-0 mesh-bg opacity-40 pointer-events-none" />
          <CardHeader className="relative">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="size-4 text-primary" />
                  Mining Engine
                </CardTitle>
                <CardDescription>
                  SHA3-256 (RGRPOW01) · backend auto-selected at runtime
                </CardDescription>
              </div>
              <Badge
                variant={running ? "default" : "secondary"}
                className={cn("gap-1.5 capitalize", running && "glow-emerald")}
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    running
                      ? "bg-primary-foreground animate-rigor-pulse"
                      : "bg-muted-foreground",
                  )}
                />
                {miner.state.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="relative space-y-6">
            {/* Giant hashrate display */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl sm:text-6xl font-bold tracking-tighter hash-mono tabular-nums">
                  {
                    miner
                      .formatHashRate(miner.state.hashesPerSecond)
                      .split(" ")[0]
                  }
                </span>
                <span className="text-2xl font-semibold text-muted-foreground">
                  {miner
                    .formatHashRate(miner.state.hashesPerSecond)
                    .split(" ")[1] ?? "H/s"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Total hashes:{" "}
                <span className="hash-mono text-foreground/80">
                  {miner.state.hashes.toLocaleString()}
                </span>
                <span className="mx-2">·</span>
                Elapsed:{" "}
                <span className="hash-mono text-foreground/80">
                  {miner.formatDuration(miner.state.elapsedMs)}
                </span>
              </p>
            </div>

            {/* Utilization bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Engine load</span>
                <span className="hash-mono">{utilization.toFixed(1)}%</span>
              </div>
              <Progress value={utilization} className="h-2" />
            </div>

            {/* Backend info */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <Stat
                label="Backend"
                value={miner.state.backend}
                icon={<Zap className="size-3" />}
              />
              <Stat
                label="Parallelism"
                value={`${miner.state.parallelism}×`}
                icon={<TrendingUp className="size-3" />}
              />
              <Stat
                label="Solutions"
                value={miner.state.solutionsFound.toString()}
                icon={<Award className="size-3" />}
              />
            </div>
          </CardContent>

          <CardFooter className="relative gap-2">
            <Button
              size="lg"
              onClick={miner.start}
              disabled={running || starting}
              className="gap-2 glow-emerald"
            >
              <Play className="size-4" />
              {starting ? "Starting…" : running ? "Mining" : "Start mining"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={miner.stop}
              disabled={!running && !starting}
              className="gap-2"
            >
              <Square className="size-4" />
              Stop
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={miner.refreshTemplate}
              className="gap-2 ml-auto"
              aria-label="Refresh block template"
            >
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </CardFooter>
        </Card>

        {/* Live digest + last solution */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Hash className="size-3.5 text-muted-foreground" />
                Last digest
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="hash-mono text-xs text-muted-foreground break-all min-h-[3rem]">
                {miner.state.lastDigest || "—"}
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Last nonce</span>
                <span className="hash-mono">
                  0x
                  {(miner.state.lastNonce >>> 0).toString(16).padStart(8, "0")}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="size-3.5 text-muted-foreground" />
                Last solution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {miner.state.lastSolutionAt ? (
                <div className="space-y-1">
                  <div className="text-2xl font-semibold hash-mono">
                    {miner.state.solutionsFound}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(miner.state.lastSolutionAt).toLocaleTimeString()}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground min-h-[3rem] grid place-items-center">
                  No solutions yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right column: settings + diagnostics */}
      <div className="space-y-4">
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Settings2 className="size-3.5" />
                Node connection
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                {showAdvanced ? "Hide" : "Advanced"}
              </Button>
            </CardTitle>
            <CardDescription>
              Connect to your local RIGOR node (RPC port 8761). Leave empty to
              run in demo mode with a synthetic template.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="rpc-url" className="text-xs">
                RPC URL
              </Label>
              <Input
                id="rpc-url"
                placeholder="http://127.0.0.1:8761"
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                className="hash-mono text-xs"
              />
            </div>
            <AnimatePresence initial={false}>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  <div className="space-y-1">
                    <Label htmlFor="rpc-user" className="text-xs">
                      RPC username
                    </Label>
                    <Input
                      id="rpc-user"
                      placeholder="rigor"
                      value={rpcUser}
                      onChange={(e) => setRpcUser(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rpc-pass" className="text-xs">
                      RPC password
                    </Label>
                    <Input
                      id="rpc-pass"
                      type="password"
                      placeholder="••••••••"
                      value={rpcPass}
                      onChange={(e) => setRpcPass(e.target.value)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2 pt-1">
              <Stat
                label="Block height"
                value={miner.state.blockHeight?.toString() ?? "—"}
                compact
              />
              <Stat
                label="Bits (target)"
                value={miner.state.blockBits ?? "—"}
                compact
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Diagnostics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {miner.state.errorMessage ? (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">RPC error</div>
                  <div className="text-destructive/80">
                    {miner.state.errorMessage}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
                <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-primary" />
                <div>
                  <div className="font-medium">Engine ready</div>
                  <div className="text-muted-foreground">
                    Mining will use the{" "}
                    <strong>{miner.state.backend || detectLabel()}</strong>{" "}
                    backend when started.
                  </div>
                </div>
              </div>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-[10px] text-muted-foreground cursor-help">
                    How is the hash computed?
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <code className="text-xs">
                    digest = SHA3-256("RGRPOW01" || header_80)
                  </code>
                  <div className="text-xs mt-1">
                    Block is valid if digest &lt; target(bits).
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function detectLabel() {
  if (typeof navigator !== "undefined" && "gpu" in navigator) return "webgpu";
  if (typeof Worker !== "undefined") return "worker-pool";
  return "cpu";
}

function Stat({
  label,
  value,
  icon,
  compact,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border border-border/40 bg-background/40 px-2.5 py-1.5",
        compact && "text-xs",
      )}
    >
      <span className="text-muted-foreground inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="hash-mono font-medium">{value}</span>
    </div>
  );
}
