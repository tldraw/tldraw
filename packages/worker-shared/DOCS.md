# @tldraw/worker-shared

The @tldraw/worker-shared package provides common utilities and handlers for Cloudflare Workers used across the tldraw infrastructure. It handles API routing, error responses, asset management, bookmark metadata extraction, and Sentry integration for worker environments.

## 1. Introduction

This package contains shared functionality designed specifically for Cloudflare Workers. It provides a structured approach to building APIs with proper error handling, request routing, and asset management capabilities. The utilities are designed to work seamlessly with Cloudflare's R2 storage, Sentry error tracking, and the Worker runtime environment.

**Key capabilities:**

- Type-safe API routing with `itty-router`
- Unified error handling and status responses
- Asset upload and retrieval with caching
- Bookmark metadata extraction with image processing
- Sentry integration for error tracking

## 2. Core Components

### API Request Handling

The package provides utilities for creating robust API handlers with proper error handling and routing.

```ts
import { createRouter, handleApiRequest, parseRequestQuery } from '@tldraw/worker-shared'
import { T } from '@tldraw/validate'

// Create a type-safe router
const router = createRouter<Env, ExecutionContext>()

// Add routes with typed handlers
router.get('/api/health', () => {
	return Response.json({ status: 'ok' })
})

// Handle requests with automatic error handling
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		return handleApiRequest({
			router,
			request,
			env,
			ctx,
			after: (response) => {
				// Add CORS headers or other post-processing
				response.headers.set('Access-Control-Allow-Origin', '*')
				return response
			},
		})
	},
}
```

The `handleApiRequest` function automatically:

- Catches and formats errors with proper HTTP status codes
- Integrates with Sentry for error reporting
- Applies post-processing through the `after` callback

### Query and Body Validation

Parse and validate request parameters using tldraw's validation system:

```ts
import { parseRequestQuery } from '@tldraw/worker-shared'
import { T } from '@tldraw/validate'

const queryValidator = T.object({
	url: T.httpUrl,
	limit: T.number.optional(),
})

router.get('/api/process', (request) => {
	// Automatically validates and throws 400 errors for invalid input
	const { url, limit } = parseRequestQuery(request, queryValidator)

	console.log(url) // Guaranteed to be a valid HTTP URL
	console.log(limit) // number | undefined

	return Response.json({ processed: url })
})
```

## 3. Error Handling

### Standard Error Responses

The package provides consistent error response utilities:

```ts
import { notFound, forbidden } from '@tldraw/worker-shared'

router.get('/api/resource/:id', (request) => {
	const { id } = request.params

	if (!hasPermission(id)) {
		return forbidden() // Returns 403 with standard error format
	}

	const resource = getResource(id)
	if (!resource) {
		return notFound() // Returns 404 with standard error format
	}

	return Response.json(resource)
})
```

Both functions return standardized JSON error responses:

- `forbidden()`: `{ "error": "Forbidden" }` with status 403
- `notFound()`: `{ "error": "Not found" }` with status 404

### Sentry Integration

Error tracking is automatically configured when environment variables are present:

```ts
import { createSentry } from '@tldraw/worker-shared'

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		// Sentry is automatically initialized in handleApiRequest
		// Or create manually for custom error handling
		const sentry = createSentry(ctx, env, request)

		try {
			// Your worker logic
		} catch (error) {
			sentry?.captureException(error)
			throw error
		}
	},
}
```

The Sentry integration requires these environment variables:

- `SENTRY_DSN`: Your Sentry project DSN
- `WORKER_NAME`: Name of the worker for release tracking
- `CF_VERSION_METADATA`: Cloudflare version metadata for releases

## 4. Asset Management

### Upload Handling

Handle asset uploads to Cloudflare R2 with conflict detection:

```ts
import { handleUserAssetUpload } from '@tldraw/worker-shared'

router.put('/assets/:objectName', async (request, env) => {
	const { objectName } = request.params

	return handleUserAssetUpload({
		objectName,
		bucket: env.ASSETS_BUCKET, // Your R2 bucket binding
		body: request.body,
		headers: request.headers,
	})
})
```

The upload handler:

- Checks for existing assets (returns 409 if exists)
- Stores the asset with HTTP metadata
- Returns JSON with object name and ETag

### Asset Retrieval with Caching

Serve assets with automatic caching and range request support:

```ts
import { handleUserAssetGet } from '@tldraw/worker-shared'

router.get('/assets/:objectName', async (request, env, ctx) => {
	const { objectName } = request.params

	return handleUserAssetGet({
		request,
		bucket: env.ASSETS_BUCKET,
		objectName,
		context: ctx,
	})
})
```

The retrieval handler provides:

