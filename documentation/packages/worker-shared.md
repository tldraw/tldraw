---
title: '@tldraw/worker-shared'
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - worker
  - cloudflare
  - api
  - r2
  - edge
---

## Overview

`@tldraw/worker-shared` provides shared utilities for Cloudflare Workers in the tldraw infrastructure. It includes routing helpers, asset handlers, and environment utilities.

## Basic usage

```typescript
import { createRouter } from '@tldraw/worker-shared'

const router = createRouter()
router.get('/health', () => Response.json({ ok: true }))
```

## Key components

- Routing and request helpers
- R2 asset upload and retrieval
- Sentry integration helpers

## Key files

- packages/worker-shared/src/index.ts - Package entry
- packages/worker-shared/src/router/ - Router helpers
- packages/worker-shared/src/assets/ - Asset handlers

## Related

- [Sync worker](../infrastructure/sync-worker.md)
- [Asset upload worker](../infrastructure/asset-upload-worker.md)
