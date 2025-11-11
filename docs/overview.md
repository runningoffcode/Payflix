# PayFlix × Daydreams Overview

## Current PayFlix Stack
- **Session keys (X-402)** for frictionless deposits / unlocks
- **Digital ID** for real-time creator stats and payout proof
- **Supabase + Redis** for analytics, balances, cache busting
- **Cloudflare R2 pipeline** for uploads and streaming

## Daydreams Capabilities
- `@daydreamsai/core` contexts with composable memory/state
- Built-in **MCP client** for connecting to external tools
- Example **x402 nanoservice** showing automated micropayments
- Public repo: https://github.com/daydreamsai/daydreams (examples: mcp integration, x402 nanoservice)

## Joint Objective
Allow Daydreams agents to:
1. Call PayFlix endpoints via MCP server
2. Settle x402 micropayments through our facilitator
3. Surface results (creator stats, unlock confirmations) instantly

## High-Level Flow
1. Agent invokes PayFlix MCP tool → fetch stats or request unlock
2. If payment required, x402 nanoservice handles session settlement
3. PayFlix invalidates caches → Digital ID shows “Verified X seconds ago”
4. Result returned to user or recorded for automations
