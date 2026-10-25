'use client';

import * as React from 'react';
import Link from 'next/link';
import { Cpu, Github, Moon, Sun, Activity, Wallet as WalletIcon, ChevronRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HeaderProps {
  activeTab: 'dashboard' | 'miner' | 'wallet' | 'settings';
  onTabChange: (t: HeaderProps['activeTab']) => void;
  minerStatus: 'idle' | 'starting' | 'running' | 'stopping' | 'error';
}

export function Header({ activeTab, onTabChange, minerStatus }: HeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const navItems: { id: HeaderProps['activeTab']; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Activity className="size-4" /> },
    { id: 'miner', label: 'Miner', icon: <Cpu className="size-4" /> },
    { id: 'wallet', label: 'Wallet', icon: <WalletIcon className="size-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 backdrop-blur-xl bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative size-9 rounded-xl bg-gradient-to-br from-primary/90 to-primary/60 grid place-items-center shadow-lg shadow-primary/30 transition-transform group-hover:scale-105">
              <span className="text-primary-foreground font-bold text-sm">R</span>
              <span className="absolute -bottom-1 -right-1 size-3 rounded-full bg-accent border-2 border-background" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-base tracking-tight">RigorMobile</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                RigorChain · SHA3-256
              </span>
            </div>
          </Link>

          {/* Nav (desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onTabChange(item.id)}
                className="gap-2"
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {minerStatus === 'running' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="gap-1.5 pr-3">
                      <span className="size-2 rounded-full bg-primary animate-rigor-pulse" />
                      Mining
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>The miner is currently hashing</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {minerStatus === 'error' && (
              <Badge variant="destructive" className="gap-1.5">
                <span className="size-2 rounded-full bg-destructive-foreground" />
                Miner error
              </Badge>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {mounted && resolvedTheme === 'dark' ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              asChild
            >
              <a
                href="https://github.com/SecretArrow/rigormobile"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub repo"
              >
                <Github className="size-4" />
              </a>
            </Button>

            {/* Mobile nav trigger */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden gap-1"
              onClick={() => {
                const idx = navItems.findIndex((n) => n.id === activeTab);
                const next = navItems[(idx + 1) % navItems.length]!;
                onTabChange(next.id);
              }}
            >
              {navItems.find((n) => n.id === activeTab)?.label}
              <ChevronRight className="size-3" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
