---
title: Agent template
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - agent
  - ai
  - assistant
  - template
---

## Overview

The Agent template adds an AI assistant that can interpret chat prompts and apply actions to the canvas. It includes a Vite client and a Cloudflare Worker backend with streaming responses.

## Quick start

```bash
npx create-tldraw my-app
# Select the Agent template
cd my-app
npm install
# Add API keys to .dev.vars
npm run dev
```

## Key components

- Client chat panel that streams agent output
- Worker route that turns prompts into canvas actions
- Durable Object for per-session agent state

## Key files

- templates/agent/client/main.tsx - Client entry
- templates/agent/worker/worker.ts - Worker entry
- templates/agent/worker/routes/stream.ts - Streaming endpoint
- templates/agent/wrangler.toml - Worker config

## Related

- [Fairy worker](../infrastructure/fairy-worker.md)
- [@tldraw/tldraw](../packages/tldraw.md)
