import { motion } from 'framer-motion';
import ShaderBackground from '@/components/ShaderBackground';

const heroStats = [
  { metric: '97.65%', label: 'Creator share per unlock' },
  { metric: '16 hr', label: 'Average build + release cadence' },
  { metric: 'X402', label: 'Session keys + facilitator ready' },
];

const valueProps = [
  {
    title: 'Agentic streaming commerce',
    copy:
      'PayFlix is MCP-native from day zero—LLMs hit JSON-RPC commands to list videos, unlock content, and stream real-time telemetry back to partners.',
  },
  {
    title: 'Deterministic data + Dreams feeds',
    copy:
      'Canonical DAG hashing keeps partner research, Grok prompts, and suggested offer engines aligned across every session.',
  },
  {
    title: 'X402 session keys + instant payouts',
    copy:
      'Viewers deposit USDC once, unlock continuously, and creators receive 97.65% within seconds through facilitator-managed sessions.',
  },
];

const flowSteps = [
  {
    name: 'Viewer Experience',
    details: [
      'Session modal issues encrypted keys + USDC deposits',
      'Digital IDs prove creator authenticity in the UI',
      'Hybrid uploads stream instantly via Supabase + Arweave',
    ],
  },
  {
    name: 'Creator Mission Console',
    details: [
      'Live analytics, cohort revenue, and retention prompts',
      'LLM-assisted title + pricing guidance (Dreams telemetry)',
      'One-click distribution to MCP agents and partner APIs',
    ],
  },
  {
    name: 'Partner & MCP Rail',
    details: [
      '`payflix.unlockVideo`, `payflix.getCreatorStats`, `payflix.getSessionBalance`',
      'Deterministic DAG feeds for Grok, Birdeye, DexScreener data',
      'Corbits helper wraps facilitator fetch for X402 compliance',
    ],
  },
];

const differentiators = [
  'Full stack: React mission console, Express MCP server, Supabase + Postgres, Redis, Traefik, Docker.',
  'Agent surface: JSON schema + partner pack ready for NoOnes, Paxful, X402 facilitators, or any MCP marketplace.',
  'Build velocity: documented 16-hour sprints for PayFlix, SeekerXAI, Suggested Offer API prototypes.',
  'Security: deterministic hashing, RLS policies, encrypted session storage, and infra playbooks (available under NDA).',
];

export default function PayFlix() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-white">
      <ShaderBackground />
      <div className="absolute inset-0 bg-gradient-to-br from-[#120c2c]/40 via-[#1a0f42]/30 to-[#0d564e]/35" />

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 lg:gap-16 lg:px-10">
        {/* Hero */}
        <section className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/80"
          >
            MCP • Dreams • X402 • PayFlix
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl"
          >
            Why PayFlix exists
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mt-4 max-w-3xl text-base text-white/70 sm:text-lg"
          >
            A mission console for agentic streaming commerce: deterministic data feeds, session-key payments, and MCP surfaces packaged as a single deployment.
          </motion.p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="https://staging.payflix.fun"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl bg-flix-cyan px-6 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-black transition hover:bg-white"
            >
              Watch demo
            </a>
            <a
              href="https://github.com/runningoffcode/Payflix"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-white/80 hover:border-flix-cyan"
            >
              Docs overview
            </a>
          </div>
          <div className="mt-10 grid gap-4 text-left sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5">
                <div className="text-3xl font-semibold text-white">{stat.metric}</div>
                <div className="text-sm uppercase tracking-[0.35em] text-white/60">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Who & Why */}
        <section className="grid gap-6 rounded-3xl border border-white/10 bg-black/40 p-8 shadow-xl shadow-black/30 lg:grid-cols-3">
          {valueProps.map((prop) => (
            <div key={prop.title} className="rounded-2xl bg-white/5 p-6">
              <h3 className="text-xl font-semibold text-white">{prop.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/70">{prop.copy}</p>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-8">
          <h2 className="text-2xl font-semibold text-white">How PayFlix Works</h2>
          <p className="mt-2 text-white/70">
            Three synchronized systems—viewer experience, creator mission console, and MCP/Dreams rail—keep every unlock deterministic.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {flowSteps.map((step) => (
              <div key={step.name} className="rounded-2xl border border-white/10 bg-black/40 p-6">
                <h3 className="text-lg font-semibold text-white">{step.name}</h3>
                <ul className="mt-4 space-y-2 text-sm text-white/70">
                  {step.details.map((detail) => (
                    <li key={detail} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-flix-cyan" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Differentiators */}
        <section className="rounded-3xl border border-white/10 bg-black/60 p-8">
          <h2 className="text-2xl font-semibold text-white">What partners receive</h2>
          <ul className="mt-6 space-y-4 text-sm text-white/70">
            {differentiators.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-flix-cyan" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="https://staging.payflix.fun"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-white/25 px-5 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-white/80 hover:border-flix-cyan"
            >
              Live mission console
            </a>
            <a
              href="https://github.com/runningoffcode/Payflix/blob/main/docs/mcp-partner-pack.md"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-white/25 px-5 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-white/80 hover:border-flix-cyan"
            >
              MCP partner pack
            </a>
            <a
              href="https://github.com/runningoffcode/Payflix/blob/main/docs/overview/platform.md"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-white/25 px-5 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-white/80 hover:border-flix-cyan"
            >
              Platform overview
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
