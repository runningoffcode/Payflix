# MCP Tooling Spec

## Exposed Commands

| Command | Description | Requires Payment? |
| --- | --- | --- |
| `payflix.getCreatorStats` | Fetch Digital ID payload for wallet | No |
| `payflix.listVideos` | List available videos/filters | No |
| `payflix.unlockVideo` | Trigger seamless unlock for video/session | Yes |
| `payflix.postComment` | Post paid comment via session key | Yes |

## Request Schema
- MCP request → JSON RPC payload containing:
  - `method`: command name
  - `params`: object with required fields (wallet, videoId, sessionId, etc.)
  - `auth`: API key or signed header (TBD in facilitator doc)

## Responses
- Successful responses mirror PayFlix REST responses (JSON)
- Errors use MCP error format (`code`, `message`, optional `data`)

## Deployment Notes
- MCP server runs alongside backend, e.g., `node mcp/index.ts`
- Env vars:
  - `MCP_API_KEY`
  - `PAYFLIX_BASE_URL`
  - `FACILITATOR_KEY`
