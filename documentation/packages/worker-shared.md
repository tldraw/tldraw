---
title: '@tldraw/worker-shared'
created_at: 12/17/2024
updated_at: 12/20/2024
keywords:
  - worker
  - cloudflare
  - api
  - r2
  - edge
  - routing
  - assets
  - bindings
  - execution-context
---

The `@tldraw/worker-shared` package provides reusable infrastructure for building HTTP services on Cloudflare Workers. It centralizes common patterns across tldraw's edge worker services, including type-safe request routing, R2 asset storage with caching, bookmark metadata extraction with image optimization, error monitoring through Sentry, and environment validation.

Cloudflare Workers run JavaScript in V8 isolates at edge locations worldwide, providing instant cold starts and low-latency request handling without traditional servers or containers. Workers access resources through runtime-injected bindings (R2 buckets, KV namespaces, Durable Objects) rather than network connections, and have constraints including no filesystem access, limited memory, and CPU time limits. This package abstracts Workers-specific patterns - R2 integration, streaming responses, Cache API usage, execution context management, and resource bindings - into type-safe utilities that handle these edge runtime constraints.

## Architecture

The package consists of independent modules that compose together to create complete worker services. Each module handles a specific concern and exposes functions that accept Cloudflare Workers runtime types (Request, ExecutionContext, R2Bucket, etc.) as parameters.

### Module organization

**Request handling** (`handleRequest.ts`) - Type-safe router creation with itty-router, request parsing and validation using `@tldraw/validate`, centralized error handling with automatic Sentry reporting, and post-response processing hooks for adding headers or logging.

**Asset management** (`userAssetUploads.ts`) - R2 bucket integration for object storage, multi-layer caching using Cloudflare Cache API, HTTP range request support for streaming video and large files, duplicate detection to prevent overwrites, and streaming responses to minimize memory usage.

**Bookmark extraction** (`bookmarks.ts`) - Web page metadata extraction using `cloudflare-workers-unfurl` (Open Graph, Twitter Cards, standard meta tags), Cloudflare image optimization through `cf.image` fetch option, multi-size image generation (preview and favicon), R2 upload integration for processed images, and graceful fallback when image processing fails.

**Error monitoring** (`sentry.ts`) - Sentry client creation for production error tracking using `toucan-js`, automatic release tagging based on worker version metadata, development mode detection that disables Sentry locally, and execution context integration for request lifecycle tracking.

**Environment validation** (`env.ts`) - Type-safe environment variable extraction, compile-time guarantees for required configuration, runtime validation that throws on missing variables, and TypeScript utility types that remove optional/undefined from validated keys.

**Origin validation** (`origins.ts`) - Cross-origin request validation against allowed domain list, automatic same-origin request handling, middleware pattern for request blocking, and special case handling for authentication callbacks.

### Cloudflare Workers integration patterns

This package leverages several Cloudflare Workers-specific features that differ from traditional server environments.

**Resource bindings** - Workers receive resources through the environment object rather than creating connections. The router functions accept a generic `Env` type that extends `SentryEnvironment` and includes any additional bindings (R2Bucket, KVNamespace, DurableObjectNamespace). These bindings are injected by the runtime and don't count against CPU time limits.

**Execution context** - The `ExecutionContext` parameter provides lifecycle management through `waitUntil()`, which keeps the worker alive for background tasks even after returning a response. The asset handlers use this to populate cache asynchronously while streaming the response to the client.

**Cache API** - Workers access Cloudflare's global edge cache through `caches.default`. The asset retrieval handler checks this cache first before fetching from R2, then populates the cache for subsequent requests. Cache keys use the full request URL including query parameters and headers for proper cache isolation.

**Image optimization** - The `cf.image` fetch option processes images at Cloudflare's edge before the response reaches the worker. This happens outside the worker's CPU time budget and doesn't consume worker memory, making it efficient for transforming bookmark images.

**Streaming responses** - R2 objects return `ReadableStream` bodies that can be passed directly to Response constructors. The handlers use `tee()` to split streams when caching, allowing simultaneous cache population and client streaming without buffering the entire object in memory.

## Key concepts

### Type-safe routing with itty-router

The router system wraps itty-router with TypeScript generics that enforce type safety across all handlers. When you create a router with `createRouter<Env>()`, every route handler receives properly typed environment and context parameters. This prevents runtime errors from missing bindings or incorrect type assumptions.

Route handlers follow the signature `(request: IRequest, env: Env, ctx: Ctx) => Response | Promise<Response>`. The `IRequest` type from itty-router includes parsed URL parameters in `request.params` and query parameters in `request.query`, avoiding manual URL parsing.

### Request validation with @tldraw/validate

The parsing functions (`parseRequestQuery`, `parseRequestBody`) integrate with `@tldraw/validate` to provide type-safe input validation. You define a validator using `T.object()` with field types, then pass it to the parsing function. The parser returns typed data matching the validator schema, and automatically throws `StatusError` with 400 status for validation failures.

Validation errors include descriptive messages indicating which field failed and why, making debugging straightforward. The error responses follow a consistent JSON format with an `error` key containing the message.

