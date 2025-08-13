# Worker-Shared Package Context

## Overview

The `@tldraw/worker-shared` package provides shared utilities for tldraw's worker services (bemo-worker, dotcom-worker, etc.). It includes request handling, asset management, bookmark processing, error monitoring, and environment utilities optimized for edge computing platforms like Cloudflare Workers.

## Architecture

### Request Routing System (`handleRequest.ts`)

Type-safe HTTP request handling with validation:

#### Router Creation

```typescript
import { Router, RouterType, IRequest, RequestHandler } from 'itty-router'

type ApiRoute<Env, Ctx> = (
	path: string,
	...handlers: RequestHandler<IRequest, [env: Env, ctx: Ctx]>[]
) => RouterType<IRequest, [env: Env, ctx: Ctx]>

function createRouter<Env extends SentryEnvironment, Ctx extends ExecutionContext>() {
	const router: ApiRouter<Env, Ctx> = Router()
	return router
}
```

#### Request Handler

```typescript
async function handleApiRequest({
	router,
	request,
	env,
	ctx,
	after,
}: {
	router: ApiRouter<Env, Ctx>
	request: Request
	env: Env
	ctx: Ctx
	after(response: Response): Response | Promise<Response>
}) {
	try {
		response = await router.fetch(request, env, ctx)
	} catch (error: any) {
		if (error instanceof StatusError) {
			response = Response.json({ error: error.message }, { status: error.status })
		} else {
			response = Response.json({ error: 'Internal server error' }, { status: 500 })
			createSentry(ctx, env, request)?.captureException(error)
		}
	}

	return await after(response)
}
```

#### Input Validation

Type-safe request parsing with validation:

```typescript
// Query parameter validation
function parseRequestQuery<Params>(request: IRequest, validator: T.Validator<Params>) {
	try {
		return validator.validate(request.query)
	} catch (err) {
		if (err instanceof T.ValidationError) {
			throw new StatusError(400, `Query parameters: ${err.message}`)
		}
		throw err
	}
}

// Request body validation
async function parseRequestBody<Body>(request: IRequest, validator: T.Validator<Body>) {
	try {
		return validator.validate(await request.json())
	} catch (err) {
		if (err instanceof T.ValidationError) {
			throw new StatusError(400, `Body: ${err.message}`)
		}
		throw err
	}
}
```

### Asset Management (`userAssetUploads.ts`)

Cloudflare R2 integration for user-uploaded assets:

#### Asset Upload

```typescript
async function handleUserAssetUpload({
	body,
	headers,
	bucket,
	objectName,
}: {
	objectName: string
	bucket: R2Bucket
	body: ReadableStream | null
	headers: Headers
}): Promise<Response> {
	// Prevent duplicate uploads
	if (await bucket.head(objectName)) {
		return Response.json({ error: 'Asset already exists' }, { status: 409 })
	}

	// Store in R2 with original metadata
	const object = await bucket.put(objectName, body, {
		httpMetadata: headers,
	})

	return Response.json(
		{ object: objectName },
		{
			headers: { etag: object.httpEtag },
		}
	)
}
```

#### Asset Retrieval with Caching

```typescript
async function handleUserAssetGet({
	request,
	bucket,
	objectName,
	context,
}: {
	request: IRequest
	bucket: R2Bucket
	objectName: string
	context: ExecutionContext
}): Promise<Response> {
	// Check Cloudflare cache first
	const cacheKey = new Request(request.url, { headers: request.headers })
	const cachedResponse = await caches.default.match(cacheKey)
	if (cachedResponse) return cachedResponse

	// Fetch from R2 with range/conditional support
	const object = await bucket.get(objectName, {
		range: request.headers, // Support Range requests
		onlyIf: request.headers, // Support If-None-Match, etc.
	})

	if (!object) return notFound()

	const headers = new Headers()
	object.writeHttpMetadata(headers)

	// Immutable asset caching (1 year)
	headers.set('cache-control', 'public, max-age=31536000, immutable')
	headers.set('etag', object.httpEtag)
	headers.set('access-control-allow-origin', '*')

	// Handle Range responses
	if (object.range) {
		const contentRange = calculateContentRange(object)
		headers.set('content-range', contentRange)
	}

	const status = object.body ? (object.range ? 206 : 200) : 304

	// Cache successful responses
	if (status === 200) {
		const [cacheBody, responseBody] = object.body!.tee()
		context.waitUntil(caches.default.put(cacheKey, new Response(cacheBody, { headers, status })))
		return new Response(responseBody, { headers, status })
	}

	return new Response(object.body, { headers, status })
}
```

