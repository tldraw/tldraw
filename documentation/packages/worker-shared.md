---
title: "@tldraw/worker-shared"
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - worker
  - cloudflare
  - api
  - r2
  - edge
---

The `@tldraw/worker-shared` package provides shared utilities for tldraw's Cloudflare Worker services. It includes request handling, asset management, bookmark processing, error monitoring, and environment utilities optimized for edge computing.

## Overview

This package provides common infrastructure used across tldraw's worker services:

- **Request routing**: Type-safe HTTP request handling with validation
- **Asset management**: Cloudflare R2 integration for uploads and retrieval
- **Bookmark processing**: Web page metadata extraction with image optimization
- **Error monitoring**: Sentry integration for production error tracking
- **Environment management**: Type-safe environment variable handling

## Request routing

### Router creation

```typescript
import { createRouter, handleApiRequest, ApiRouter } from '@tldraw/worker-shared'

const router: ApiRouter<Env, ExecutionContext> = createRouter()

router.get('/api/health', () => Response.json({ ok: true }))

router.post('/api/upload/:id', async (request, env, ctx) => {
  const { id } = request.params
  // Handle upload
})
```

### Request handling

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return handleApiRequest({
      router,
      request,
      env,
      ctx,
      after: (response) => {
        // Add CORS headers, logging, etc.
        response.headers.set('access-control-allow-origin', '*')
        return response
      }
    })
  }
}
```

### Input validation

```typescript
import { parseRequestQuery, parseRequestBody } from '@tldraw/worker-shared'
import { T } from '@tldraw/validate'

const queryValidator = T.object({
  page: T.string.optional(),
  limit: T.positiveInteger.optional(),
})

router.get('/api/items', async (request, env) => {
  // Throws 400 if validation fails
  const { page, limit } = parseRequestQuery(request, queryValidator)
  // ...
})

const bodyValidator = T.object({
  name: T.string,
  data: T.jsonValue,
})

router.post('/api/items', async (request, env) => {
  const body = await parseRequestBody(request, bodyValidator)
  // ...
})
```

## Asset management

### Upload handling

```typescript
import { handleUserAssetUpload } from '@tldraw/worker-shared'

router.put('/api/assets/:id', async (request, env, ctx) => {
  return handleUserAssetUpload({
    objectName: request.params.id,
    bucket: env.ASSETS_BUCKET,
    body: request.body,
    headers: request.headers,
  })
})
```

Features:

- Duplicate prevention (checks if object exists)
- Preserves original HTTP metadata
- Returns ETag for cache validation

### Asset retrieval with caching

```typescript
import { handleUserAssetGet } from '@tldraw/worker-shared'

router.get('/api/assets/:id', async (request, env, ctx) => {
  return handleUserAssetGet({
    request,
    bucket: env.ASSETS_BUCKET,
    objectName: request.params.id,
    context: ctx,
  })
})
```

Features:

- Cloudflare Cache API integration
- Range request support (partial content)
- Conditional request support (If-None-Match)
- Immutable caching headers (1 year)
- Automatic cache population

## Bookmark processing

### Metadata extraction

```typescript
import { handleExtractBookmarkMetadataRequest } from '@tldraw/worker-shared'

router.get('/api/bookmark', async (request, env, ctx) => {
  return handleExtractBookmarkMetadataRequest({
    request,
    uploadImage: async (headers, body, objectName) => {
      await env.ASSETS_BUCKET.put(objectName, body, { httpMetadata: headers })
      return `https://assets.tldraw.com/${objectName}`
    }
  })
})
```

The bookmark processor:

1. Fetches the URL and extracts Open Graph/meta tags
2. Optionally optimizes and uploads preview images
3. Returns structured metadata (title, description, image, favicon)

### Image optimization

Images are automatically optimized using Cloudflare Image Resizing:

```typescript
// Preview images resized to 600px width
await trySaveImage('image', metadata, id, 600, uploadImage)

// Favicons resized to 64px
await trySaveImage('favicon', metadata, id, 64, uploadImage)
```

## Error monitoring

### Sentry integration

```typescript
import { createSentry } from '@tldraw/worker-shared'

