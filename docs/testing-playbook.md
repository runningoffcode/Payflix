# Testing Playbook

## Automated Tests
1. Mock MCP call to `payflix.getCreatorStats` → expect Digital ID payload
2. Mock `payflix.unlockVideo` with session allowance → expect payment row + verifiedAt
3. Mock `payflix.postComment` → expect video earnings + Digital ID cache invalidation

## Manual QA
1. Run Daydreams agent locally, connect to PayFlix MCP server
2. Ask agent to fetch creator stats → verify badge updates
3. Ask agent to unlock a video → confirm session balance decreases + creator earnings increase
4. Confirm Digital ID modal shows “Verified X seconds ago” without refresh

## Load / Abuse Scenarios
- Rapid unlock requests to validate rate limits
- Facilitator downtime (simulate 500) → ensure agent surfaces friendly error
- Spend cap exhaustion → verify agent reports insufficient balance

## Rollback Plan
- Disable MCP endpoint or revoke facilitator keys if anomalous spend detected
- Re-enable after audit
