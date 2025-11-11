# MCP Agent Examples

## 1. TypeScript Helper (fetch + JSON-RPC)
```ts
import fetch from "node-fetch";

const MCP_URL = "https://staging.payflix.fun/api/mcp";
const MCP_KEY = process.env.MCP_API_KEY!;

async function mcpCall(method: string, params: Record<string, unknown>) {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-MCP-API-KEY": MCP_KEY,
    },
    body: JSON.stringify({ method, params }),
  });

  const body = await res.json();
  if (!res.ok || body.error) {
    throw new Error(body.error?.message || body.message || "MCP error");
  }
  return body.result;
}

export async function getCreatorStats(wallet: string) {
  return mcpCall("payflix.getCreatorStats", { wallet });
}

export async function listVideos(wallet: string) {
  return mcpCall("payflix.listCreatorVideos", { wallet });
}

export async function unlockVideo(videoId: string, userWallet: string) {
  return mcpCall("payflix.unlockVideo", { videoId, userWallet });
}
```

## 2. Plain Node Script
```js
import "dotenv/config";
import { getCreatorStats, unlockVideo } from "./mcpClient.js";

(async () => {
  const stats = await getCreatorStats("SvsnAvyo...");
  console.log(stats.highlights);

  const unlock = await unlockVideo("video-id", "wallet-address");
  console.log(unlock.status);
})();
```

## Tips
- Always check for errors (insufficient session balance, spend cap reached)
- Cache non-sensitive data if making high-volume requests
- Follow `docs/mcp-tooling.md` for additional methods and schema details
