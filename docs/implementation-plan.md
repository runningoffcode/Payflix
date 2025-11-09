# Implementation Plan (PayFlix × Daydreams)

## Workstreams

1. **MCP Server Shim** *(In Progress)*
   - Status: Core commands (`getCreatorStats`, `listVideos`, `getSessionBalance`, `listCreatorVideos`, `getRecentPayouts`, `unlockVideo`) live at `/api/mcp`
   - Next: evaluate paid comment command once session endpoints are confirmed

2. **Facilitator Credential Strategy** *(In Progress)*
   - Status: Proxy endpoint + spend cap env vars live
   - Next: add persistence for `daydreamsSpendTotal` if we need cap across restarts

3. **Daydreams Context Design** *(Completed sample)*
   - Sample context + Node script in `docs/mcp-agent-examples.md`
   - Next: expand with paid comment example

4. **Telemetry & Monitoring** *(Ongoing)*
   - Status: Requests tagged with `X-Daydreams-Key` header
   - Next: dashboard/alert wiring once production traffic starts

5. **Testing & Rollout** *(Ongoing)*
   - Status: Playbook updated with MCP/proxy scenarios
   - Next: Hackathon dry run + staging demo with Daydreams team

## Milestones

| Phase | Goal | Target |
| --- | --- | --- |
| Hackathon MVP | MCP shim + facilitator access + sample agent | Week 1 |
| Hardening | Telemetry, spend caps, doc polish | Week 2 |
| Production | Multi-facilitator readiness, On-call runbook | Week 3 |

## Success Criteria
- Daydreams agent can fetch stats & unlock videos without manual steps
- Every payment from Daydreams sources is tagged and visible in dashboards
- Docs cover setup, testing, and rollback paths for future engineers
