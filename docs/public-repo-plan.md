# PayFlix Public Repo Plan

## Safe vs. Private Inventory

| Path / File | Status | Notes |
| --- | --- | --- |
| `src/` | ✅ Safe | Frontend-only React/Vite components; remove imports that reach into `server/` or private services before publishing. |
| `public/` | ✅ Safe | Static assets (logos, icons, manifest). Exclude any brand assets you want private (e.g., raw design files). |
| `docs/overview.md` | ✅ Safe | High-level architecture. |
| `docs/mcp-quickstart.md` | ✅ Safe | Partner onboarding guide. |
| `docs/mcp-tooling.md` | ✅ Safe | MCP command schemas (no secrets). |
| `docs/mcp-agent-examples.md` | ✅ Safe | Example code; remove internal endpoints if referenced. |
| `docs/integration-faq.md` | ✅ Safe | Non-technical FAQ. |
| `docs/mcp-partner-pack.md` | ✅ Safe | Public version only (strip contact info if needed). |
| `README.public.md` (new) | ✅ Safe | Public-facing cover page (see draft). |
| `package*.json`, `tsconfig*.json`, `vite.config.ts` | ✅ Safe | Build metadata (already frontend-centric). |
| `.gitignore` (public template) | ✅ Safe | Ignore env/build artifacts. |
| `server/` | ❌ Private | Backend routes, payment orchestrator. |
| `database/`, `supabase/`, `uploads/`, `scripts/`, `*.sql` | ❌ Private | Infrastructure and migration files. |
| `.env*`, `.env.example` | ❌ Private | Environment values—even sample keys should stay private. |
| Branding/Design assets not already public | ❌ Private | Keep raw design/source files internal. |

## Docs to Publish

* `docs/overview.md`
* `docs/mcp-quickstart.md`
* `docs/mcp-tooling.md`
* `docs/mcp-agent-examples.md`
* `docs/integration-faq.md`
* `docs/mcp-partner-pack.md` (sanitized)
* `docs/README.md` (new index pointing to the public set)

Docs to keep private (or heavily redacted): `testing-playbook.md`, `facilitator-proxy.md`, `facilitator-integration.md`, `monitoring-guide.md`.

## Public README Outline

1. Hero + one-liner (PayFlix mission).
2. Highlights (Digital ID, X‑402, MCP, creator telemetry).
3. Table of Contents.
4. Why PayFlix / Market context.
5. Features overview.
6. MCP access instructions (link to key request + docs).
7. Docs & Guides section (link to docs index).
8. Contributing / Contact.
9. Security & Secrets statement.
10. License.

Full draft is in `docs/public-readme-draft.md`.

## .gitignore (Public)

```
# Env files
.env
.env.*

# Build artifacts
/dist
/build
/coverage

# Dependencies
/node_modules

# Logs
*.log

# OS / editor junk
.DS_Store
Thumbs.db
*.swp
```

## Mirror Script Outline

1. `TMP_DIR=$(mktemp -d)`
2. Copy safe paths:
   ```bash
   rsync -a src public docs README.public.md "$TMP_DIR"/
   cp package*.json tsconfig*.json vite.config.ts "$TMP_DIR"/
   ```
3. Remove/rename as needed (e.g., `mv README.public.md README.md`).
4. Initialize git or reset existing mirror repo:
   ```bash
   cd "$TMP_DIR"
   git init
   git add .
   git commit -m "Mirror of private commit $(git -C /path/to/private rev-parse HEAD)"
   git remote add origin git@github.com:payflix/payflix-public.git
   git push --force origin main
   ```
5. Clean up: `rm -rf "$TMP_DIR"`.

Automate via a bash script or GitHub Action once the public remote exists.
