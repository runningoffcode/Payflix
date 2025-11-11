# Facilitator Proxy Runbook

The facilitator proxy allows trusted MCP partners to reuse our existing X402 facilitator without sharing private keys.

## Env Vars
```
PARTNER_API_KEY=<random secret>
PARTNER_FACILITATOR_CAP_USDC=25
PARTNER_PROXY_RATE_LIMIT=30
```
- `PARTNER_API_KEY` – shared only with the partner to authenticate `/api/facilitator/proxy/*` calls
- `PARTNER_FACILITATOR_CAP_USDC` – cumulative USDC allowance before the proxy refuses additional settlements (reset by redeploy or manual counter reset)
- `PARTNER_PROXY_RATE_LIMIT` – per-minute limit per key (HTTP 429 errors include `retryAfter` seconds)

## Request Format
```
POST /api/facilitator/proxy/verify or /settle
Headers: X-Partner-Key: <key>
Body: { transaction, network, token, amount, recipient }
```
- `verify` validates the transaction but does not spend
- `settle` signs and broadcasts, then increments the spend counter

## Monitoring
- Log entries tagged with `X-Partner-Source` header
- Track `partnerSpendTotal` vs cap (add dashboard/alert when >80%)
- Watch 4xx/5xx counts (especially 401, 429) to detect auth mistakes or rate-limit pressure

## Key Rotation / Revocation
1. Generate a new secret
2. Update env var + redeploy
3. Send new key via secure channel (password manager share or encrypted message)
4. Revoke old key by removing from env or blocking at API gateway

## Why a Cap?
- Prevents runaway spend if an agent loops
- Buys time to investigate anomalies before funds drain
