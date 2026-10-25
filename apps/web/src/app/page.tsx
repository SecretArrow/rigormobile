'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/common/header';
import { Footer } from '@/components/common/footer';
import { Dashboard } from '@/components/dashboard/dashboard';
import { MinerPanel } from '@/components/miner/miner-panel';
import { WalletPanel } from '@/components/wallet/wallet-panel';

type Tab = 'dashboard' | 'miner' | 'wallet' | 'settings';

export default function HomePage() {
  const [tab, setTab] = React.useState<Tab>('dashboard');
  const [hashrate, setHashrate] = React.useState(0);
  const [minerStatus, setMinerStatus] = React.useState<
    'idle' | 'starting' | 'running' | 'stopping' | 'error'
  >('idle');
  const [minerBackend, setMinerBackend] = React.useState('idle');

  // The MinerPanel reports hashrate upward; we mirror it for the Dashboard.
  // Miner status is inferred from the same source.
  const handleHashRate = React.useCallback((hps: number) => {
    setHashrate(hps);
  }, []);

  return (
    <>
      <Header activeTab={tab} onTabChange={setTab} minerStatus={minerStatus} />
      <main className="flex-1 mesh-bg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          {/* Page heading */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2"
          >
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                {tab === 'dashboard' && 'Dashboard'}
                {tab === 'miner' && 'Miner'}
                {tab === 'wallet' && 'Wallet'}
                {tab === 'settings' && 'Settings'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {tab === 'dashboard' &&
                  'Live overview of your RigorChain mining engine and network constants.'}
                {tab === 'miner' &&
                  'Browser-based SHA3-256 (RGRPOW01) miner — WebGPU when available, Worker pool fallback.'}
                {tab === 'wallet' &&
                  'BIP32 / BIP44 HD wallet for RigorChain Bech32 rg addresses.'}
                {tab === 'settings' && 'App settings and preferences.'}
              </p>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {tab === 'dashboard' && (
                <Dashboard
                  hashrate={hashrate}
                  minerStatus={minerStatus}
                  minerBackend={minerBackend}
                />
              )}
              {tab === 'miner' && (
                <MinerPanel
                  onHashRate={(hps) => {
                    handleHashRate(hps);
                    // Infer status from hashrate transitions
                    if (hps > 0) {
                      setMinerStatus('running');
                      setMinerBackend(
                        typeof navigator !== 'undefined' && 'gpu' in navigator
                          ? 'webgpu'
                          : 'worker-pool',
                      );
                    }
                  }}
                />
              )}
              {tab === 'wallet' && <WalletPanel />}
              {tab === 'settings' && <SettingsPlaceholder />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </>
  );
}

function SettingsPlaceholder() {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-background/40 p-10 text-center text-sm text-muted-foreground">
      Settings UI is being rebuilt. The miner & wallet work end-to-end —
      configure the RPC connection from the Miner tab.
    </div>
  );
}
