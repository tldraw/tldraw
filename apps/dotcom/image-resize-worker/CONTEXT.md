# Image Resize Worker Context

## Overview

The `image-resize-worker` is a Cloudflare Worker that provides on-demand image resizing and optimization services for tldraw.com. It acts as a reverse proxy that leverages Cloudflare's built-in Image Resizing service to dynamically transform and optimize images while providing intelligent caching and format conversion.

## Architecture

### Core functionality (`worker.ts`)

The worker implements a URL-based image transformation service:

#### Request flow

```typescript
// URL Pattern: /:origin/:path+ with optional query params
// Example: /localhost:3000/uploads/abc123.png?w=600&q=80

export default class Worker extends WorkerEntrypoint<Environment> {
	readonly router = createRouter().get('/:origin/:path+', async (request) => {
		const { origin, path } = request.params
		const query = parseRequestQuery(request, queryValidator)

		// Validate origin domain
		if (!this.isValidOrigin(origin)) return notFound()

		// Determine optimal format (AVIF > WebP > original)
		const accept = request.headers.get('Accept') ?? ''
		const format = accept.includes('image/avif')
			? 'avif'
			: accept.includes('image/webp')
				? 'webp'
				: null

		// Build cache key and check cache
		const cacheKey = buildCacheKey(origin, path, query, format)
		const cachedResponse = await caches.default.match(cacheKey)
		if (cachedResponse) return handleCachedResponse(cachedResponse, request)

		// Apply image transformations
		const imageOptions = buildImageOptions(query, format)
		const response = await fetchWithTransformations(origin, path, imageOptions)

		// Cache successful responses
		if (response.status === 200) {
			this.ctx.waitUntil(caches.default.put(cacheKey, response.clone()))
		}

		return response
	})
}
```

### Image transformation options

The worker supports Cloudflare's Image Resizing parameters:

#### Query parameters

```typescript
const queryValidator = T.object({
	w: T.string.optional(), // Width in pixels
	q: T.string.optional(), // Quality (1-100)
})

// Applied as Cloudflare image options
const imageOptions: RequestInitCfPropertiesImage = {
	fit: 'scale-down', // Never upscale images
	width: query.w ? Number(query.w) : undefined,
	quality: query.q ? Number(query.q) : undefined,
	format: format || undefined, // AVIF, WebP, or original
}
```

#### Smart format selection

Automatic format optimization based on browser capabilities:

```typescript
const accept = request.headers.get('Accept') ?? ''
const format = accept.includes('image/avif')
	? 'avif' // Best compression
	: accept.includes('image/webp')
		? 'webp' // Good compression
		: null // Original format
```

### Origin validation system

Security mechanism to prevent abuse by validating request origins:

#### Development mode

```typescript
isValidOrigin(origin: string) {
  if (this.env.IS_LOCAL) {
    return true // Allow all origins in local development
  }

  return (
    origin.endsWith('.tldraw.com') ||
    origin.endsWith('.tldraw.xyz') ||
    origin.endsWith('.tldraw.dev') ||
    origin.endsWith('.tldraw.workers.dev')
  )
}
```

### Routing architecture

Two distinct routing modes based on origin:

#### Service binding mode

For internal tldraw services (multiplayer server):

```typescript
if (useServiceBinding(this.env, origin)) {
	const route = `/${path}`

	// Only allow asset upload endpoints
	if (!route.startsWith(APP_ASSET_UPLOAD_ENDPOINT)) {
		return notFound()
	}

	// Route through service binding to sync worker
	const req = new Request(passthroughUrl.href, { cf: { image: imageOptions } })
	actualResponse = await this.env.SYNC_WORKER.fetch(req)
}
```

#### External fetch mode

For direct image URLs from validated origins:

```typescript
else {
  // Direct fetch with image transformations
  actualResponse = await fetch(passthroughUrl, { cf: { image: imageOptions } })
}
```

### Caching strategy

Multi-layer caching for optimal performance:

#### Cache key generation

```typescript
const cacheKey = new URL(passthroughUrl)
cacheKey.searchParams.set('format', format ?? 'original')
for (const [key, value] of Object.entries(query)) {
	cacheKey.searchParams.set(key, value)
}
```

#### ETag handling

Proper HTTP caching with ETag support:

```typescript
// Handle cached responses with ETag validation
if (cachedResponse.status === 200) {
	const ifNoneMatch = request.headers.get('If-None-Match')
	const etag = cachedResponse.headers.get('etag')

	if (ifNoneMatch && etag) {
		const parsedEtag = parseEtag(etag)
		for (const tag of ifNoneMatch.split(', ')) {
			if (parseEtag(tag) === parsedEtag) {
				return new Response(null, { status: 304 }) // Not Modified
			}
		}
	}
}

function parseEtag(etag: string) {
	const match = etag.match(/^(?:W\/)"(.*)"$/)
	return match ? match[1] : null
}
```

## Environment configuration

### Worker environment interface

```typescript
interface Environment {
	IS_LOCAL?: string // Development mode flag
	SENTRY_DSN?: undefined // Error tracking (disabled)
	MULTIPLAYER_SERVER?: string // Service binding configuration
	SYNC_WORKER: Fetcher // Service binding to sync worker
}
```

### Deployment configuration (`wrangler.toml`)

Multi-environment setup for different stages:

#### Development environment

```toml
[env.dev]
name = "image-optimizer"
services = [{ binding = "SYNC_WORKER", service = "dev-tldraw-multiplayer" }]
```

