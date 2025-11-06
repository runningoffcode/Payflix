import { useState } from 'react';
import { motion } from 'framer-motion';
import ShaderBackground from '@/components/ShaderBackground';

const SOCIAL_LINKS = [
  {
    name: 'X',
    href: 'https://x.com/payflixdotfun',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 1200 1227" fill="currentColor" aria-hidden="true">
        <path d="M714.163 519.284L1160.89 0h-105.17l-386.69 448.146L409.306 0H0l468.492 684.516L0 1227h105.17l407.509-472.488L790.694 1227H1200L714.163 519.284zM579.161 706.833L518.873 621.8 143.202 80h219.742l304.312 434.236 60.288 85.032L1056.8 1147H837.059L579.161 706.833z" />
      </svg>
    ),
  },
  {
    name: 'Telegram',
    href: 'https://t.me/payflixdotfun',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M22.25 1.95 1.55 10.53c-1.19.49-1.18 1.18-.22 1.51l5.43 1.74 2.11 6.69c.24.69.4.97 1.03.97.54 0 .78-.25 1.08-.55l2.6-2.53 5.42 4c.99.54 1.7.26 1.95-.92l3.54-16.63c.35-1.69-.64-2.46-1.56-2.02Z" />
      </svg>
    ),
  },
];

const PLACEHOLDER_CA = '9X7Lk1d4NqCpjQV98zXWitDdJsa1LkM7dHPYVL7eXy3a';

function SocialButton({ name, href, icon, className = '' }: (typeof SOCIAL_LINKS)[number] & { className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`group flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.25em] text-white/80 transition hover:border-flix-cyan/70 hover:bg-flix-cyan/10 ${className}`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white transition group-hover:bg-flix-cyan/20">
        {icon}
      </span>
      <span className="hidden md:inline text-white group-hover:text-white">{name}</span>
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
      className="group flex max-w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-left transition hover:border-flix-cyan/70 hover:bg-flix-cyan/10"
    >
      <div className="flex flex-col gap-1 overflow-hidden">
        <span className="text-[10px] uppercase tracking-[0.5em] text-white/50">Token CA</span>
        <span className="font-mono text-sm tracking-[0.25em] text-white/90">
          {PLACEHOLDER_CA}
        </span>
      </div>
      <div className="ml-auto flex flex-col items-center gap-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition group-hover:border-flix-cyan/70 group-hover:bg-flix-cyan/20">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </div>
        <span className="text-[11px] font-semibold text-flix-cyan transition group-hover:text-white">
          {copied ? 'Copied!' : 'Copy'}
        </span>
      </div>
    </button>
  );
}

export default function Landing() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-white">
      <ShaderBackground />
      <div className="absolute inset-0 bg-gradient-to-br from-[#120c2c]/40 via-[#1a0f42]/30 to-[#0d564e]/35" />

      <header className="relative z-20 w-full px-6 py-6 sm:px-10">
        <div className="hidden items-center justify-between gap-6 md:flex">
          <img
            src="/payflix-official-logo.svg"
            alt="PayFlix stacked logo"
            className="h-14 w-auto"
          />
          <div className="flex items-center gap-3">
            {SOCIAL_LINKS.map((link) => (
              <SocialButton key={link.name} {...link} />
            ))}
            <div className="ml-4">
              <ContractAddress />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 items-center gap-3 md:hidden">
          <div className="flex justify-start">
            <img
              src="/payflix-text-logo.svg"
              alt="PayFlix stacked logo"
              className="h-10 w-auto"
            />
          </div>
          <div className="flex justify-center">
            <SocialButton
              name="X"
              href={SOCIAL_LINKS[0].href}
              icon={SOCIAL_LINKS[0].icon}
              className="px-2"
            />
          </div>
          <div className="flex justify-end">
            <SocialButton
              name="Telegram"
              href={SOCIAL_LINKS[1].href}
              icon={SOCIAL_LINKS[1].icon}
              className="px-2"
            />
          </div>
        </div>

        <div className="mt-4 md:hidden">
          <ContractAddress />
        </div>
      </header>

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <motion.div
          className="flex h-72 w-72 items-center justify-center md:h-96 md:w-96"
          animate={{ rotateY: [0, 360], rotateX: [0, 360] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          style={{ transformStyle: 'preserve-3d', perspective: 1000, filter: 'drop-shadow(0 0 25px rgba(197,107,206,0.45))' }}
        >
          <svg width="100%" height="100%" viewBox="0 0 533 530" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M520.858 245.866C536.403 253.587 536.403 275.762 520.858 283.482L30.4678 527.04C11.1866 536.616 -8.30137 514.434 3.678 496.547L151.138 276.36C155.874 269.289 155.874 260.06 151.138 252.989L3.67798 32.802C-8.30139 14.9145 11.1865 -7.26763 30.4677 2.30859L520.858 245.866Z" fill="#C56BCE" />
          </svg>
        </motion.div>

        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          className="mt-8 text-base font-medium uppercase tracking-[0.6em] text-white/70"
        >
          Loading the flix…..
        </motion.p>

        <div className="mt-14 flex flex-col items-center gap-2 text-xs text-white/50">
          <span>Built for creators. Loved by superfans.</span>
          <span>Solana Pay • USDC Streaming • Instant Access</span>
        </div>
      </main>

      <footer className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex items-center justify-center">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-[11px] uppercase tracking-[0.4em] text-white/70 backdrop-blur-md">
          <span>Scroll-free</span>
          <span className="h-1 w-1 rounded-full bg-white/40" />
          <span>Ad-free</span>
          <span className="h-1 w-1 rounded-full bg-white/40" />
          <span>Creator-first</span>
        </div>
      </footer>
    </div>
  );
}
