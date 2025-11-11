# PayFlix MCP Partner Overview

## Current PayFlix Stack
- **Session keys (X-402)** for frictionless deposits / unlocks
- **Digital ID** for real-time creator stats and payout proof
- **Supabase + Redis** for analytics, balances, cache busting
- **Cloudflare R2 pipeline** for uploads and streaming

## Partner Capabilities
- Call PayFlix MCP commands to fetch creator stats, list videos, or request unlocks
- Stream payment + telemetry data back into dashboards or mission consoles
- Use the facilitator proxy to run seamless X402 payments without exposing private keys

## Joint Objective
Allow MCP partners to:
1. Call PayFlix endpoints via the MCP server
2. Settle X402 micropayments through our facilitator
3. Surface results (creator stats, unlock confirmations) instantly

## High-Level Flow
1. Agent invokes PayFlix MCP tool → fetch stats or request unlock
2. If payment required, X402 facilitator settles the session
3. PayFlix invalidates caches → Digital ID shows “Verified X seconds ago”
4. Result returned to user or recorded for automations
