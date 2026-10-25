'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Wallet as WalletIcon,
  Plus,
  Lock,
  Unlock,
  Download,
  Upload,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  ShieldCheck,
  Trash2,
  KeyRound,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useWallet } from '@/hooks/use-wallet';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function WalletPanel() {
  const wallet = useWallet();
  const { state } = wallet;

  if (state.status === 'unlocked' && state.wallet) {
    return <UnlockedView />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Hero */}
      <Card className="glass overflow-hidden relative">
        <div className="absolute inset-0 mesh-bg opacity-40 pointer-events-none" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <WalletIcon className="size-5 text-primary" />
            RigorChain HD Wallet
          </CardTitle>
          <CardDescription>
            BIP32 / BIP44 with custom coin type 8760 (RIGOR). Bech32 HRP{' '}
            <code className="text-foreground">rg</code>. Private keys never
            leave this device.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="rounded-lg border border-border/60 bg-background/40 p-4 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <ShieldCheck className="size-4 text-primary" />
              Your keys, your coins
            </div>
            <p>
              The wallet is sealed with AES-256-GCM under a key derived from
              your password via scrypt (N=2^15, r=8, p=1). The encrypted blob
              lives in this browser only — there is no server.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FeatureChip label="BIP39" sub="24-word mnemonic" />
            <FeatureChip label="BIP32" sub="HD derivation" />
            <FeatureChip label="Bech32" sub="SegWit v0/v1" />
          </div>
        </CardContent>
      </Card>

      {/* Action area */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Get started</CardTitle>
          <CardDescription>
            Create a new wallet or import an existing one from a mnemonic.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={state.status === 'locked' ? 'unlock' : 'create'}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="create">New</TabsTrigger>
              <TabsTrigger value="import">Import</TabsTrigger>
              <TabsTrigger value="unlock" disabled={state.status !== 'locked'}>
                Unlock
              </TabsTrigger>
            </TabsList>

            {/* Create */}
            <TabsContent value="create" className="space-y-3 pt-3">
              <CreateForm
                onCreate={async (pwd) => {
                  const mnemonic = await wallet.createNew(pwd);
                  toast.success('Wallet created', {
                    description: 'Save your 24-word mnemonic somewhere safe.',
                  });
                  return mnemonic;
                }}
              />
            </TabsContent>

            {/* Import */}
            <TabsContent value="import" className="space-y-3 pt-3">
              <ImportForm
                onImport={async (mnemonic, pwd) => {
                  await wallet.importMnemonic(mnemonic, pwd);
                  toast.success('Wallet imported');
                }}
              />
            </TabsContent>

            {/* Unlock */}
            <TabsContent value="unlock" className="space-y-3 pt-3">
              <UnlockForm
                onUnlock={async (pwd) => {
                  try {
                    await wallet.unlock(pwd);
                    toast.success('Wallet unlocked');
                  } catch {
                    toast.error('Wrong password');
                  }
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function UnlockedView() {
  const wallet = useWallet();
  const { state } = wallet;
  const [showMnemonic, setShowMnemonic] = React.useState(false);
  const [copiedIdx, setCopiedIdx] = React.useState<number | null>(null);

  const copy = (text: string, idx?: number) => {
    navigator.clipboard.writeText(text);
    if (typeof idx === 'number') {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    }
    toast.success('Copied to clipboard');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Address book */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="glass">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Your addresses</CardTitle>
                <CardDescription>
                  First 10 derived addresses (BIP44{' '}
                  <code className="text-foreground/80">
                    m/44&apos;/8760&apos;/0&apos;/0/&lt;n&gt;
                  </code>
                  )
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => wallet.deriveMore(5)}>
                <Plus className="size-3.5" /> Derive more
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto scroll-thin">
            {state.addresses.map((a, i) => (
              <motion.div
                key={a.address}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="flex items-center gap-3 rounded-md border border-border/40 bg-background/40 px-3 py-2 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <Badge variant="outline" className="hash-mono">
                  {i.toString().padStart(2, '0')}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="hash-mono text-sm truncate">{a.address}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {a.path}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copy(a.address, i)}
                  aria-label="Copy address"
                >
                  {copiedIdx === i ? (
                    <Check className="size-3.5 text-primary" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* Mnemonic reveal */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="size-4 text-primary" />
                Recovery phrase
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMnemonic((v) => !v)}
                className="gap-1"
              >
                {showMnemonic ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                {showMnemonic ? 'Hide' : 'Reveal'}
              </Button>
            </div>
            <CardDescription>
              24-word BIP39 mnemonic. Never share it — anyone with these words
              owns your funds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showMnemonic && state.mnemonic ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {state.mnemonic.split(' ').map((word, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-border/40 bg-background/60 px-2 py-1.5 text-xs hash-mono"
                  >
                    <span className="text-muted-foreground mr-1.5">
                      {(i + 1).toString().padStart(2, '0')}
                    </span>
                    {word}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border/60 bg-background/40 p-6 text-center text-sm text-muted-foreground">
                Hidden — click Reveal to display.
              </div>
            )}
            <Separator className="my-3" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">xpub (safe to share)</span>
              <code className="hash-mono text-[10px] max-w-[60%] truncate" title={state.wallet?.exportXpub()}>
                {state.wallet?.exportXpub().slice(0, 32)}…
              </code>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right column: actions */}
      <div className="space-y-4">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Wallet actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => wallet.lock()}
            >
              <Lock className="size-4" /> Lock wallet
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Trash2 className="size-4" /> Wipe wallet
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-destructive" />
                    Wipe wallet from this browser?
                  </DialogTitle>
                  <DialogDescription>
                    This removes the encrypted wallet blob from localStorage.
                    Make sure you have your 24-word mnemonic saved elsewhere —
                    there is no recovery without it.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="ghost">Cancel</Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      wallet.wipe();
                      toast.success('Wallet wiped from this device');
                    }}
                  >
                    Wipe
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Network info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Info label="Chain" value="RIGOR mainnet" />
            <Info label="Bech32 HRP" value="rg" />
            <Info label="Coin type" value="8760 (BIP44)" />
            <Info label="Magic" value="ce f1 db fa" />
            <Info label="RPC port" value="8761" />
            <Info label="P2P port" value="8760" />
            <Info label="Block subsidy" value="128 ORU / block" />
            <Info label="PoW" value="SHA3-256 (RGRPOW01)" />
          </CardContent>
          <CardFooter className="text-[10px] text-muted-foreground">
            <ShieldCheck className="size-3 mr-1.5 text-primary" />
            Encrypted at rest with AES-256-GCM + scrypt.
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function CreateForm({ onCreate }: { onCreate: (pwd: string) => Promise<string> }) {
  const [pwd, setPwd] = React.useState('');
  const [pwd2, setPwd2] = React.useState('');
  const [mnemonic, setMnemonic] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    if (pwd.length < 8) {
      toast.error('Password too short', { description: 'Use at least 8 characters.' });
      return;
    }
    if (pwd !== pwd2) {
      toast.error('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      const mn = await onCreate(pwd);
      setMnemonic(mn);
    } finally {
      setBusy(false);
    }
  };

  if (mnemonic) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
          <strong className="text-primary">Save your 24-word mnemonic:</strong>
          <div className="mt-2 grid grid-cols-3 gap-1.5 hash-mono text-[11px]">
            {mnemonic.split(' ').map((w, i) => (
              <div key={i} className="bg-background/60 rounded px-1.5 py-1">
                <span className="text-muted-foreground mr-1">
                  {(i + 1).toString().padStart(2, '0')}
                </span>
                {w}
              </div>
            ))}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            navigator.clipboard.writeText(mnemonic);
            toast.success('Mnemonic copied — store it safely!');
          }}
        >
          <Download className="size-3.5" /> Copy mnemonic
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="new-pwd" className="text-xs">New password (min 8 chars)</Label>
        <Input
          id="new-pwd"
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          autoFocus
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="new-pwd2" className="text-xs">Confirm password</Label>
        <Input
          id="new-pwd2"
          type="password"
          value={pwd2}
          onChange={(e) => setPwd2(e.target.value)}
        />
      </div>
      <Button className="w-full" onClick={submit} disabled={busy}>
        {busy ? 'Creating…' : 'Create wallet'}
      </Button>
    </div>
  );
}

function ImportForm({ onImport }: { onImport: (mnemonic: string, pwd: string) => Promise<void> }) {
  const [mnemonic, setMnemonic] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="imp-mn" className="text-xs">BIP39 mnemonic (12 or 24 words)</Label>
        <textarea
          id="imp-mn"
          className="w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-xs hash-mono"
          value={mnemonic}
          onChange={(e) => setMnemonic(e.target.value)}
          placeholder="abandon abandon abandon … about"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="imp-pwd" className="text-xs">New encryption password</Label>
        <Input
          id="imp-pwd"
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
        />
      </div>
      <Button
        className="w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onImport(mnemonic.trim(), pwd);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Upload className="size-3.5" /> {busy ? 'Importing…' : 'Import wallet'}
      </Button>
    </div>
  );
}

function UnlockForm({ onUnlock }: { onUnlock: (pwd: string) => Promise<void> }) {
  const [pwd, setPwd] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="unl-pwd" className="text-xs">Password</Label>
        <Input
          id="unl-pwd"
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setBusy(true);
              onUnlock(pwd).finally(() => setBusy(false));
            }
          }}
          autoFocus
        />
      </div>
      <Button
        className="w-full gap-2"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          onUnlock(pwd).finally(() => setBusy(false));
        }}
      >
        <Unlock className="size-4" /> {busy ? 'Unlocking…' : 'Unlock'}
      </Button>
    </div>
  );
}

function FeatureChip({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="rounded-md border border-border/40 bg-background/40 px-2 py-2 text-center">
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="hash-mono">{value}</span>
    </div>
  );
}
