# Integration FAQ

**What is MCP and why does PayFlix expose it?**  
Model Context Protocol lets AI agents call external services uniformly. By exposing PayFlix via MCP, partners and agentic workflows can fetch creator stats or unlock content without custom SDKs.

**How do creators benefit?**  
Every agent-triggered unlock still routes through our session keys, so creators see instant USDC payouts and Digital ID receipts—same as the main UI.

**What happens if an API key leaks?**  
Each partner gets unique keys. We can revoke or rotate them without affecting others, and the facilitator proxy has spend caps as a safety net.

**Does this replace the regular PayFlix UI?**  
No. This is an additional entry point for automations, hackathon projects, and AI workflows. Viewers can still use the standard app.

**How do we know agents paid?**  
Digital ID badges update the moment a payment settles (“Verified X seconds ago”), and every transaction is recorded in the `payments` table—visible to both creators and auditors.

**Where can developers learn more?**  
- `docs/mcp-quickstart.md` for a rapid intro
- `docs/mcp-tooling.md` for full command specs
- `docs/facilitator-proxy.md` for proxy setup and monitoring