### Bookmark Processing (`bookmarks.ts`)

Web page metadata extraction with image optimization:

#### Metadata Extraction

```typescript
import { unfurl } from 'cloudflare-workers-unfurl'

const queryValidator = T.object({
	url: T.httpUrl, // Validate URL format
})

async function handleExtractBookmarkMetadataRequest({
	request,
	uploadImage,
}: {
	request: IRequest
	uploadImage?: UploadImage
}) {
	const url = parseRequestQuery(request, queryValidator).url

	const metadataResult = await unfurl(url)

	if (!metadataResult.ok) {
		switch (metadataResult.error) {
			case 'bad-param':
				throw new StatusError(400, 'Bad URL')
			case 'failed-fetch':
				throw new StatusError(422, 'Failed to fetch URL')
		}
	}

	const metadata = metadataResult.value

	// Optionally save optimized images
	if (uploadImage) {
		const id = crypto.randomUUID()
		await Promise.all([
			trySaveImage('image', metadata, id, 600, uploadImage), // 600px preview
			trySaveImage('favicon', metadata, id, 64, uploadImage), // 64px favicon
		])
	}

	return Response.json(metadata)
}
```

#### Image Optimization

```typescript
async function trySaveImage(
	key: 'image' | 'favicon',
	metadata: { [key]?: string },
	id: string,
	size: number,
	uploadImage: UploadImage
): Promise<void> {
	const initialUrl = metadata[key]
	if (!initialUrl) return

	try {
		// Cloudflare image optimization
		const imageResponse = await fetch(initialUrl, {
			cf: {
				image: {
					width: size,
					fit: 'scale-down',
					quality: 80,
				},
			},
		})

		if (!imageResponse.ok) throw new Error('Failed to fetch image')

		const contentType = imageResponse.headers.get('content-type')
		if (!contentType?.startsWith('image/')) {
			throw new Error('Not an image')
		}

		// Upload optimized image
		const objectName = `bookmark-${key}-${id}`
		metadata[key] = await uploadImage(imageResponse.headers, imageResponse.body, objectName)
	} catch (error) {
		console.error(`Error saving ${key}:`, error)
		// Graceful degradation - keep original URL
	}
}
```

### Error Monitoring (`sentry.ts`)

Sentry integration for production error tracking:

#### Sentry Configuration

```typescript
import { Toucan } from 'toucan-js'

interface SentryEnvironment {
	readonly SENTRY_DSN?: string
	readonly TLDRAW_ENV?: string
	readonly WORKER_NAME?: string
	readonly CF_VERSION_METADATA?: WorkerVersionMetadata
}

function createSentry(ctx: Context, env: SentryEnvironment, request?: Request) {
	// Skip Sentry in development
	if (!env.SENTRY_DSN && env.TLDRAW_ENV === 'development') {
		return null
	}

	const { SENTRY_DSN, WORKER_NAME, CF_VERSION_METADATA } = requiredEnv(env, {
		SENTRY_DSN: true,
		WORKER_NAME: true,
		CF_VERSION_METADATA: true,
	})

	return new Toucan({
		dsn: SENTRY_DSN,
		release: `${WORKER_NAME}.${CF_VERSION_METADATA.id}`, // Worker version tracking
		environment: WORKER_NAME,
		context: ctx,
		request,
		requestDataOptions: {
			allowedHeaders: ['user-agent'],
			allowedSearchParams: /(.*)/,
		},
	})
}
```

### Environment Management (`env.ts`)

Type-safe environment variable handling:

```typescript
function requiredEnv<T extends object>(
	env: T,
	keys: { [K in keyof T]: true }
): { [K in keyof T]-?: NonNullable<T[K]> } {
	for (const key of Object.keys(keys)) {
		if (getOwnProperty(env, key) === undefined) {
			throw new Error(`Missing required env var: ${key}`)
		}
	}
	return env as any
}

// Usage example
const { SENTRY_DSN, API_KEY } = requiredEnv(env, {
	SENTRY_DSN: true,
	API_KEY: true,
})
// TypeScript guarantees these are non-null
```

### HTTP Error Utilities (`errors.ts`)

Standard HTTP error responses:

```typescript
function notFound() {
	return Response.json({ error: 'Not found' }, { status: 404 })
}

function forbidden() {
	return Response.json({ error: 'Forbidden' }, { status: 403 })
}
```

## Key Features

### Asset Pipeline