- **Automatic caching**: Uses Cloudflare's cache API for performance
- **Range requests**: Supports partial content requests (206 responses)
- **CORS headers**: Allows cross-origin access to assets
- **Immutable caching**: Sets long-term cache headers for assets
- **Content-Range headers**: Properly handles byte range responses

## 5. Bookmark Metadata Extraction

### Basic Metadata Extraction

Extract metadata from web pages for bookmark creation:

```ts
import { handleExtractBookmarkMetadataRequest } from '@tldraw/worker-shared'

router.get('/api/bookmark', (request) => {
	return handleExtractBookmarkMetadataRequest({ request })
})

// Usage: GET /api/bookmark?url=https://example.com
// Returns: { title: "Example", description: "...", image: "...", favicon: "..." }
```

### Enhanced Extraction with Image Upload

For production use, provide image uploading to store optimized versions:

```ts
router.post('/api/bookmark', (request) => {
	return handleExtractBookmarkMetadataRequest({
		request,
		uploadImage: async (headers, body, objectName) => {
			// Store the processed image and return its URL
			await env.ASSETS_BUCKET.put(objectName, body, { httpMetadata: headers })
			return `https://assets.example.com/${objectName}`
		},
	})
})
```

When `uploadImage` is provided, the handler:

- Processes images through Cloudflare's image resizing
- Creates optimized versions (600px for main image, 64px for favicon)
- Replaces original URLs with your hosted versions
- Handles errors gracefully (logs but doesn't fail the request)

## 6. Integration Patterns

### Environment Configuration

Use the `requiredEnv` utility to validate required environment variables:

```ts
import { requiredEnv } from '@tldraw/worker-shared'

export interface Env {
	readonly DATABASE_URL?: string
	readonly API_KEY?: string
	readonly ASSETS_BUCKET: R2Bucket
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		// Throws clear error if variables are missing
		const config = requiredEnv(env, {
			DATABASE_URL: true,
			API_KEY: true,
		})

		// config.DATABASE_URL and config.API_KEY are guaranteed non-null
		console.log(`Connecting to ${config.DATABASE_URL}`)
	},
}
```

### Complete Worker Example

Here's a complete worker using all the shared utilities:

```ts
import {
	createRouter,
	handleApiRequest,
	handleUserAssetGet,
	handleUserAssetUpload,
	handleExtractBookmarkMetadataRequest,
	notFound,
} from '@tldraw/worker-shared'

export interface Env {
	readonly ASSETS_BUCKET: R2Bucket
	readonly SENTRY_DSN?: string
	readonly WORKER_NAME?: string
}

const router = createRouter<Env, ExecutionContext>()

// Asset management
router.put('/assets/:objectName', async (request, env) => {
	const { objectName } = request.params
	return handleUserAssetUpload({
		objectName,
		bucket: env.ASSETS_BUCKET,
		body: request.body,
		headers: request.headers,
	})
})

router.get('/assets/:objectName', async (request, env, ctx) => {
	const { objectName } = request.params
	return handleUserAssetGet({
		request,
		bucket: env.ASSETS_BUCKET,
		objectName,
		context: ctx,
	})
})

// Bookmark extraction
router.post('/api/bookmark', (request) => {
	return handleExtractBookmarkMetadataRequest({
		request,
		uploadImage: async (headers, body, objectName) => {
			await env.ASSETS_BUCKET.put(objectName, body, { httpMetadata: headers })
			return `https://assets.example.com/${objectName}`
		},
	})
})

// Fallback
router.all('*', () => notFound())

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		return handleApiRequest({
			router,
			request,
			env,
			ctx,
			after: (response) => {
				response.headers.set('Access-Control-Allow-Origin', '*')
				return response
			},
		})
	},
}
```

## 7. Type Safety

The package is built with TypeScript and provides full type safety:

### Router Types

```ts
import { ApiRouter, ApiRoute } from '@tldraw/worker-shared'

// Router type includes environment and context constraints
const router: ApiRouter<MyEnv, ExecutionContext> = createRouter()

// Route type ensures handlers match the expected signature
const getRoute: ApiRoute<MyEnv, ExecutionContext> = router.get
```

### SentryEnvironment Interface

Environment interfaces can extend `SentryEnvironment` for automatic Sentry integration:

```ts
import { SentryEnvironment } from '@tldraw/worker-shared'

interface MyEnv extends SentryEnvironment {
	readonly DATABASE_URL: string
	readonly ASSETS_BUCKET: R2Bucket
}
```

This ensures your environment has the necessary Sentry configuration properties while maintaining type safety for your custom variables.

> Note: All handlers are designed to work with Cloudflare Workers' execution model and integrate seamlessly with the Worker runtime environment.
