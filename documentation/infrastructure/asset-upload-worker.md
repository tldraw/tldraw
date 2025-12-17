---
title: Asset upload worker
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - assets
  - upload
  - worker
  - cloudflare
  - r2
---

Cloudflare Worker for handling user asset uploads and serving images for tldraw.com. It provides asset storage and retrieval via Cloudflare R2.

## Overview

A lightweight worker that:

- Uploads images to Cloudflare R2
- Serves assets with edge caching
- Handles range requests for large files
- Prevents duplicate uploads

## Tech stack

- **Runtime**: Cloudflare Workers
- **Storage**: Cloudflare R2
- **Router**: itty-router
- **Shared logic**: @tldraw/worker-shared

## API endpoints

### Upload asset

```
POST /uploads/:objectName
```

- Stores asset in R2 bucket
- Returns object metadata and ETag
- Returns 409 if object already exists
- Preserves HTTP metadata (content-type)

### Retrieve asset

```
GET /uploads/:objectName
```

- Serves from R2 with caching
- Supports HTTP range requests
- Handles conditional requests (If-None-Match)
- Returns 404 if not found

## Implementation

```typescript
export default class Worker extends WorkerEntrypoint<Environment> {
  readonly router = createRouter<Environment>()
    .all('*', preflight)                    // CORS
    .get('/uploads/:objectName', async (request, env, ctx) => {
      return handleUserAssetGet({
        request,
        bucket: env.UPLOADS,
        objectName: request.params.objectName,
        context: ctx,
      })
    })
    .post('/uploads/:objectName', async (request, env) => {
      return handleUserAssetUpload({
        objectName: request.params.objectName,
        bucket: env.UPLOADS,
        body: request.body,
        headers: request.headers,
      })
    })
    .all('*', notFound)
}
```

## Environment configuration

### Development

```toml
[env.dev]
name = "tldraw-assets-dev"
r2_buckets = [{ binding = "UPLOADS", bucket_name = "uploads-preview" }]
```

### Production

```toml
[env.production]
name = "tldraw-assets"
r2_buckets = [{ binding = "UPLOADS", bucket_name = "uploads" }]
route = { pattern = "assets.tldraw.xyz", custom_domain = true }
```

## Storage

### R2 buckets

| Bucket | Purpose |
|--------|---------|
| `uploads-preview` | Dev/preview/staging |
| `uploads` | Production only |

### Caching strategy

- Cloudflare Cache API for GET requests
- Cache keys include full URL with headers
- ETag headers for validation
- Range support for streaming

## Request flow

```
Client → Cloudflare Edge → Worker → R2 Storage
   ↑                                    ↓
   ←────── Cache Layer ←─────────────←──
```

## Usage

### Client integration

```typescript
// Upload
const response = await fetch(`${WORKER_URL}/uploads/${objectName}`, {
  method: 'POST',
  body: file,
  headers: { 'Content-Type': file.type },
})

// Retrieve
const imageUrl = `${WORKER_URL}/uploads/${objectName}`
```

### tldraw.com integration

- Image import to canvas
- Temporary session asset storage
- Edge-cached delivery globally

## Security

- CORS enabled for cross-origin requests
- No authentication (relies on object name secrecy)
- Upload limits via Cloudflare Worker limits (25MB)

## Development

```bash
yarn dev   # Start local worker (port 8788)
yarn test  # Run tests
```

Local assets persist to `tmp-assets/` directory.

## Monitoring

- Cloudflare Dashboard for metrics
- Sentry for error tracking
- Analytics Engine for telemetry

## Limitations

- 25MB request body size
- No server-side file type validation
- Assets persist indefinitely (no cleanup)
- Object names must be unique

## Key files

- `src/worker.ts` - Main worker entry
- `src/types.ts` - Environment interface
- `wrangler.toml` - Deployment config

## Related

- [Sync worker](./sync-worker.md)
- [Image resize worker](./image-resize-worker.md)
- [@tldraw/worker-shared](../packages/worker-shared.md)
