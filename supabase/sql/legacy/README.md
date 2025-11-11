# Legacy SQL Fixes

Manual patches from earlier RLS/storage fixes live here. For current instructions see `docs/infra/supabase.md`. Each file lists whether it’s still referenced.

## File Index
| File | Status | Notes |
| --- | --- | --- |
| COMPLETE_RLS_FIX.sql | Still used for dev RLS reset | Referenced in `docs/infra/supabase.md` + appendices |
| FIX_VIDEOS_RLS.sql | Active (`scripts/fix-rls.ts`) | Do not delete until script updated |
