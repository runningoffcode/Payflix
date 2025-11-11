# PayFlix Repository Cleanup Strategy

## Goals
1. Reduce clutter so new contributors can navigate core app (Next.js client + Node/Express server + Supabase schema).
2. Preserve critical history (SQL migrations, docs) while archiving or deleting redundant/outdated assets.
3. Keep the repo production-safe: no accidental removal of build/test dependencies.

## Safety Checklist
- Work from a feature branch (`cleanup/initial-pass`).
- Before deleting, confirm file ownership (`git blame`) or last use (search in code).
- For large removals, move to `archive/` folder first, commit, then prune after verification.
- Run `npm run build` + basic tests after each batch.

## Categorization (Current State)
| Category | Items | Action |
| --- | --- | --- |
| **Core app** | `src/`, `server/`, `package.json`, `tsconfig*`, `public/`, `supabase/`, `migrations/` | Keep; ensure lint/tests run. |
| **Docs (active)** | `docs/mcp-*`, `docs/public-repo-plan.md`, `docs/overview.md`, new engagement decks | Keep; consolidate duplicates later. |
| **Docs (redundant/legacy)** | Multiple setup guides (`*_SETUP*.md`, `*_FIX*.md`, SQL quickfix files) | Tag for review; consider merging into a single Supabase/Infra playbook or moving to `docs/archive/`. |
| **SQL fix scripts** | `FIX_*.sql`, `SIMPLE_RLS_FIX.sql`, etc. | Confirm if migrations supersede them; move unused into `archive/sql/` with README justifying retention. |
| **Root markdown clutter** | Numerous `*_COMPLETE.md`, `*_GUIDE.md` duplicates | Consolidate or archive. |
| **Binary / PDFs** | Hackathon decks, NoOnes briefing PDFs | Keep only canonical versions under `docs/briefings/`. Remove older duplicates after backup. |
| **Uploads / data** | `uploads/`, `dist/` | Verify if needed. If generated, gitignore or delete. |
| **Node artifacts** | `node_modules/`, `.next`, `dist/` | Ensure `.gitignore` covers them; remove from repo if checked in (not currently tracked). |

## Next Cleanup Actions
1. **Create branch & backup**
   ```bash
   git checkout -b cleanup/initial-pass
   ```
2. **Directory audit**
   - For each root-level `*_GUIDE.md` or `*_FIX*.sql`, note whether it corresponds to a documented migration.
   - Merge redundant docs directly into the appropriate `docs/infra/` or `docs/overview/` playbook (with appendices), then delete the originals.
3. **Docs consolidation**
   - Merge repeated setup docs into `docs/infra/README.md`.
   - Keep `docs/guide-for-christian.md` & `Christian_Torres_Engagement_Briefing.*` in `docs/briefings/` folder.
4. **SQL hygiene**
   - Ensure `supabase-schema.sql` + `/migrations` are source of truth.
   - For manual fix scripts, annotate whether still needed; if obsolete, delete after confirming history.
5. **Testing checkpoint**
   - Run `npm run build`.
   - Document results in `docs/repo-cleanup-log.md`.
6. **Review & commit**
   ```bash
   git add ...
   git commit -m "chore(cleanup): archive legacy docs"
   ```

## Open Questions
- Are any fix scripts still referenced by deployment runbooks?
- Can we drop old PDF decks or do they serve compliance/demo needs?
- Do we need an `/archive` folder tracked in git or rely on tags/releases?

Document findings as we proceed so future contributors understand why files disappeared.