#### Staging environment

```toml
[env.staging]
name = "staging-image-optimizer"
services = [{ binding = "SYNC_WORKER", service = "main-tldraw-multiplayer" }]
route = { pattern = "staging-images.tldraw.xyz", custom_domain = true }
```

#### Production environment

```toml
[env.production]
name = "image-optimizer"
services = [{ binding = "SYNC_WORKER", service = "tldraw-multiplayer" }]
route = { pattern = "images.tldraw.xyz", custom_domain = true }
```

## Dependencies

### Core worker libraries

- **@tldraw/worker-shared**: Request handling, routing, and error management utilities
- **@tldraw/dotcom-shared**: Shared constants and configurations (APP_ASSET_UPLOAD_ENDPOINT)
- **@tldraw/validate**: Type-safe input validation for query parameters
- **itty-router**: Lightweight HTTP routing for Cloudflare Workers

### Development dependencies

- **@cloudflare/workers-types**: TypeScript definitions for Workers APIs
- **wrangler**: Cloudflare Workers CLI and deployment tool

## Key features

### Image optimization

**Format conversion**: Automatic AVIF/WebP conversion based on browser support
**Quality control**: Adjustable quality settings (1-100)
**Size control**: Width-based resizing with scale-down protection
**Compression**: Cloudflare's optimized image processing pipeline

### Performance optimization

**Global caching**: Leverages Cloudflare's global cache network
**ETag support**: Proper HTTP caching with conditional requests
**Edge processing**: Image transformation at edge locations
**Service bindings**: Direct worker-to-worker communication for internal requests

### Security

**Origin validation**: Whitelist of allowed domains to prevent abuse
**Path filtering**: Asset upload endpoint validation for service bindings
**Content type validation**: Ensures responses are actual images
**No upscaling**: Prevents resource abuse with fit: 'scale-down'

## Usage patterns

### Basic image resizing

Transform any image from a valid origin:

```
GET /assets.tldraw.com/uploads/abc123.png?w=600&q=80
```

Response: Resized image at 600px width with 80% quality

### Format optimization

Browser automatically receives optimal format:

```typescript
// Request with Accept: image/avif,image/webp,image/*
GET / assets.tldraw.com / image.jpg

// Response: AVIF format (best compression) if supported
// Fallback: WebP format if AVIF not supported
// Fallback: Original JPEG format
```

### Asset upload integration

Works with tldraw's multiplayer asset system:

```typescript
// Internal routing through sync worker
GET /localhost:3000/api/uploads/asset-uuid?w=400

// Routes to: SYNC_WORKER.fetch('/api/uploads/asset-uuid', {
//   cf: { image: { width: 400, fit: 'scale-down' } }
// })
```

## Integration with tldraw ecosystem

### Asset pipeline

The image-resize-worker is part of tldraw's asset management system:

```
User Upload -> Sync Worker -> R2 Storage
     ↓
Image Request -> Image Resize Worker -> Optimized Delivery
```

### Service architecture

```
tldraw.com (Client)
├── sync-worker (Asset uploads, multiplayer)
├── image-resize-worker (Image optimization)
└── assets.tldraw.com (CDN delivery)
```

### URL structure

Different URL patterns for different use cases:

- **Direct assets**: `/assets.tldraw.com/uploads/file.png`
- **Multiplayer assets**: `/localhost:3000/api/uploads/file.png`
- **Published content**: Various origins ending in `.tldraw.com`

## Error handling

### Validation errors

- **Invalid Origin**: Returns 404 for non-whitelisted domains
- **Invalid Path**: Returns 404 for non-asset paths in service binding mode
- **Invalid Content**: Returns 404 for non-image responses

### Graceful degradation

- **Cache Miss**: Falls back to origin fetch with transformations
- **Transformation Failure**: May return original image or error
- **Service Binding Failure**: Falls back to direct fetch mode

## Performance characteristics

### Cloudflare edge benefits

- **Global distribution**: Processing at 200+ edge locations worldwide
- **Low latency**: Image transformation close to users
- **High throughput**: Automatic scaling based on demand
- **Bandwidth optimization**: Format conversion reduces transfer sizes

### Caching efficiency

- **Cache hit rate**: High hit rate due to consistent cache keys
- **Cache duration**: Leverages browser and CDN caching
- **Cache invalidation**: ETag-based validation for freshness

## Development and testing

### Local development

```bash
yarn dev  # Starts worker with inspector on port 9339
```

### Testing

```bash
yarn test           # Run unit tests
yarn test-coverage  # Run with coverage reporting
yarn lint          # Code linting
```

### Deployment

Each environment is deployed separately:

- Development: Manual deployment for testing
- Staging: Automatic deployment for QA
- Production: Controlled deployment with rollback capability

## Key benefits

### User experience

- **Faster loading**: Optimized images load faster
- **Bandwidth savings**: Modern formats reduce data usage
- **Responsive images**: Width-based resizing for different screen sizes
- **Universal compatibility**: Fallback to supported formats

### Developer experience

- **Simple API**: URL-based transformation parameters
- **Type safety**: Full TypeScript support with validation
- **Easy integration**: Works with existing asset upload systems
- **Monitoring**: Built-in error handling and logging

### Operations

- **Scalability**: Automatic scaling with zero configuration
- **Reliability**: Global redundancy and failover capabilities
- **Cost efficiency**: Pay-per-request pricing with caching benefits
- **Maintenance**: Minimal operational overhead
