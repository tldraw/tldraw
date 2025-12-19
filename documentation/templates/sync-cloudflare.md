---
title: Sync Cloudflare template
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - sync
  - cloudflare
  - multiplayer
  - template
---

## Overview

The Sync Cloudflare template is a full multiplayer example with a Vite client and a Cloudflare Worker backend using Durable Objects.

## Quick start

```bash
npx create-tldraw my-app
# Select the Multiplayer template
cd my-app
npm install
npm run dev
```

## Key components

- Vite client using `@tldraw/sync`
- Worker with room Durable Objects
- Asset upload and bookmark handlers

## Key files

- templates/sync-cloudflare/worker/worker.ts - Worker entry
- templates/sync-cloudflare/worker/TldrawDurableObject.ts - Room DO
- templates/sync-cloudflare/client/main.tsx - Client entry
- templates/sync-cloudflare/wrangler.toml - Worker config

## Related

- [@tldraw/sync](../packages/sync.md)
- [Multiplayer architecture](../architecture/multiplayer.md)
