# Supabase SQL Scripts

- `*.sql` in this folder are active utilities (migrations, setup scripts, wallet helpers).
- Legacy RLS/storage patches live under `./legacy/` with their own README.

| File | Purpose |
| --- | --- |
| CREATE_TABLES.sql | Core schema (users, videos, payments, video_access) |
| ADD_SESSIONS_TABLE.sql | Creates the sessions table used by X402 flows |
| SETUP_PROFILE_STORAGE.sql | Configures Supabase storage for profiles |
| videos_policies.sql | Canonical videos-table RLS policies |
| ADD_SAMPLE_VIDEOS.sql | Seeds sample content |
| UPDATE_CREATOR_WALLETS_DIRECT.sql | Maintenance helper |
| ... | ... |
