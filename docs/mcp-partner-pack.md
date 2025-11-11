# PayFlix MCP Partner Pack

Welcome! This pack consolidates everything partners need to integrate with PayFlix via Model Context Protocol.

## 1. What You Get
- Instant access to creator analytics (Digital ID data)
- Seamless unlocks paid via x402 session keys (no wallet pop-ups)
- Real-time receipts: creators see “Verified X seconds ago” for every automated payout

## 2. Requesting Access
Send an email to engineering@payflix.fun (or your event contact) with:
1. Team / project name
2. Contact email + Discord/Twitter handle
3. Intended use case (e.g., “MCP agent that summarizes creator stats”)
4. Estimated request volume

We’ll reply with:
- Unique `MCP_API_KEY`
- Optional facilitator proxy key (if you need to settle x402 transactions directly)
- Rate limits / spend caps for your key

## 3. How to Integrate
1. Read `docs/mcp-quickstart.md` for basic cURL examples.
2. Consult `docs/mcp-tooling.md` for full command schemas and error formats.
3. Copy the TypeScript or Node examples from `docs/mcp-agent-examples.md` into your project.
4. Test on staging (run `getCreatorStats → getSessionBalance → unlockVideo`).

## 4. Support
- Join the PayFlix Discord (link shared in onboarding email) for office hours and questions.
- File GitHub issues for feature requests or bug reports.
- Provide feedback on which MCP command you need next (see `docs/mcp-roadmap.md`).

Happy hacking!
