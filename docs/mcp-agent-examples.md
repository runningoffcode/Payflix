# MCP Agent Examples

## 1. Daydreams Context (TypeScript)
```ts
import { context, createDreams } from "@daydreamsai/core";
import { mcpCall } from "./mcpClient"; // thin wrapper around fetch

const payflixContext = context({
  type: "payflix",
  create: () => ({ lastStats: null }),
  actions: {
    getCreatorStats: async ({ wallet }) => {
      const res = await mcpCall("payflix.getCreatorStats", { wallet });
      return res.result;
    },
    unlockVideo: async ({ videoId, userWallet }) => {
      const res = await mcpCall("payflix.unlockVideo", { videoId, userWallet });
      return res.result;
    },
  },
  use: () => [
    { context: billingContext },
    { context: sessionContext },
  ],
});

export const agent = createDreams({
  model: openai("gpt-4o"),
  contexts: [payflixContext],
});
```

## 2. Plain Node Script
```js
import fetch from "node-fetch";

async function call(method, params) {
  const res = await fetch("https://staging.payflix.fun/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-MCP-API-KEY": process.env.MCP_API_KEY,
    },
    body: JSON.stringify({ method, params }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || "MCP error");
  return body.result;
}

(async () => {
  const stats = await call("payflix.getCreatorStats", { wallet: "SvsnAvyo..." });
  console.log(stats.highlights);
})();
```

## Tips
- Always check for errors (insufficient session balance, spend cap reached)
- Cache non-sensitive data if making high-volume requests
- Follow `docs/mcp-tooling.md` for additional methods and schema details
