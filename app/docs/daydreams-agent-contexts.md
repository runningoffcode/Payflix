# Daydreams Agent Contexts

## payflixContext
```ts
import { context, createDreams } from "@daydreamsai/core";

const payflixContext = context({
  type: "payflix",
  create: () => ({ lastStats: null }),
  actions: {
    getCreatorStats: async ({ wallet }) => {
      return mcp.call("payflix.getCreatorStats", { wallet });
    },
    unlockVideo: async ({ videoId, sessionId }) => {
      return mcp.call("payflix.unlockVideo", { videoId, sessionId });
    },
  },
  use: (state) => [
    { context: billingContext },
    { context: sessionContext },
  ],
});

const agent = createDreams({
  model: openai("gpt-4o"),
  contexts: [payflixContext],
});
```

## Action Scoping
- `payflixContext` should only allow spends when `sessionContext` confirms an active allowance
- Non-spend contexts (analytics) can read stats without unlocking

## Memory Shape
- Store last fetched stats, session info, and error flags to provide continuity between turns
