---
title: Image resize worker
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - images
  - resize
  - optimization
  - worker
  - cloudflare
---

Cloudflare Worker for on-demand image resizing and optimization. It leverages Cloudflare's Image Resizing service to transform images with intelligent caching and format conversion.

## Overview

URL-based image transformation service:

- Width-based resizing
- Quality control
- Automatic format conversion (AVIF/WebP)
- Edge caching
- Origin validation

## API

### Request format

```
GET /:origin/:path+?w=<width>&q=<quality>
```

**Parameters:**

| Param    | Description     | Example              |
| -------- | --------------- | -------------------- |
| `origin` | Source domain   | `assets.tldraw.com`  |
| `path`   | Asset path      | `uploads/abc123.png` |
| `w`      | Width in pixels | `600`                |
| `q`      | Quality (1-100) | `80`                 |

**Example:**

```
GET /assets.tldraw.com/uploads/image.png?w=600&q=80
```

## Smart format selection

Automatically selects optimal format based on browser support:

```typescript
const accept = request.headers.get('Accept') ?? ''
const format = accept.includes('image/avif')
	? 'avif' // Best compression
	: accept.includes('image/webp')
		? 'webp' // Good compression
		: null // Original format
```

## Implementation

```typescript
export default class Worker extends WorkerEntrypoint<Environment> {
	readonly router = createRouter().get('/:origin/:path+', async (request) => {
		const { origin, path } = request.params
		const query = parseRequestQuery(request, queryValidator)

		// Validate origin
		if (!this.isValidOrigin(origin)) return notFound()

		// Build cache key
		const cacheKey = buildCacheKey(origin, path, query, format)
		const cached = await caches.default.match(cacheKey)
		if (cached) return handleCachedResponse(cached, request)

		// Apply transformations
		const imageOptions = {
			fit: 'scale-down',
			width: query.w ? Number(query.w) : undefined,
			quality: query.q ? Number(query.q) : undefined,
			format: format || undefined,
		}

		const response = await fetch(url, { cf: { image: imageOptions } })

		// Cache successful responses
		if (response.status === 200) {
			this.ctx.waitUntil(caches.default.put(cacheKey, response.clone()))
		}

		return response
	})
}
```

## Origin validation

Only allows trusted domains:

```typescript
isValidOrigin(origin: string) {
  if (this.env.IS_LOCAL) return true

  return (
    origin.endsWith('.tldraw.com') ||
    origin.endsWith('.tldraw.xyz') ||
    origin.endsWith('.tldraw.dev') ||
    origin.endsWith('.tldraw.workers.dev')
  )
}
```

## Routing modes

### Service binding mode

For internal tldraw services:

```typescript
if (useServiceBinding(this.env, origin)) {
	const req = new Request(url, { cf: { image: imageOptions } })
	return await this.env.SYNC_WORKER.fetch(req)
}
```

### External fetch mode

For direct image URLs:

```typescript
return await fetch(url, { cf: { image: imageOptions } })
```

## Caching

### Cache key generation

```typescript
const cacheKey = new URL(passthroughUrl)
cacheKey.searchParams.set('format', format ?? 'original')
for (const [key, value] of Object.entries(query)) {
	cacheKey.searchParams.set(key, value)
}
```

### ETag handling

```typescript
const ifNoneMatch = request.headers.get('If-None-Match')
const etag = cachedResponse.headers.get('etag')

if (ifNoneMatch && etag) {
	const parsedEtag = parseEtag(etag)
	for (const tag of ifNoneMatch.split(', ')) {
		if (parseEtag(tag) === parsedEtag) {
			return new Response(null, { status: 304 })
		}
	}
}
```

## Environment configuration

### Development

```toml
[env.dev]
name = "image-optimizer"
services = [{ binding = "SYNC_WORKER", service = "dev-tldraw-multiplayer" }]
```

### Production

```toml
[env.production]
name = "image-optimizer"
services = [{ binding = "SYNC_WORKER", service = "tldraw-multiplayer" }]
route = { pattern = "images.tldraw.xyz", custom_domain = true }
```

## Integration

### Asset pipeline

```
User Upload → Sync Worker → R2 Storage
      ↓
Image Request → Image Resize Worker → Optimized Delivery
```

### URL patterns

- **Direct assets**: `/assets.tldraw.com/uploads/file.png`
- **Multiplayer assets**: `/localhost:3000/api/uploads/file.png`
- **Published content**: Various `.tldraw.com` origins

## Performance

- Global edge processing
- High cache hit rates
- Automatic format optimization
- Bandwidth savings with modern formats

## Development

```bash
yarn dev          # Start worker (port 9339)
yarn test         # Run tests
yarn lint         # Code linting
```

## Key files

- `src/worker.ts` - Main worker entry
- `wrangler.toml` - Deployment config

## Related

- [Asset upload worker](./asset-upload-worker.md)
- [Sync worker](./sync-worker.md)
- [@tldraw/worker-shared](../packages/worker-shared.md)
