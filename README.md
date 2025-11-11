# PayFlix Monorepo Structure

This repository now mirrors the production layout:

```
Payflix/
├─ app/    # application source (React + Node/Express + docs)
└─ infra/  # Docker Compose, Traefik, Redis, and deployment helpers
```

All development happens inside `app/`. See `app/README.md` for the full product overview, MCP/X402 documentation, and getting-started guide.

For Docker deployments, follow `infra/README.md` (coming from the sanitized infra folder) or run `docker compose` from `infra/` after copying your `.env` from `app/.env.example`.