router.get('/api/risky', async (request, env, ctx) => {
  try {
    return await riskyOperation()
  } catch (error) {
    createSentry(ctx, env, request)?.captureException(error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
})
```

### Sentry environment

```typescript
interface SentryEnvironment {
  readonly SENTRY_DSN?: string
  readonly TLDRAW_ENV?: string
  readonly WORKER_NAME?: string
  readonly CF_VERSION_METADATA?: WorkerVersionMetadata
}
```

Sentry is automatically disabled in development environments.

## Environment management

### Required environment variables

```typescript
import { requiredEnv } from '@tldraw/worker-shared'

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // Throws if any required variable is missing
    const { SENTRY_DSN, API_KEY } = requiredEnv(env, {
      SENTRY_DSN: true,
      API_KEY: true,
    })
    // TypeScript guarantees these are non-null
  }
}
```

### Environment type definitions

```typescript
interface WorkerEnv {
  SENTRY_DSN?: string
  TLDRAW_ENV?: string
  WORKER_NAME?: string
  CF_VERSION_METADATA?: WorkerVersionMetadata
  ASSETS_BUCKET?: R2Bucket
}
```

## HTTP error utilities

```typescript
import { notFound, forbidden, StatusError } from '@tldraw/worker-shared'

router.get('/api/item/:id', async (request, env) => {
  const item = await getItem(request.params.id)

  if (!item) {
    return notFound() // 404 with JSON body
  }

  if (!canAccess(item)) {
    return forbidden() // 403 with JSON body
  }

  // Custom status error
  if (tooManyRequests) {
    throw new StatusError(429, 'Rate limit exceeded')
  }

  return Response.json(item)
})
```

## Cloudflare integrations

### R2 storage

```typescript
interface Env {
  ASSETS_BUCKET: R2Bucket
  UPLOADS_BUCKET: R2Bucket
}

// Upload to R2
await bucket.put(objectName, body, {
  httpMetadata: headers,
})

// Get from R2 with conditional/range support
const object = await bucket.get(objectName, {
  range: request.headers,
  onlyIf: request.headers,
})
```

### Cache API

```typescript
// Check cache
const cacheKey = new Request(request.url, { headers: request.headers })
const cached = await caches.default.match(cacheKey)
if (cached) return cached

// Generate response
const response = await generateResponse()

// Populate cache (non-blocking)
ctx.waitUntil(caches.default.put(cacheKey, response.clone()))

return response
```

### Image Resizing

```typescript
const optimized = await fetch(imageUrl, {
  cf: {
    image: {
      width: 600,
      fit: 'scale-down',
      quality: 80,
    }
  }
})
```

## Usage patterns

### Complete worker example

```typescript
import {
  createRouter,
  handleApiRequest,
  handleUserAssetUpload,
  handleUserAssetGet,
  handleExtractBookmarkMetadataRequest,
  createSentry,
  requiredEnv,
} from '@tldraw/worker-shared'

interface Env {
  ASSETS_BUCKET: R2Bucket
  SENTRY_DSN?: string
  TLDRAW_ENV?: string
  WORKER_NAME?: string
  CF_VERSION_METADATA?: WorkerVersionMetadata
}

const router = createRouter<Env, ExecutionContext>()

router.put('/api/assets/:id', async (request, env) => {
  return handleUserAssetUpload({
    objectName: request.params.id,
    bucket: env.ASSETS_BUCKET,
    body: request.body,
    headers: request.headers,
  })
})

router.get('/api/assets/:id', async (request, env, ctx) => {
  return handleUserAssetGet({
    request,
    bucket: env.ASSETS_BUCKET,
    objectName: request.params.id,
    context: ctx,
  })
})

router.get('/api/bookmark', async (request, env, ctx) => {
  return handleExtractBookmarkMetadataRequest({ request })
})

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return handleApiRequest({
      router,
      request,
      env,
      ctx,
      after: (response) => {
        response.headers.set('access-control-allow-origin', '*')
        return response
      }
    })
  }
}
```

## Performance optimizations

### Edge computing benefits

- Global distribution via Cloudflare edge locations
- Low latency processing close to users
- Automatic scaling for traffic spikes
- Fast cold starts with V8 isolates

### Caching strategy

- Browser cache + CDN cache + worker cache
- Immutable assets cached for 1 year
- ETags for conditional requests
- Range support for efficient partial content

### Resource efficiency

- Streaming support for large files
- Non-blocking cache operations via `waitUntil`
- Connection pooling for external requests
- Minimal dependencies for fast cold starts

## Key files

- packages/worker-shared/src/handleRequest.ts - Request routing and handling
- packages/worker-shared/src/userAssetUploads.ts - R2 asset management
- packages/worker-shared/src/bookmarks.ts - Bookmark metadata extraction
- packages/worker-shared/src/sentry.ts - Error monitoring integration
- packages/worker-shared/src/env.ts - Environment variable handling
- packages/worker-shared/src/errors.ts - HTTP error utilities

## Related

- [@tldraw/dotcom-shared](./dotcom-shared.md) - Shared tldraw.com code
- [Sync worker](../infrastructure/sync-worker.md) - Multiplayer worker using this package
- [Asset upload worker](../infrastructure/asset-upload-worker.md) - Asset worker using this package
