# Facilitator Integration

## Options
1. **Scoped Credentials**
   - Issue partners a facilitator key with spend caps (e.g., max USDC per hour)
   - Pros: Decentralized; partner handles session tracking
   - Cons: Harder to revoke quickly

2. **Proxy Through PayFlix**
   - Partner hits our existing `x402FacilitatorService` endpoints
   - Pros: Centralized control, unified telemetry
   - Cons: Requires MCP tool to expose facilitator methods

## Recommended Approach
Start with **proxy** for hackathon (faster, monitored), move to scoped keys once tokenomics/liquidity pools are ready.

## Monitoring & Telemetry
- Add `X-Partner-Source: true` header to every facilitator request
- Log spend, latency, success/fail per source in observability stack

## Env Variables
- `PARTNER_FACILITATOR_CAP_USDC`
- `PARTNER_API_KEY`
- `FACILITATOR_PROXY_URL`
