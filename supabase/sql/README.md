# Supabase SQL Scripts

- `*.sql` in this folder are active utilities (migrations, setup scripts, wallet helpers).
- Legacy RLS/storage patches live under `./legacy/` with their own README.

| File | Purpose |
| --- | --- |
| ADD_SESSIONS_TABLE.sql | Creates the sessions table used by X402 flows |
| SETUP_PROFILE_STORAGE.sql | Configures Supabase storage for profiles |
| ADD_SAMPLE_VIDEOS.sql | Seeds sample content |
| UPDATE_CREATOR_WALLETS_DIRECT.sql | Maintenance helper |
| ... | ... |
