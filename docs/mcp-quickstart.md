# PayFlix MCP Quickstart

PayFlix exposes a Model Context Protocol (MCP) endpoint so agents (hackathon projects, partner automations, or any MCP client) can fetch creator stats or trigger seamless unlocks.

## 1. Request an API Key
Email engineering@payflix.fun (or your partner contact) to receive an `MCP_API_KEY`.

## 2. Send an MCP request
Endpoint: `POST https://staging.payflix.fun/api/mcp`

Headers:
```
Content-Type: application/json
X-MCP-API-KEY: <your key>
```

> Rate limit: 60 requests/minute per MCP key (HTTP 429 responses include `retryAfter` seconds).

Body example:
```json
{
  "method": "payflix.getCreatorStats",
  "params": { "wallet": "SvsnAvyo...9GS8" }
}
```

Supported commands:
- `payflix.getCreatorStats(wallet)` → returns Digital ID payload (lifetime + 24h stats, recent payouts)
- `payflix.listVideos()` → fetches public videos with metadata
- `payflix.getSessionBalance(userWallet)` → returns session allowance/spent/remaining
- `payflix.listCreatorVideos(wallet)` → returns videos owned by a specific creator
- `payflix.getRecentPayouts(wallet)` → returns the last five verified payouts
- `payflix.unlockVideo(videoId, userWallet)` → triggers the same seamless payment flow used in the UI (requires the viewer to have an active session)

## 3. Handle responses
Successful responses:
```json
{ "success": true, "result": { ... } }
```
Errors return HTTP status codes with `{ "error": "...", "message": "..." }`.
Common flags:
- `requiresSession: true` – viewer must deposit first
- `requiresTopUp: true` – session exists but lacks balance
- `retryAfter` – seconds until rate limit resets

For advanced schemas and additional commands, see `docs/mcp-tooling.md`.