### R2 storage and caching strategy

R2 provides S3-compatible object storage at Cloudflare's edge. The asset handlers implement a multi-layer caching strategy: browser cache (controlled by `cache-control` headers), Cloudflare edge cache (via Cache API), and R2 storage as the origin.

Assets use immutable cache headers (`max-age=31536000, immutable`) because objects never change after upload. This tells browsers and CDNs to cache indefinitely without revalidation, minimizing requests. The asset URLs include unique identifiers (typically UUIDs) to ensure cache isolation when creating new versions.

Range requests allow clients to request specific byte ranges, essential for video streaming and resumable downloads. The R2 `get()` method accepts `range` and `onlyIf` options that process HTTP headers (`Range`, `If-None-Match`, etc.) and return partial content or 304 Not Modified responses as appropriate.

### Execution context lifecycle

The `ExecutionContext.waitUntil()` method accepts a promise and extends the worker's lifetime until it resolves, even after returning the response. This enables background operations like cache population, analytics logging, and cleanup tasks without blocking the response.

The asset retrieval handler uses this to cache responses asynchronously. It splits the response stream with `tee()`, sends one stream to the client immediately, and uses `waitUntil()` to cache the other stream in the background. This pattern provides fast responses while warming the cache for subsequent requests.

### Error handling and monitoring

Errors follow a hierarchy. `StatusError` from itty-router represents expected errors with specific HTTP status codes (400 for validation, 404 for not found, etc.). The request handler catches these and converts them to appropriate JSON responses without reporting to Sentry.

Unexpected errors (anything not `StatusError`) become 500 Internal Server Error responses and get reported to Sentry with full request context. The `createSentry` function initializes a Sentry client configured for the Workers environment, including release tagging based on worker version metadata for deployment tracking.

Development environments (detected by `TLDRAW_ENV === 'development'` and missing `SENTRY_DSN`) skip Sentry initialization, allowing local testing without error reporting infrastructure.

## API patterns

### Basic worker setup

```typescript
import { createRouter, handleApiRequest } from '@tldraw/worker-shared'

interface Env extends SentryEnvironment {
	UPLOADS_BUCKET: R2Bucket
}

const router = createRouter<Env>()

router.get('/health', () => Response.json({ status: 'ok' }))

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
			},
		})
	},
}
```

### Validating request input

```typescript
import { T } from '@tldraw/validate'
import { parseRequestQuery } from '@tldraw/worker-shared'

const queryValidator = T.object({
	url: T.httpUrl,
	limit: T.number.optional(),
})

router.get('/api/process', (request) => {
	const { url, limit } = parseRequestQuery(request, queryValidator)
	return Response.json({ url, limit })
})
```

### Handling asset uploads

```typescript
import { handleUserAssetUpload } from '@tldraw/worker-shared'

router.put('/uploads/:objectName', async (request, env) => {
	return handleUserAssetUpload({
		objectName: request.params.objectName,
		bucket: env.UPLOADS_BUCKET,
		body: request.body,
		headers: request.headers,
	})
})
```

### Retrieving assets with caching

```typescript
import { handleUserAssetGet } from '@tldraw/worker-shared'

router.get('/assets/:objectName', async (request, env, ctx) => {
	return handleUserAssetGet({
		request,
		bucket: env.ASSETS_BUCKET,
		objectName: request.params.objectName,
		context: ctx,
	})
})
```

### Extracting bookmark metadata

```typescript
import { handleExtractBookmarkMetadataRequest } from '@tldraw/worker-shared'

router.post('/api/bookmark', (request, env) => {
	return handleExtractBookmarkMetadataRequest({
		request,
		uploadImage: async (headers, body, objectName) => {
			await env.ASSETS_BUCKET.put(objectName, body, { httpMetadata: headers })
			return `https://assets.tldraw.com/${objectName}`
		},
	})
})
```

### Validating environment variables

```typescript
import { requiredEnv } from '@tldraw/worker-shared'

const { DATABASE_URL, API_KEY } = requiredEnv(env, {
	DATABASE_URL: true,
	API_KEY: true,
})
// TypeScript now knows these are strings, not string | undefined
```

### Blocking unknown origins

```typescript
import { blockUnknownOrigins } from '@tldraw/worker-shared'

router.all('*', async (request, env) => {
	const blocked = await blockUnknownOrigins(request, env)
	if (blocked) return blocked
})
```

## Key files

- packages/worker-shared/src/index.ts - Package exports
- packages/worker-shared/src/handleRequest.ts - Router creation and request handling
- packages/worker-shared/src/userAssetUploads.ts - R2 asset upload and retrieval
- packages/worker-shared/src/bookmarks.ts - Bookmark metadata extraction
- packages/worker-shared/src/sentry.ts - Sentry error monitoring configuration
- packages/worker-shared/src/env.ts - Environment variable validation
- packages/worker-shared/src/origins.ts - Origin validation and CORS handling
- packages/worker-shared/src/errors.ts - HTTP error response utilities

## Related

- [Sync core](./sync-core.md) - Core multiplayer synchronization logic
- [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/) - Official Cloudflare Workers documentation
