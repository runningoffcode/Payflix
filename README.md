# 🎬 PayFlix – MCP-Native Streaming Commerce

[![Solana](https://img.shields.io/badge/solana-x402-purple)](https://solana.com/developers/guides/getstarted/build-a-x402-facilitator)
[![MCP](https://img.shields.io/badge/model_context_protocol-ready-blue)](docs/mcp-tooling.md)
[![Dreams Agents](https://img.shields.io/badge/dreams-agents-green)](docs/daydreams-agent-contexts.md)
[![Arweave](https://img.shields.io/badge/storage-arweave-orange)](docs/infra/uploads.md)

PayFlix is a Solana-powered video marketplace where **MCP agents**, **Dreams orchestrations**, and **X402 session keys** deliver instant, verified streaming commerce. Viewers unlock premium content with USDC, creators see 97.65 % payouts in seconds, and partners plug in through the Model Context Protocol.

---

## 🧭 TL;DR

- **MCP-first surface** – agents call PayFlix via JSON-RPC commands (`docs/mcp-tooling.md`).
- **X402 session keys** – seamless payments + session modal (Appendix D in `docs/infra/auth.md`).
- **Dreams/DAG pipelines** – deterministic hashing feeds partner telemetry APIs (`docs/overview/platform.md`).
- **Mission-console UI** – translucent overlays, telemetry timelines, and MCP unlock badges (`docs/infra/ui.md`).
- **Partner-ready docs** – everything (start-here, quick start, file inventory, backend readme) lives in `docs/overview/platform.md` Appendices C–I.

Need MCP access? → [docs/mcp-partner-pack.md](docs/mcp-partner-pack.md)

### 🎥 Mission Console Demo

[▶️ Watch the PayFlix mission-console walkthrough](docs/assets/payflix-demo.mp4)

---

## 📑 Table of Contents

1. [Platform Highlights](#-platform-highlights)
2. [Architecture Overview](#-architecture-overview)
3. [Core Flows](#-core-flows)
4. [Quick Start](#-quick-start)
5. [Documentation Hub](#-documentation-hub)
6. [Contributor Guide](#-contributor-guide)
7. [Glossary](#-glossary)
8. [Call to Action](#-call-to-action)

---

## 🌟 Platform Highlights

- **Model Context Protocol** – `payflix.getCreatorStats`, `payflix.unlockVideo`, `payflix.getSessionBalance`, etc. are documented in [docs/mcp-tooling.md](docs/mcp-tooling.md) with sample agents (`docs/mcp-agent-examples.md`).
- **Dreams integrations** – deterministic DAG hashing powers partner agents; see `docs/daydreams-agent-contexts.md` and `docs/overview/platform.md#appendix-i`.
- **X402 session experience** – Appendix D/E in `docs/infra/auth.md` cover the modal, facilitator, and Corbits integration for 97.65 % payouts.
- **PayFlix UI** – mission-console overlays, parallax panes, status timelines, and gradient CTAs described in [`docs/infra/ui.md`](docs/infra/ui.md).
- **Uploads + Arweave** – full storage playbook (Digital ID, Supabase buckets, Arweave wallets) lives in [`docs/infra/uploads.md`](docs/infra/uploads.md).

---

## 🏗️ Architecture Overview

```
React Mission Console ─┐
                       │  MCP JSON-RPC
Daydreams Agents ──────┼────▶ PayFlix MCP Server (Express + MCP tooling)
                       │                    │
                       │                    │ X402 Session Service
                       │                    ▼
                    Supabase (DB/Auth/Storage) ─┬─ Dreams/DAG pipelines
                                                └─ Arweave permanent storage
```

- **Frontend** (`src/`): Next/React mission console, MCP client hooks, Solana wallet adapters.
- **Backend** (`server/`): Express routes, MCP handlers, session-payment service, Dreams-friendly telemetry.
- **Supabase**: schema + RLS in [`docs/infra/supabase.md`](docs/infra/supabase.md); active SQL scripts in `supabase/sql/`.
- **Arweave / Storage**: setup + appendices in [`docs/infra/uploads.md`](docs/infra/uploads.md).
- **MCP**: command catalog + partner packs (`docs/mcp-*`).

---

## 🔄 Core Flows

### X402 Session Keys

1. Wallet connects → session modal (Appendix B/C in `docs/infra/auth.md`).
2. `/api/sessions/*` APIs issue encrypted keys (see `ADD_SESSIONS_TABLE.sql`).
3. Payments route through `sessionPaymentService` to creators (97.65 % share).
4. Corbits helper wraps fetch for Dreams partners (Appendix E in `docs/infra/auth.md`).

### MCP Command Surface

- `payflix.listVideos`, `payflix.unlockVideo`, `payflix.getCreatorStats`, `payflix.getSessionBalance`.
- Schemas + error contracts in [`docs/mcp-tooling.md`](docs/mcp-tooling.md); examples in [`docs/mcp-agent-examples.md`](docs/mcp-agent-examples.md).

### Dreams / DAG Intelligence

- Canonical feeds hashed per step keep agent telemetry deterministic (`docs/overview/platform.md#deterministic-dag`).
- Partner prompt automation drives suggested offers + wallet telemetry (`docs/daydreams-agent-contexts.md`).

### PayFlix UI / Unlock Flow

- Mission console overlays show Digital IDs (“Verified 12s ago”), Daydreams stats, and agent-ready MCP buttons (`docs/infra/ui.md`).

---

## ⚡ Quick Start

1. **Clone & install**
   ```bash
   git clone https://github.com/ChristianAlphaBot/Payflix.git
   cd Payflix
   npm install
   ```
2. **Configure Supabase + env**
   - Follow [`docs/infra/supabase.md`](docs/infra/supabase.md) for schema + RLS (`supabase/sql/CREATE_TABLES.sql`).
   - Copy env template: `cp .env.example .env` then set Solana RPC, Supabase keys, session key.
3. **Run dev stack**
   ```bash
   npm run dev
   ```

   - Backend: `http://localhost:5000`
   - Frontend: `http://localhost:3000`
   - Dive into Appendices C–F in [`docs/overview/platform.md`](docs/overview/platform.md) for the full Start Here & Quick Start narratives.

---

## 📚 Documentation Hub

| Area                                                                                                       | Location                                                                                             |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Platform overview, appendices (Start Here, Quick Start, Files, Backend README, API, Architecture, Archive) | [`docs/overview/platform.md`](docs/overview/platform.md)                                             |
| Infra playbooks – uploads, wallets/profile, Supabase/RLS, UI, Auth/X402                                    | [`docs/infra/`](docs/infra)                                                                          |
| MCP docs, partner packs, agent examples                                                                    | [`docs/mcp-tooling.md`](docs/mcp-tooling.md), [`docs/mcp-partner-pack.md`](docs/mcp-partner-pack.md) |
| Dreams integrations / Daydreams agent briefs                                                               | [`docs/daydreams-agent-contexts.md`](docs/daydreams-agent-contexts.md)                               |
| Briefings & pitch decks                                                                                    | [`docs/briefings/README.md`](docs/briefings/README.md)                                               |

---

## 🤝 Contributor Guide

- **Branches**: feature branches (`feat/*`, `fix/*`, `docs/*`).
- **Formatting**: `npx prettier -w` + `npm run lint` before PRs.
- **Testing**: `npm run build` (runs `tsc` + Vite). Log results in summaries.
- **Docs updates**: whenever behavior changes, append to the relevant appendix or playbook (`docs/overview/platform.md` + `docs/infra/*`).
- **Audit**: keep a private changelog (inside PayFlix-Core) for major deletions/refactors.

---

## 📘 Glossary

- **MCP** – Model Context Protocol; JSON-RPC surface for AI agents (`docs/mcp-tooling.md`).
- **X402** – HTTP 402-based Solana payment flow with session delegation (`docs/infra/auth.md`).
- **Dreams / DAG** – Deterministic hashing + Grok pipelines powering suggested offers (`docs/daydreams-agent-contexts.md`).
- **Digital ID** – Real-time creator verification in PayFlix UI (`docs/infra/wallets.md`).

External references:

- [Solana X402 facilitator guide](https://solana.com/developers/guides/getstarted/build-a-x402-facilitator)
- [Supabase docs](https://supabase.com/docs)
- [Corbits / Dreams specs](docs/daydreams-agent-contexts.md)

---

## 📣 Call to Action

- **MCP / Dreams partner?** → [docs/mcp-partner-pack.md](docs/mcp-partner-pack.md)
- **Need API docs?** → Appendices G–I inside [`docs/overview/platform.md`](docs/overview/platform.md)
- **Want to deploy PayFlix?** → Follow [`docs/infra/supabase.md`](docs/infra/supabase.md) + [`docs/infra/auth.md`](docs/infra/auth.md)

Questions, demos, or access requests → ping the team (Slack/Discord) or open an issue. PayFlix is ready for production MCP agents, Dreams research flows, and Solana X402 streaming commerce. 🚀
