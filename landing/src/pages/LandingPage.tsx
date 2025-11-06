import { useState } from 'react';
import ShaderBackground from '@/components/ShaderBackground';

const SOCIAL_LINKS = [
  {
    name: 'X',
    href: 'https://x.com/payflixdotfun',
    icon: (
      <svg
        className="w-4 h-4"
        viewBox="0 0 1200 1227"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M714.163 519.284L1160.89 0h-105.17l-386.69 448.146L409.306 0H0l468.492 684.516L0 1227h105.17l407.509-472.488L790.694 1227H1200L714.163 519.284zM579.161 706.833L518.873 621.8 143.202 80h219.742l304.312 434.236 60.288 85.032L1056.8 1147H837.059L579.161 706.833z" />
      </svg>
    ),
  },
  {
    name: 'Telegram',
    href: 'https://t.me/payflixdotfun',
    icon: (
      <svg
        className="w-4 h-4"
        viewBox="0 0 240 240"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M120 0C53.726 0 0 53.726 0 120s53.726 120 120 120 120-53.726 120-120S186.274 0 120 0Zm58.842 82.24c-1.448 36.416-15.404 98.404-54.8 98.404-22.11 0-38.324-16.01-46.488-32.052-10.716-21.036-19.183-50.976-23.628-73.536-2.68-13.832 6.272-19.648 21.548-12.284 12.984 6.264 27.56 14.244 39.264 22.076 5.712 3.86 9.312 3.044 13.906-2.8 7.688-9.964 16.66-21.032 25.496-30.944 10.328-11.592 20.628-8.024 18.448 6.32-3.332 21.248-13.776 36.368-24.048 53.38-3.388 5.664-2.272 8.852 3.628 12.24 10.204 5.736 20.408 11.568 30.448 17.404 11.176 6.384 13.808 15.544 6.196 24.5-12.628 14.792-33.976 29.284-58.148 29.284-34.504 0-66.296-26.096-82.66-51.8-17.996-28.172-30.04-64.756-34.424-98.84-1.628-12.688 7.044-21.252 19.724-17.536 35.648 10.372 74.428 49.612 102.252 77.248 7.212 7.102 13.36 8.028 21.548 1.804 17.628-13.248 37.564-31.984 51.524-48.02 8.274-9.544 17.944-4.84 17.372 7.752Z" />
      </svg>
    ),
  },
];

const PLACEHOLDER_CA = '9X7Lk1d4NqCpjQV98zXWitDdJsa1LkM7dHPYVL7eXy3a';

function SocialButton({ name, href, icon }: (typeof SOCIAL_LINKS)[number]) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:border-flix-cyan/60 hover:bg-white/10"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition group-hover:bg-flix-cyan/20">
        {icon}
      </span>
      <span className="pr-1 uppercase tracking-wide text-xs">{name}</span>
    </a>
  );
}

function ContractAddress() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(PLACEHOLDER_CA);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy contract address', error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-flix-cyan/60 hover:bg-white/10"
    >
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest text-white/70">Token CA</span>
        <span className="font-mono text-[13px] tracking-[0.2em] text-white/90">
          {PLACEHOLDER_CA}
        </span>
      </div>
      <div className="ml-4 flex flex-col items-end gap-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition group-hover:border-flix-cyan/60 group-hover:bg-flix-cyan/10">
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </div>
        <span className="text-[11px] font-medium text-flix-cyan transition group-hover:text-white">
          {copied ? 'Copied!' : 'Copy'}
        </span>
      </div>
    </button>
  );
}

function InfoPanel() {
  return (
    <section className="absolute left-6 top-6 flex w-[320px] flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-900/70 p-5 text-white shadow-xl shadow-flix-purple/10 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">Stay in the loop</p>
          <h2 className="mt-1 text-lg font-semibold">PayFlix</h2>
        </div>
        <div className="h-10 w-px bg-white/10" />
        <div className="flex flex-col items-end">
          <span className="text-xs text-white/60">Solana Pay-Per-View</span>
          <span className="text-xs text-flix-cyan">No ads. No passwords.</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {SOCIAL_LINKS.map((social) => (
          <SocialButton key={social.name} {...social} />
        ))}
      </div>

      <ContractAddress />
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-white">
      <ShaderBackground />
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-flix-purple/20" />

      <InfoPanel />

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-full border border-white/10 bg-white/5 px-6 py-2 text-xs uppercase tracking-[0.6em] text-white/70 backdrop-blur">
            Premium Access
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-2xl sm:text-6xl">
            Loading the flix&hellip;&hellip;
          </h1>
          <p className="max-w-xl text-base text-white/70 sm:text-lg">
            Wallet-connected streaming. Pay-per-view on Solana with instant creator payouts. No
            popups, no friction—just nonstop premieres.
          </p>
        </div>
      </main>
    </div>
  );
}
