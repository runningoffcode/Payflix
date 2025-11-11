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

## MCP & Proxy Tests
1. **listVideos**
   - MCP call should return public video array; assert HTTP 200 + `success: true`
   - Also test `payflix.listCreatorVideos` with a known wallet (expect creator-only set)
2. **unlockVideo via MCP**
   - Ensure session has funds, call `payflix.unlockVideo`, verify payment row + Digital ID cache bust
3. **Session balance command**
   - Call `payflix.getSessionBalance` before/after unlock to confirm spent amount increases
4. **Proxy spend cap**
   - Call `/api/facilitator/proxy/settle` repeatedly until cap is reached; expect HTTP 429 with cap message
5. **Daydreams agent end-to-end**
   - Run Daydreams sample agent, have it fetch stats and unlock a video; confirm facilitator logs include `X-Daydreams-Source`