**R2 Integration**: Cloudflare R2 object storage for user assets
**Caching Strategy**: Multi-layer caching with Cloudflare Cache API
**Range Requests**: Support for partial content delivery
**Immutable Assets**: Long-term caching for uploaded content

### Bookmark System

**Metadata Extraction**: Rich preview data from web pages
**Image Optimization**: Automatic image resizing and quality optimization
**Fallback Handling**: Graceful degradation when image processing fails
**Multi-Size Support**: Different image sizes for different use cases

### Error Handling

**Structured Errors**: Consistent error response format
**Monitoring Integration**: Automatic error reporting to Sentry
**Graceful Degradation**: Fallback behavior for non-critical failures
**Development Safety**: Sentry disabled in development mode

### Performance

**Edge Computing**: Optimized for Cloudflare Workers runtime
**Streaming Support**: Efficient handling of large uploads/downloads
**Cache Integration**: Leverages Cloudflare's global cache network
**Minimal Dependencies**: Lightweight for fast cold starts

## Integration Patterns

### Basic Worker Setup

```typescript
import {
	createRouter,
	handleApiRequest,
	createSentry,
	handleUserAssetUpload,
	handleExtractBookmarkMetadataRequest,
} from '@tldraw/worker-shared'

const router = createRouter<Env, ExecutionContext>()

router.post('/api/uploads/:objectName', async (request, env, ctx) => {
	return handleUserAssetUpload({
		objectName: request.params.objectName,
		bucket: env.UPLOADS_BUCKET,
		body: request.body,
		headers: request.headers,
	})
})

router.get('/api/bookmark', async (request, env, ctx) => {
	return handleExtractBookmarkMetadataRequest({
		request,
		uploadImage: async (headers, body, objectName) => {
			await handleUserAssetUpload({ objectName, bucket: env.ASSETS_BUCKET, body, headers })
			return `https://assets.tldraw.com/${objectName}`
		},
	})
})

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		return handleApiRequest({
			router,
			request,
			env,
			ctx,
			after: (response) => {
				// Add CORS headers, rate limiting, etc.
				response.headers.set('access-control-allow-origin', '*')
				return response
			},
		})
	},
}
```

### Asset Upload Flow

```typescript
// 1. Client uploads asset
const formData = new FormData()
formData.append('file', file)

const response = await fetch('/api/uploads/asset-uuid', {
	method: 'POST',
	body: formData,
})

// 2. Worker processes upload
const { object } = await response.json()
// object === 'asset-uuid'

// 3. Client references asset
const assetUrl = `https://assets.tldraw.com/${object}`
```

### Bookmark Processing Flow

```typescript
// 1. Client requests bookmark metadata
const response = await fetch(`/api/bookmark?url=${encodeURIComponent(pageUrl)}`)

// 2. Worker extracts metadata
const metadata = await unfurl(url) // Title, description, image, favicon

// 3. Worker optimizes images
await Promise.all([
	trySaveImage('image', metadata, id, 600, uploadImage), // Preview image
	trySaveImage('favicon', metadata, id, 64, uploadImage), // Icon
])

// 4. Client receives processed metadata
const { title, description, image, favicon } = await response.json()
```

## Cloudflare Workers Integration

### R2 Storage Integration

```typescript
interface Env {
	UPLOADS_BUCKET: R2Bucket
	ASSETS_BUCKET: R2Bucket
}

// Upload to R2
await bucket.put(objectName, body, {
	httpMetadata: headers, // Preserve original headers
})

// Retrieve from R2 with caching
const object = await bucket.get(objectName, {
	range: request.headers, // Support Range requests
	onlyIf: request.headers, // Support conditional requests
})
```

### Image Optimization

```typescript
// Cloudflare Image Resizing
const imageResponse = await fetch(imageUrl, {
	cf: {
		image: {
			width: 600,
			fit: 'scale-down',
			quality: 80,
		},
	},
})
```

### Cache API Integration

```typescript
// Leverage Cloudflare's global cache
const cacheKey = new Request(request.url, { headers: request.headers })
const cachedResponse = await caches.default.match(cacheKey)

if (cachedResponse) return cachedResponse

// ... generate response

// Cache for future requests
context.waitUntil(caches.default.put(cacheKey, response.clone()))
```

## Environment Management

### Type-Safe Environment Variables

```typescript
interface WorkerEnv {
	SENTRY_DSN?: string
	TLDRAW_ENV?: string
	WORKER_NAME?: string
	CF_VERSION_METADATA?: WorkerVersionMetadata
	API_BUCKET?: R2Bucket
}

