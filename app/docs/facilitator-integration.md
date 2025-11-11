# Facilitator Integration

## Options
1. **Scoped Credentials**
   - Issue Daydreams a facilitator key with spend caps (e.g., max USDC per hour)
   - Pros: Decentralized; Daydreams handles session tracking
   - Cons: Harder to revoke quickly

2. **Proxy Through PayFlix**
   - Daydreams hits our existing `x402FacilitatorService` endpoints
   - Pros: Centralized control, unified telemetry
   - Cons: Requires MCP tool to expose facilitator methods

## Recommended Approach
Start with **proxy** for hackathon (faster, monitored), move to scoped keys once tokenomics/liquidity pools are ready.

## Monitoring & Telemetry
- Add `X-Daydreams-Source: true` header to every facilitator request
- Log spend, latency, success/fail per source in observability stack

## Env Variables
- `DAYDREAMS_FACILITATOR_CAP_USDC`
- `DAYDREAMS_API_KEY`
- `FACILITATOR_PROXY_URL`
