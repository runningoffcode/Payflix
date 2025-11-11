# MCP Command Roadmap

## Phase 2 (Feedback-Driven)
1. **payflix.postComment**
   - Params: `videoId`, `userWallet`, `content`
   - Uses payment orchestrator to handle paid comment flow
   - Returns comment ID + payment receipt so agents can reference the interaction

2. **payflix.createSessionDeposit** *(TBD)*
   - Allow agents to initiate deposits (requires facilitator enhancements)
   - Useful for fully autonomous viewers or scripted demos

3. **payflix.getCreatorSummary**
   - Bundled stats + recent payouts + video list in one response (optimized for dashboards)

## Prioritization Process
- Collect partner requests in GitHub issues or the shared feedback doc
- Evaluate effort vs impact during weekly planning
- Update this roadmap and `docs/mcp-tooling.md` once a command is scheduled

## Timeline (tentative)
- Week 1 post-hackathon: finalize `postComment`
- Week 2: decide whether to pursue session deposits or bundled summaries based on partner demand

Contributions welcome—open a PR or issue if you have a command idea.
