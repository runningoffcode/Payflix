# Testing Playbook

1. Run partner MCP client locally, connect to PayFlix MCP server
2. Call `payflix.getSessionBalance` twice, ensure cache invalidates correctly
3. Unlock a video via MCP and verify X402 facilitator logs show the spend
4. Run integration tests against `/api/creator/analytics` for stats integrity
5. **Partner agent end-to-end**
   - Run the sample MCP agent, have it fetch stats and unlock a video; confirm facilitator logs include the partner header
