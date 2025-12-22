---
title: Asset pipeline
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - assets
  - images
  - uploads
  - storage
  - pipeline
---

The asset pipeline controls how images, videos, and other external media are stored and served. An asset is a record that points to a file; by default, tldraw stores file data as base64 inside the document, but you can provide a `TLAssetStore` to upload files and resolve optimized URLs.

## Key components

### TLAssetStore

A `TLAssetStore` provides two functions: `upload` writes the file to your storage and returns an updated asset record, and `resolve` returns the URL to render:

```typescript
const assetStore: TLAssetStore = {
	async upload(asset, file) {
		const response = await fetch('/api/upload', {
			method: 'POST',
			body: file,
		})
		const { url } = await response.json()

		return {
			...asset,
			props: { ...asset.props, src: url },
		}
	},

	async resolve(asset, context) {
		return asset.props.src
	},
}
```

### Asset records

Assets are stored as records in the Store, alongside shapes and pages. Shapes that reference assets keep a pointer to the asset record rather than embedding the binary payload.

## Data flow

1. The user drops or pastes a file on the canvas.
2. The editor creates an asset record and calls `assetStore.upload`.
3. The upload returns a new asset record with storage metadata.
4. A shape references the asset record.
5. Rendering calls `assetStore.resolve` to get the display URL.

## Extension points

- Use `resolve` to serve size-appropriate images based on zoom and device pixel ratio.
- Add custom asset types for bookmarks or embeds.
- Enforce authentication or signed URLs inside `upload` and `resolve`.

## Key files

- packages/editor/src/lib/editor/types/external-content.ts - Asset and content types
- packages/tldraw/src/lib/defaultExternalContentHandlers.ts - Default upload handlers
- apps/dotcom/asset-upload-worker/ - Production R2 upload worker

## Related

- [Asset upload worker](../infrastructure/asset-upload-worker.md) - R2 upload service
- [@tldraw/editor](../packages/editor.md) - External content handling
