"use client";

import { Zap, ShieldCheck, GitBranch, Cpu } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/40 bg-background/40 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="size-6 rounded-md bg-gradient-to-br from-primary/80 to-primary/40 grid place-items-center text-primary-foreground font-bold text-[10px]">
              R
            </div>
            <span>
              <strong className="text-foreground">RigorMobile</strong> v0.1.0 ·
              MIT License
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Zap className="size-3.5 text-primary" />
              WebGPU + Worker pool
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-primary" />
              BIP32 / BIP44 HD wallet
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Cpu className="size-3.5 text-primary" />
              SHA3-256 · RGRPOW01
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GitBranch className="size-3.5 text-primary" />
              <a
                href="https://github.com/SecretArrow/rigormobile"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                SecretArrow/rigormobile
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