// Validate required environment variables
const { SENTRY_DSN, WORKER_NAME } = requiredEnv(env, {
	SENTRY_DSN: true,
	WORKER_NAME: true,
})
// TypeScript guarantees these are defined
```

### Environment Validation

```typescript
function requiredEnv<T extends object>(
	env: T,
	keys: { [K in keyof T]: true }
): { [K in keyof T]-?: NonNullable<T[K]> } {
	for (const key of Object.keys(keys)) {
		if (getOwnProperty(env, key) === undefined) {
			throw new Error(`Missing required env var: ${key}`)
		}
	}
	return env as any
}
```

## Error Handling System

### Standard HTTP Errors

```typescript
// Common error responses
function notFound() {
	return Response.json({ error: 'Not found' }, { status: 404 })
}

function forbidden() {
	return Response.json({ error: 'Forbidden' }, { status: 403 })
}

// Validation errors
throw new StatusError(400, `Query parameters: ${validationMessage}`)
```

### Monitoring Integration

```typescript
// Automatic error reporting
try {
	// ... worker logic
} catch (error) {
	createSentry(ctx, env, request)?.captureException(error)
	return Response.json({ error: 'Internal server error' }, { status: 500 })
}
```

### Development vs Production

```typescript
// Sentry only in production
if (!env.SENTRY_DSN && env.TLDRAW_ENV === 'development') {
	return null // No Sentry in dev
}

// Production error tracking
const sentry = new Toucan({
	dsn: SENTRY_DSN,
	release: `${WORKER_NAME}.${CF_VERSION_METADATA.id}`,
	environment: WORKER_NAME,
})
```

## Performance Optimizations

### Edge Computing

- **Global Distribution**: Workers run at Cloudflare edge locations
- **Low Latency**: Processing close to users
- **Automatic Scaling**: Handles traffic spikes automatically
- **Zero Cold Starts**: V8 isolates for instant execution

### Caching Strategy

- **Multi-Layer Caching**: Browser cache + CDN cache + worker cache
- **Immutable Assets**: Assets cached for 1 year
- **Cache Invalidation**: ETags for conditional requests
- **Range Support**: Efficient partial content delivery

### Resource Efficiency

- **Streaming**: Support for large file uploads/downloads
- **Memory Management**: Efficient handling of binary data
- **Connection Pooling**: Reuse connections for external requests
- **Background Tasks**: Non-blocking asset processing

## Security Considerations

### Input Validation

- **URL Validation**: Ensure valid HTTP/HTTPS URLs for bookmarks
- **File Type Validation**: Verify content types for uploads
- **Size Limits**: Prevent abuse with file size restrictions
- **Path Sanitization**: Secure object naming patterns

### Access Control

- **CORS Configuration**: Controlled cross-origin access
- **Authentication**: Integration with auth systems
- **Rate Limiting**: Prevent API abuse
- **Error Information**: Careful error message disclosure

### Content Safety

- **Image Processing**: Automatic optimization prevents malicious images
- **Metadata Scrubbing**: Remove sensitive information from extracted data
- **Sandbox Execution**: Workers isolated from sensitive systems
- **Monitoring**: Comprehensive error and security event tracking

## Deployment Architecture

### Worker Distribution

```
Edge Locations (Global)
├── bemo-worker          # Multiplayer sync worker
├── dotcom-worker        # Main app API worker
├── assets-worker        # Asset serving worker
└── bookmark-worker      # Bookmark processing worker
    └── worker-shared/   # Shared utilities (this package)
```

### Service Integration

- **R2 Storage**: Asset persistence and delivery
- **Cache API**: Performance optimization
- **Analytics**: Request and error monitoring
- **CDN**: Global content delivery network

## Key Benefits

### Development Experience

- **Type Safety**: Full TypeScript support for worker development
- **Reusable Patterns**: Common worker utilities abstracted
- **Error Handling**: Comprehensive error management system
- **Testing Support**: Jest configuration for worker code

### Operations

- **Monitoring**: Automatic error reporting and analytics
- **Performance**: Edge computing with global distribution
- **Reliability**: Graceful error handling and fallbacks
- **Scaling**: Automatic traffic handling and resource management

### Maintenance

- **Shared Code**: Consistent patterns across all workers
- **Environment Management**: Type-safe configuration handling
- **Dependency Management**: Minimal, focused dependencies
- **Deployment**: Streamlined worker deployment workflows
