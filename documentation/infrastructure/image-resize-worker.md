---
title: Image resize worker
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - images
  - resize
  - optimization
  - worker
  - cloudflare
---

The image resize worker provides on-demand image transformations using Cloudflare Image Resizing. It validates origins, selects an optimal output format, and caches results at the edge.

## Key components

### Request format

```
GET /:origin/:path+?w=<width>&q=<quality>
```

### Format selection

The worker inspects the Accept header to choose AVIF or WebP when supported:

```typescript
const accept = request.headers.get('Accept') ?? ''
const format = accept.includes('image/avif')
	? 'avif'
	: accept.includes('image/webp')
		? 'webp'
		: null
```

### Origin allowlist

Only trusted tldraw domains are eligible for resizing to avoid open proxy abuse.

## Data flow

1. Client requests a resized image with width/quality parameters.
2. The worker validates the origin and builds a cache key.
3. The worker fetches the origin image with `cf.image` options.
4. The response is cached and returned to the client.

## Development workflow

```bash
yarn dev

yarn test
```

## Key files

- apps/dotcom/image-resize-worker/src/worker.ts - Worker entry and routing
- apps/dotcom/image-resize-worker/wrangler.toml - Deployment configuration

## Related

- [Asset upload worker](./asset-upload-worker.md)
- [Sync worker](./sync-worker.md)
- [@tldraw/worker-shared](../packages/worker-shared.md)
