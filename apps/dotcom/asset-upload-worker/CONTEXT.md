# @dotcom/asset-upload-worker

Cloudflare Worker for handling user asset uploads and serving images for tldraw.com.

## Overview

A lightweight Cloudflare Worker that provides asset upload and retrieval services for the tldraw.com web application. It handles image uploads to Cloudflare R2 storage and serves them back with proper caching, enabling users to import and work with images in their tldraw documents.

## Architecture

### Tech stack

- **Runtime**: Cloudflare Workers (V8 isolates)
- **Storage**: Cloudflare R2 (S3-compatible object storage)
- **Router**: itty-router for request routing
- **Shared Logic**: @tldraw/worker-shared package
- **Analytics**: Cloudflare Analytics Engine for telemetry

### Infrastructure

- **Edge Computing**: Deployed globally on Cloudflare's edge network
- **Caching**: Cloudflare Cache API for optimized asset delivery
- **CORS**: Full CORS support for cross-origin requests
- **Multi-Environment**: dev, preview, staging, production deployments

## Core functionality

### Asset upload (`POST /uploads/:objectName`)

- Accepts image files via POST requests
- Stores assets in Cloudflare R2 buckets
- Returns object metadata and ETags
- Prevents duplicate uploads (409 if exists)
- Preserves HTTP metadata (content-type, etc.)

### Asset retrieval (`GET /uploads/:objectName`)

- Serves uploaded assets from R2 storage
- Implements automatic caching via Cloudflare Cache API
- Supports HTTP range requests for partial content
- Handles conditional requests (If-None-Match, etc.)
- Returns 404 for non-existent assets

### Request flow

```
Client Request → Cloudflare Edge → Worker → R2 Storage
             ← Cache Layer   ← Worker ← R2 Response
```

## Environment configuration

### Development (`dev`)

- Worker Name: `tldraw-assets-dev`
- R2 Bucket: `uploads-preview`
- Local development on port 8788
- Persists assets to `tmp-assets/` directory

### Preview/Staging (`preview`/`staging`)

- Worker Name: `main-tldraw-assets` (staging)
- R2 Bucket: `uploads-preview` (shared preview bucket)
- Uses Cloudflare Workers subdomain

### Production (`production`)

- Worker Name: `tldraw-assets`
- R2 Bucket: `uploads` (dedicated production bucket)
- Custom Domain: `assets.tldraw.xyz`
- Zone: `tldraw.xyz`

## Storage lStructure

### R2 buckets

- **uploads-preview**: Development, preview, and staging assets
- **uploads**: Production assets only
- **Object Names**: Client-generated unique identifiers
- **Metadata**: Preserved HTTP headers (content-type, etc.)

### Caching strategy

- **Cloudflare Cache**: Automatic edge caching for GET requests
- **Cache Keys**: Full URL with headers for proper invalidation
- **Range Support**: Efficient streaming for large assets
- **ETag Headers**: For conditional requests and validation

## Worker lImplementation

### Entry point (`src/worker.ts`)

```typescript
export default class Worker extends WorkerEntrypoint<Environment> {
  readonly router = createRouter<Environment>()
    .all('*', preflight)                    // CORS preflight
    .get('/uploads/:objectName', ...)       // Asset retrieval
    .post('/uploads/:objectName', ...)      // Asset upload
    .all('*', notFound)                     // 404 fallback
}
```

### Environment interface (`src/types.ts`)

- **UPLOADS**: R2Bucket binding for asset storage
- **CF_VERSION_METADATA**: Worker version information
- **TLDRAW_ENV**: Environment identifier
- **SENTRY_DSN**: Error tracking configuration
- **MEASURE**: Analytics Engine binding

## Shared lDependencies

### @tldraw/worker-shared

Provides common functionality across all tldraw workers:

- **handleUserAssetUpload**: Upload logic with duplicate prevention
- **handleUserAssetGet**: Retrieval logic with caching
- **handleApiRequest**: Common request processing
- **createRouter**: Router setup with middleware
- **CORS handling**: Cross-origin request support

### Key lFunctions

- Upload validation and R2 storage operations
- Cache-aware asset retrieval with range support
- Error handling and response formatting
- Analytics integration for monitoring

## Security considerations

### Access control

- **CORS**: Configured for cross-origin requests (`origin: '*'`)
- **Object Names**: Client-controlled, requires proper validation
- **Upload Limits**: Inherits Cloudflare Worker size limits
- **Content Types**: Preserves but doesn't validate file types

### Data isolation

- **Environment Separation**: Separate buckets for dev/preview/production
- **No Authentication**: Public upload/retrieval (relies on object name secrecy)
- **Analytics**: Basic request telemetry via Analytics Engine

## Development workflow

### Local development

```bash
yarn dev  # Starts local worker with R2 persistence
```

- Uses Wrangler dev server on port 8788
- Persists uploads to local `tmp-assets/` directory
- Inspector available on port 9449
- Hot reload on source changes

### Testing

```bash
yarn test        # Run unit tests
yarn test-ci     # CI test runner
yarn lint        # Code quality checks
```

### Deployment

- **Automatic**: Via CI/CD pipeline
- **Manual**: Using Wrangler CLI
- **Environment-specific**: Different names/buckets per environment
- **Version Metadata**: Automatic version tracking

## Usage lIntegration

### Client integration

```typescript
// Upload asset
const response = await fetch(`${WORKER_URL}/uploads/${objectName}`, {
	method: 'POST',
	body: file,
	headers: { 'Content-Type': file.type },
})

// Retrieve asset
const imageUrl = `${WORKER_URL}/uploads/${objectName}`
```

### tldraw.com Integration

- **Image Import**: Users can upload images to canvas
- **Asset Management**: Temporary storage for session assets
- **Performance**: Edge-cached delivery for global users
- **Reliability**: R2 durability and redundancy

## Monitoring & analytics

### Analytics engine

- **Request Metrics**: Upload/retrieval counts and latency
- **Error Tracking**: Failed requests and error rates
- **Performance**: Response times and cache hit rates
- **Usage Patterns**: Popular asset types and sizes

### Observability

- **Cloudflare Dashboard**: Worker metrics and logs
- **Sentry Integration**: Error reporting and alerting
- **Version Tracking**: Deployment metadata and rollback capability

## Limitations & considerations

### Size constraints

- **Worker Limit**: 25MB request body size (Cloudflare limit)
- **Asset Types**: No server-side validation of file types
- **Concurrency**: Limited by Cloudflare Worker isolate model

### Retention

- **No Cleanup**: Assets persist indefinitely once uploaded
- **No Versioning**: Object names must be unique per upload
- **No Metadata**: Minimal asset information beyond HTTP headers

## Related lServices

### Companion workers

- **sync-worker**: Real-time collaboration backend
- **image-resize-worker**: Asset transformation and optimization

### Integration points

- **tldraw.com client**: Primary consumer of upload/retrieval APIs
- **R2 Storage**: Shared storage infrastructure
- **Cloudflare Cache**: Global content delivery network

This worker provides essential asset management capabilities for tldraw.com, enabling users to work with images while maintaining global performance and reliability through Cloudflare's edge infrastructure.
