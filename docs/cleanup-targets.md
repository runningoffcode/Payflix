# Cleanup Target Mapping

## SQL Fix Scripts
| File | References Found (`rg -F`) | Notes | Proposed Action |
| --- | --- | --- | --- |
| COMPLETE_RLS_FIX.sql | `RLS_FIX_INSTRUCTIONS.md`, `CREATE_TABLES.sql`, `SUPABASE_SETUP.md` | Still referenced in onboarding docs for full schema reset. Need to confirm migrations make it redundant. | Keep for now; document replacement before archive. |
| FINAL_FIX_RLS.sql | — | Superseded by COMPLETE_RLS_FIX; deleted 2025-11-11. | ✅ Removed |
| FIX_COLUMNS_AND_RLS.sql | — | Redundant with COMPLETE_RLS_FIX; deleted 2025-11-11. | ✅ Removed |
| FIX_CREATOR_WALLETS.sql | — | Superseded by UPDATE_CREATOR_WALLETS_DIRECT; deleted 2025-11-11. | ✅ Removed |
| FIX_RLS_POLICY.sql | — | Targeted patch replaced by current policies; deleted 2025-11-11. | ✅ Removed |
| FIX_SESSIONS_RLS.sql | — | Policies covered by `ADD_SESSIONS_TABLE.sql`; deleted 2025-11-11. | ✅ Removed |
| FIX_STORAGE_BUCKETS.sql | — | Policy guidance lives in docs; deleted 2025-11-11. | ✅ Removed |
| FIX_STORAGE_SIZE_LIMITS.sql | — | Superseded by docs instructions; deleted 2025-11-11. | ✅ Removed |
| FIX_VIDEOS_RLS.sql | `scripts/fix-rls.ts`, `USDC_PAYMENT_SETUP.md` | Script still depends on this SQL. | Keep or refactor script to use migrations; update doc accordingly. |
| SIMPLEST_FIX.sql | — | Dev-only toggle replaced by COMPLETE_RLS_FIX; deleted 2025-11-11. | ✅ Removed |
| SIMPLE_RLS_FIX.sql | — | Legacy dev toggle; deleted 2025-11-11. | ✅ Removed |

## MCP Documentation (Active)
| File | Reference Hits | Doc Bucket | Role | Action |
| --- | --- | --- | --- | --- |
| docs/mcp-tooling.md | README, integration FAQ, partner pack | MCP | Command schema reference | Keep; ensure kept in sync with commands |
| docs/mcp-quickstart.md | README, public readme draft, partner pack | MCP | Onboarding quickstart | Keep |
| docs/mcp-agent-examples.md | README, partner pack, public plan | MCP | Sample scripts (Daydreams/Node) | Keep; sanitize before public |
| docs/mcp-partner-pack.md | README, public plan | MCP | Bundle for partners/hackathons | Keep |
| docs/mcp-roadmap.md | README, partner pack | MCP | Future command list | Keep updated |

## Root Setup/Guide Docs
| File | References Found | Doc Bucket | Notes | Proposed Action |
| --- | --- | --- | --- | --- |
| ARWEAVE_SETUP_GUIDE.md | Linked from `AUTHENTICATION_UPLOAD_SETUP_COMPLETE.md` | Infra/Uploads | Part of upload pipeline docs. | **Resolved:** consolidated into `docs/infra/uploads.md` (Appendix B) on 2025-11-11. |
| AUTHENTICATION_UPLOAD_SETUP_COMPLETE.md | Self-referential only | Infra/Uploads | Large catch-all doc; needs reorg. | **Resolved:** content moved to `docs/infra/uploads.md` (Appendix A) on 2025-11-11. |
| BACKEND_COMPLETE.md | Referenced by `FILES_CREATED.md`, `QUICK_START.md`, `START_HERE.md`, `COMPLETE_SUMMARY.md` | Overview | Serves as core overview. | Keep; maybe move to `docs/overview/`. |
| BACKEND_COMPLETE.md | Referenced by `FILES_CREATED.md`, `QUICK_START.md`, `START_HERE.md`, `COMPLETE_SUMMARY.md` | Overview | Serves as core overview. | **Resolved:** merged into `docs/overview/platform.md` (Appendix A). |
| GRADIENT_BUTTON_COMPLETE.md | No references | UI/Components | Gradient CTA instructions. | **Resolved:** merged into `docs/infra/ui.md` (Appendix A). |
| GRADIENT_BUTTON_USAGE.md | No references | UI/Components | Detailed examples for CTA component. | **Resolved:** merged into `docs/infra/ui.md` (Appendix B). |
| HYBRID_COMPLETE.md | Referenced in `COMPLETE_SUMMARY.md` | Architecture | Large hybrid overview. | **Resolved:** merged into `docs/infra/ui.md` (Appendix C). |
| HYBRID_SETUP.md | No references | Architecture | Hybrid system setup steps. | **Resolved:** merged into `docs/infra/ui.md` (Appendix D). |
| INTEGRATION_GUIDE.md | Referenced widely across docs | Frontend | Critical for frontend handoff. | Keep; ensure latest instructions. |
| MIGRATION_GUIDE.md | Only mention inside `node_modules/axios` changelog | Infra | Merged into `docs/infra/supabase.md` (Appendix) on 2025-11-11. | — |
| PRIVY_SETUP_GUIDE.md | No references | Auth | Onboarding for Privy auth. | **Resolved:** merged into `docs/infra/auth.md` (Appendix A). |
| PROFILE_SYSTEM_GUIDE.md | No references | Infra/Profile | Documenting profile storage. | **Resolved:** merged into `docs/infra/wallets.md` (Appendix C). |
| SEAMLESS_UPLOAD_COMPLETE.md | No references | Infra/Uploads | Duplicate of upload docs. | **Resolved:** archived + appended to `docs/infra/uploads.md` (Appendix C). |
| SUPABASE_SETUP_GUIDE.md | No references (but there is `SUPABASE_SETUP.md`) | Infra/Supabase | Project provisioning steps. | **Resolved:** merged into `docs/infra/supabase.md` (Appendix B). |
| SUPABASE_SETUP.md | Referenced by SQL docs | Infra/Supabase | Full troubleshooting walkthrough. | **Resolved:** merged into `docs/infra/supabase.md` (Appendix A). |
| UPLOAD_SETUP_GUIDE.md | No references | Infra/Uploads | Another duplicate. | **Resolved:** appended to `docs/infra/uploads.md` (Appendix D). |
| WALLET_CONNECTION_GUIDE.md | No references | Wallets | Wallet onboarding instructions. | **Resolved:** merged into `docs/infra/wallets.md` (Appendix A). |
| WALLET_FIX_GUIDE.md | No references | Wallets | Troubleshooting doc. | **Resolved:** merged into `docs/infra/wallets.md` (Appendix B). |
| WEB3_VIDEO_ARCHIVING_GUIDE.md | No references | Infra/Uploads | Possibly replaced by Arweave guide. | **Resolved:** appended to `docs/infra/uploads.md` (Appendix E). |
| RLS_FIX_INSTRUCTIONS.md | Referenced by SQL fix table | Infra/Supabase | RLS remediation steps | **Resolved:** merged into `docs/infra/supabase.md` (Appendix C). |
| COMPLETE_SUMMARY.md | Referenced in docs | Overview | Master summary of backend. | **Resolved:** merged into `docs/overview/platform.md` (Appendix B). |
| SESSION_KEYS_SETUP.md | Referenced by payments docs | Auth | X402 session integration. | **Resolved:** merged into `docs/infra/auth.md` (Appendix B). |
| IMPORTANT_ENV_FIX.md | Mentioned in troubleshooting | Infra/Supabase/Auth | Environment override fix. | **Resolved:** merged into `docs/infra/auth.md` (Appendix C). |

