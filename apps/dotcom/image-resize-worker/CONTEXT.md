# Image Resize Worker Context

## Overview

The `image-resize-worker` is a Cloudflare Worker that provides on-demand image resizing and optimization services for tldraw.com. It acts as a reverse proxy that leverages Cloudflare's built-in Image Resizing service to dynamically transform and optimize images while providing intelligent caching and format conversion.

## Architecture

### Core Functionality (`worker.ts`)

The worker implements a URL-based image transformation service:

#### Request Flow

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

### Image Transformation Options

The worker supports Cloudflare's Image Resizing parameters:

#### Query Parameters

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

#### Smart Format Selection

Automatic format optimization based on browser capabilities:

```typescript
const accept = request.headers.get('Accept') ?? ''
const format = accept.includes('image/avif')
	? 'avif' // Best compression
	: accept.includes('image/webp')
		? 'webp' // Good compression
		: null // Original format
```

### Origin Validation System

Security mechanism to prevent abuse by validating request origins:

#### Development Mode

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

### Routing Architecture

Two distinct routing modes based on origin:

#### Service Binding Mode

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

#### External Fetch Mode

For direct image URLs from validated origins:

```typescript
else {
  // Direct fetch with image transformations
  actualResponse = await fetch(passthroughUrl, { cf: { image: imageOptions } })
}
```

### Caching Strategy

Multi-layer caching for optimal performance:

#### Cache Key Generation

```typescript
const cacheKey = new URL(passthroughUrl)
cacheKey.searchParams.set('format', format ?? 'original')
for (const [key, value] of Object.entries(query)) {
	cacheKey.searchParams.set(key, value)
}
```

#### ETag Handling

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

## Environment Configuration

### Worker Environment Interface

```typescript
interface Environment {
	IS_LOCAL?: string // Development mode flag
	SENTRY_DSN?: undefined // Error tracking (disabled)
	MULTIPLAYER_SERVER?: string // Service binding configuration
	SYNC_WORKER: Fetcher // Service binding to sync worker
}
```

### Deployment Configuration (`wrangler.toml`)

Multi-environment setup for different stages:

#### Development Environment

```toml
[env.dev]
name = "image-optimizer"
services = [{ binding = "SYNC_WORKER", service = "dev-tldraw-multiplayer" }]
```

#### Staging Environment

```toml
[env.staging]
name = "staging-image-optimizer"
services = [{ binding = "SYNC_WORKER", service = "main-tldraw-multiplayer" }]
route = { pattern = "staging-images.tldraw.xyz", custom_domain = true }
```

#### Production Environment

```toml
[env.production]
name = "image-optimizer"
services = [{ binding = "SYNC_WORKER", service = "tldraw-multiplayer" }]
route = { pattern = "images.tldraw.xyz", custom_domain = true }
```

## Dependencies

### Core Worker Libraries

- **@tldraw/worker-shared**: Request handling, routing, and error management utilities
- **@tldraw/dotcom-shared**: Shared constants and configurations (APP_ASSET_UPLOAD_ENDPOINT)
- **@tldraw/validate**: Type-safe input validation for query parameters
- **itty-router**: Lightweight HTTP routing for Cloudflare Workers

### Development Dependencies

- **@cloudflare/workers-types**: TypeScript definitions for Workers APIs
- **wrangler**: Cloudflare Workers CLI and deployment tool

## Key Features

### Image Optimization

**Format Conversion**: Automatic AVIF/WebP conversion based on browser support
**Quality Control**: Adjustable quality settings (1-100)
**Size Control**: Width-based resizing with scale-down protection
**Compression**: Cloudflare's optimized image processing pipeline

### Performance Optimization

**Global Caching**: Leverages Cloudflare's global cache network
**ETag Support**: Proper HTTP caching with conditional requests
**Edge Processing**: Image transformation at edge locations
**Service Bindings**: Direct worker-to-worker communication for internal requests

### Security

**Origin Validation**: Whitelist of allowed domains to prevent abuse
**Path Filtering**: Asset upload endpoint validation for service bindings
**Content Type Validation**: Ensures responses are actual images
**No Upscaling**: Prevents resource abuse with fit: 'scale-down'

## Usage Patterns

### Basic Image Resizing

Transform any image from a valid origin:

```
GET /assets.tldraw.com/uploads/abc123.png?w=600&q=80
```

Response: Resized image at 600px width with 80% quality

### Format Optimization

Browser automatically receives optimal format:

```typescript
// Request with Accept: image/avif,image/webp,image/*
GET / assets.tldraw.com / image.jpg

// Response: AVIF format (best compression) if supported
// Fallback: WebP format if AVIF not supported
// Fallback: Original JPEG format
```

### Asset Upload Integration

Works with tldraw's multiplayer asset system:

```typescript
// Internal routing through sync worker
GET /localhost:3000/api/uploads/asset-uuid?w=400

// Routes to: SYNC_WORKER.fetch('/api/uploads/asset-uuid', {
//   cf: { image: { width: 400, fit: 'scale-down' } }
// })
```

## Integration with tldraw Ecosystem

### Asset Pipeline

The image-resize-worker is part of tldraw's asset management system:

```
User Upload -> Sync Worker -> R2 Storage
     ↓
Image Request -> Image Resize Worker -> Optimized Delivery
```

### Service Architecture

```
tldraw.com (Client)
├── sync-worker (Asset uploads, multiplayer)
├── image-resize-worker (Image optimization)
└── assets.tldraw.com (CDN delivery)
```

### URL Structure

Different URL patterns for different use cases:

- **Direct Assets**: `/assets.tldraw.com/uploads/file.png`
- **Multiplayer Assets**: `/localhost:3000/api/uploads/file.png`
- **Published Content**: Various origins ending in `.tldraw.com`

## Error Handling

### Validation Errors

- **Invalid Origin**: Returns 404 for non-whitelisted domains
- **Invalid Path**: Returns 404 for non-asset paths in service binding mode
- **Invalid Content**: Returns 404 for non-image responses

### Graceful Degradation

- **Cache Miss**: Falls back to origin fetch with transformations
- **Transformation Failure**: May return original image or error
- **Service Binding Failure**: Falls back to direct fetch mode

## Performance Characteristics

### Cloudflare Edge Benefits

- **Global Distribution**: Processing at 200+ edge locations worldwide
- **Low Latency**: Image transformation close to users
- **High Throughput**: Automatic scaling based on demand
- **Bandwidth Optimization**: Format conversion reduces transfer sizes

### Caching Efficiency

- **Cache Hit Rate**: High hit rate due to consistent cache keys
- **Cache Duration**: Leverages browser and CDN caching
- **Cache Invalidation**: ETag-based validation for freshness

## Development and Testing

### Local Development

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

## Key Benefits

### User Experience

- **Faster Loading**: Optimized images load faster
- **Bandwidth Savings**: Modern formats reduce data usage
- **Responsive Images**: Width-based resizing for different screen sizes
- **Universal Compatibility**: Fallback to supported formats

### Developer Experience

- **Simple API**: URL-based transformation parameters
- **Type Safety**: Full TypeScript support with validation
- **Easy Integration**: Works with existing asset upload systems
- **Monitoring**: Built-in error handling and logging

### Operations

- **Scalability**: Automatic scaling with zero configuration
- **Reliability**: Global redundancy and failover capabilities
- **Cost Efficiency**: Pay-per-request pricing with caching benefits
- **Maintenance**: Minimal operational overhead
