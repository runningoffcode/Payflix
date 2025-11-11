# Root Cleanup Plan

## Overview
Goal: make repository root minimal—only keep build/config essentials plus the primary README. Everything else moves into structured folders or is deleted if redundant. Confidence bar: 99.99%.

## Current Root Files (excluding configs)
| File | Observations | Proposed Action |
| --- | --- | --- |
| API_REFERENCE.md | API doc duplicated in `docs/overview/platform.md` + `docs/script-reference.txt` references already exist. | Move into `docs/overview/` (or delete once appended as Appendix G). |
| ARCHITECTURE.md | Architecture narrative; overlaps with `docs/overview/platform.md` + `docs/infra/*`. | Evaluate content; append to overview as Appendix H or delete if already covered. |
| ARCHIVE_FEATURE.md | Feature-specific writeup; check if still relevant. | If obsolete, delete; else move to `docs/features/`. |
| CREATE_TABLES.sql | Base schema; still useful. | Keep but move under `supabase/sql/` (active section). |
| DISABLE_RLS.sql | Legacy quick toggle replaced by `COMPLETE_RLS_FIX`. | Already superseded; delete. |
| INTEGRATION_GUIDE.md | Frontend integration guide; still useful for partners. | Move to `docs/overview/` (or `docs/infra/ui.md` appendices). |
| QUICKSTART.md | Already appended as Appendix D; root copy removed. | — |
| README.md | Primary entrypoint. | Keep, update to link to docs. |
| UPDATES.md | Historical change log (many env toggles). | Decide: keep in `docs/history/UPDATES.md` or remove if redundant. |
| USDC_PAYMENT_SETUP.md | Payment instructions; overlaps with session/auth docs. | Move under `docs/infra/auth.md` appendices or delete after merging. |
| X402_CORBITS_IMPLEMENTATION.md | Hackathon-specific doc. | Move to `docs/briefings/` or `docs/infra/auth.md` references. |

## Future Steps
1. Append remaining root docs (API_REFERENCE, ARCHITECTURE, etc.) to `docs/overview/platform.md` as new appendices, then delete originals.
2. Move `CREATE_TABLES.sql` into `supabase/sql/` (active folder) so root only has config.
3. Delete `DISABLE_RLS.sql` (legacy quick toggle) after confirming no references.
4. Review `UPDATES.md`—if we still need history, move to `docs/history/UPDATES.md`; otherwise delete after summarizing key info elsewhere.
5. Relocate `USDC_PAYMENT_SETUP.md` & `X402_CORBITS_IMPLEMENTATION.md` into `docs/infra/auth.md` or `docs/briefings/` (depending on audience).
6. After each relocation/deletion, run `npm run build` and update `docs/repo-cleanup-log.md`.
