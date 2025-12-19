---
title: Branching chat template
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - chat
  - ai
  - branching
  - conversation
  - template
---

## Overview

The Branching Chat template builds a conversation tree UI on tldraw. Messages are nodes on the canvas, and a worker streams AI responses.

## Quick start

```bash
npx create-tldraw my-app
# Select the Branching chat template
cd my-app
npm install
# Add API keys to .dev.vars
npm run dev
```

## Key components

- Custom message node shapes
- Connection system for branches
- Worker streaming endpoint for AI responses

## Key files

- templates/branching-chat/client/App.tsx - Main app
- templates/branching-chat/client/ports/ - Connection port system
- templates/branching-chat/worker/worker.ts - Worker entry
- templates/branching-chat/wrangler.toml - Worker config

## Related

- [Agent template](./agent.md)
- [Custom shapes](../guides/custom-shapes.md)
