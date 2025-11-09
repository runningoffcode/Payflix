# Monitoring Guide (MCP + Facilitator Proxy)

This guide explains how to observe MCP and proxy traffic so issues surface before partners notice.

## Logs
- **MCP success log**:
  ```
  MCP success { method, keySuffix, status, durationMs }
  ```
- **MCP error log**:
  ```
  MCP error { method, keySuffix, status, message }
  ```
- **Proxy log**:
  ```
  Facilitator proxy { action, keySuffix, status, amount, spendTotal }
  ```

Filter by `method` or `action` to see per-command behavior. The `keySuffix` lets you distinguish partners without exposing full keys.

## Metrics / Alerts
If you use Datadog/Prometheus, create counters based on the log fields:
- `mcp_requests_total{method,status}` – track success/error ratios
- `facilitator_spend_total` – compare against `DAYDREAMS_FACILITATOR_CAP_USDC`
- `mcp_rate_limit_hits` – number of HTTP 429 responses

Suggested alerts:
1. MCP 5xx > 5% for 5 minutes → warn engineering
2. Facilitator spend ≥ 80% of cap → notify ops to replenish or raise cap
3. Repeated 401/429 responses → likely bad key or abusive client

## Dashboard Ideas
- Timeseries graph per MCP method (success vs error)
- Bar chart showing spend per partner (daily)
- Table of top error codes (401, 402, 429, 500)

These signals ensure we catch regressions, stuck sessions, or partner bugs in real time.