## Script Utilities
Reference dump lives in `docs/script-reference.txt` (generated 2025-11-11 via `rg --glob '!node_modules/**'`).

| Script | Type | Role | Reference Notes | Proposed Action |
| --- | --- | --- | --- | --- |
| fix-rls.ts | TS | Runs `FIX_VIDEOS_RLS.sql` | Mentioned in script + `USDC_PAYMENT_SETUP.md` | Keep; ensure SQL script documented |
| apply-streaming-session-migration.ts | TS | Helper to run migration | see `scripts/run-migration.ts` | Keep |
| migrate-add-archived.ts / migrate-add-comments.ts | TS | Schema updates | Check if already in Supabase migrations | If duplicated, archive |
| backfill-analytics.ts / backfill-video-access.ts | TS | Data backfill | No external refs yet | Keep until data pipeline stabilized |
| cleanup-old-data.ts / cleanup-uuid-users.sql | TS/SQL | Data hygiene | Document usage in ops guide | Archive later once automated |
| mirror-public-template.sh | sh | Public mirror workflow | referenced in `docs/public-repo-plan.md` | Keep |
| seed-videos.ts / set-test-creator-wallet.ts | TS | Dev seeding | Document in dev onboarding | Keep |
| diagnose-* scripts | TS | Debug utilities | Document in troubleshooting guide | Keep for now |
| verify-service-role.ts / verify-* scripts | TS | Env validation | Useful for ops | Consider grouping into `scripts/diagnostics/` |

## Infra Playbooks
| File | Scope | Notes | Action |
| --- | --- | --- | --- |
| docs/infra/uploads.md | Auth + upload + storage | Consolidated playbook with appendices A–E (legacy content) | Keep as canonical reference; update when flows change |
| docs/infra/wallets.md | Wallet connect, creator integrity, profile system | Combines wallet guides + profile doc with appendices A–C | Keep; extend when wallet/session features evolve |
| docs/infra/supabase.md | Schema, RLS, storage policies | Appendices A–C hold Supabase setup + RLS instructions | Keep; map remaining SQL scripts here |
| docs/infra/ui.md | Gradient CTA + hybrid UX | Appendices A–D hold UI/hybrid legacy docs | Keep; expand with future UI components |
| docs/infra/auth.md | Privy + session keys + env hygiene | Appendices A–C preserve legacy auth docs | Keep; update when auth providers change |

## Next Mapping Steps
1. Cross-check each "No reference" item against Supabase migrations or current onboarding docs.
2. Update this file as references are discovered to maintain 99.99% confidence before deletion.

## SQL Legacy Folder
- `supabase/sql/legacy/` now contains the manual RLS/storage patches.
- Active scripts (e.g., `FIX_VIDEOS_RLS.sql`) are referenced by tooling; see folder README for status.
- Active SQL helpers now live under `supabase/sql/` with README; legacy patches in `supabase/sql/legacy/`.
- Next deletion review: confirm which legacy patches are fully superseded by migrations before removal.
