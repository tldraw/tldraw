---
title: Asset upload worker
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - assets
  - upload
  - worker
  - cloudflare
  - r2
---

The asset upload worker handles file uploads and asset delivery for tldraw.com. It stores uploads in Cloudflare R2, serves them with edge caching, and supports range requests for large files.

## Key components

### Router and handlers

The worker uses shared handlers to upload and fetch objects from the R2 bucket:

```typescript
export default class Worker extends WorkerEntrypoint<Environment> {
	readonly router = createRouter<Environment>()
		.all('*', preflight)
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

### R2 storage

Uploads are stored in an R2 bucket bound as `UPLOADS`. Preview environments use a separate bucket.

## Data flow

1. Client uploads a file to `POST /uploads/:objectName`.
2. The worker writes the object to R2 with metadata.
3. Client requests the asset via `GET /uploads/:objectName`.
4. The worker serves the asset with cache headers and range support.

## API endpoints

- `POST /uploads/:objectName` - Upload a file, returns metadata and ETag.
- `GET /uploads/:objectName` - Retrieve a file with caching and range support.

## Operational notes

- Uses CORS for cross-origin access.
- No auth at the worker layer; object names must be unguessable.
- Cloudflare Workers limit upload size (25 MB default).

## Development workflow

```bash
yarn dev

yarn test
```

## Key files

- apps/dotcom/asset-upload-worker/src/worker.ts - Worker entry and routes
- apps/dotcom/asset-upload-worker/src/types.ts - Environment types
- apps/dotcom/asset-upload-worker/wrangler.toml - Deployment configuration

## Related

- [Image resize worker](./image-resize-worker.md)
- [Sync worker](./sync-worker.md)
- [@tldraw/worker-shared](../packages/worker-shared.md)
