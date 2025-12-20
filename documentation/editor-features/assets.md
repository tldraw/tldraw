---
title: Assets
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - assets
  - images
  - videos
  - bookmarks
  - files
  - upload
  - media
  - storage
---

## Overview

The assets system manages external resources like images, videos, and bookmarks that shapes display on the canvas. Assets are stored as separate records in the store and referenced by ID from shapes, enabling efficient reuse of the same resource across multiple shapes. This separation allows tldraw to handle large media files independently from the shape data structure, supporting custom storage backends and dynamic URL resolution based on render context.

The system handles three core asset types (image, video, bookmark) and provides hooks for uploading files to storage, resolving asset URLs for rendering, and cleaning up unused assets. Each asset record contains metadata about the resource (dimensions, MIME type, source URL) while the actual file data lives in your chosen storage backend.

## How it works

### Asset records and the store

Assets are document-scoped records stored in the tldraw store alongside shapes and pages. Each asset record contains metadata but not the actual file content. The asset system uses a two-part architecture: the asset record in the store tracks metadata and references, while the TLAssetStore interface handles file storage operations.

When a user drops an image onto the canvas, tldraw creates both an asset record (with dimensions and metadata) and a shape record (with position and size). The shape references the asset by ID through its `assetId` property. Multiple shapes can reference the same asset, so deleting one image shape doesn't remove the underlying asset if other shapes still need it.

Asset records include a `props` object containing type-specific properties and a `meta` object for custom metadata. The props structure differs for each asset type but always includes a `src` property that stores the URL returned by the upload handler. This URL can be a remote HTTP URL, a data URL for inline content, or any string your resolve handler can interpret.

### Asset types

The system defines three built-in asset types, each with specific properties and use cases.

**Image assets** represent raster images like PNG, JPEG, or GIF files. They store width, height, MIME type, animation status, and an optional file size. The `isAnimated` property indicates whether the image contains animation (true for GIFs with multiple frames). Image assets are used by image shapes and can be cropped, flipped, or resized independently of the underlying asset data.

```typescript
const imageAsset: TLImageAsset = {
	id: 'asset:image123',
	typeName: 'asset',
	type: 'image',
	props: {
		w: 1920,
		h: 1080,
		name: 'photo.jpg',
		isAnimated: false,
		mimeType: 'image/jpeg', // string | null
		src: 'https://storage.example.com/uploads/photo.jpg', // string | null
		fileSize: 245000, // optional
	},
	meta: {},
}
```

**Video assets** represent video files like MP4 or WebM. They share the same property structure as image assets (dimensions, MIME type, source URL) and include the `isAnimated` property which is typically true for videos. Video assets are used by video shapes to display playable video content on the canvas.

**Bookmark assets** represent web page previews created from URLs. They store the page title, description, preview image URL, favicon URL, and source URL. When a user pastes a URL, tldraw can fetch metadata from the page and create a bookmark asset that renders as a preview card.

```typescript
const bookmarkAsset: TLBookmarkAsset = {
	id: 'asset:bookmark1',
	typeName: 'asset',
	type: 'bookmark',
	props: {
		title: 'Example Website',
		description: 'A great example of web design',
		image: 'https://example.com/preview.jpg',
		favicon: 'https://example.com/favicon.ico',
		src: 'https://example.com',
	},
	meta: {},
}
```

### The TLAssetStore interface

The TLAssetStore interface defines how tldraw interacts with your storage backend. You provide an implementation when creating the editor store, and tldraw calls your handlers when users add or access assets. The interface has three methods: upload, resolve, and remove.

The **upload** method receives an asset record (with metadata already filled in) and the File object to be stored. Your implementation uploads the file to your storage backend and returns the URL where it can be accessed. This URL gets stored in the asset's `src` property. You can also return custom metadata in the `meta` field, which gets merged into the asset record. The upload method receives an optional AbortSignal for cancellation support.

The **resolve** method receives an asset record and a context object describing how the asset is being used. It returns the URL to use when rendering this asset. This allows dynamic URL transformation based on viewport scale, device pixel ratio, network conditions, and whether the asset is being exported. You might return an optimized thumbnail URL when the asset is zoomed out, or the original URL when exporting. The method can return a string URL, null if the asset is unavailable, or a promise that resolves to either.

The **remove** method receives an array of asset IDs that are no longer needed. This is called when the user deletes assets from the editor. Your implementation should clean up the stored files to free storage space. This method is optional - if not provided, tldraw won't attempt cleanup.

Here's a minimal TLAssetStore implementation that converts files to data URLs:

```typescript
const assetStore: TLAssetStore = {
	async upload(asset, file) {
		const dataUrl = await fileToDataUrl(file)
		return { src: dataUrl }
	},

	resolve(asset, ctx) {
		return asset.props.src
	},
}
```

### The TLAssetContext

When resolving asset URLs, tldraw provides a TLAssetContext object describing the current render environment. This allows your resolve handler to optimize asset delivery based on how the asset is actually being displayed.

The `screenScale` property indicates how much the asset has been scaled relative to its native dimensions. If an 1000px wide image is rendered at 500px due to shape resizing and zoom, screenScale is 0.5. The `steppedScreenScale` rounds this to the nearest power of 2, making it easier to implement tiered caching strategies.

The `dpr` property provides the device pixel ratio. On a retina display this might be 2 or 3. Combined with screenScale, this determines the optimal resolution to serve.

The `networkEffectiveType` property exposes the browser's network connection type ('slow-2g', '2g', '3g', '4g') when available. Use this to serve lower-quality assets on slow connections.

The `shouldResolveToOriginal` property indicates whether the asset URL is needed for export or copy-paste. When true, your handler should return the highest-quality version available, regardless of current viewport conditions.

## Key components

### Editor asset methods

The Editor class provides methods for managing assets in the store.

**createAssets** accepts an array of asset records and adds them to the store. Assets are created outside the undo/redo history since they're typically created as part of larger operations like pasting images.

**updateAssets** accepts an array of partial asset records and updates the corresponding assets. You only need to provide the ID and the properties you want to change.

**deleteAssets** accepts an array of asset IDs or asset records and removes them from the store. This also calls the TLAssetStore remove handler if provided.

**getAsset** retrieves a single asset by ID or asset record. Returns undefined if the asset doesn't exist. Accepts a type parameter for type-safe access to specific asset types.

**getAssets** returns an array of all assets currently in the store.

**resolveAssetUrl** resolves an asset ID to a URL suitable for rendering. This calls your TLAssetStore resolve handler with the current viewport context. Returns null if the asset doesn't exist or if the resolve handler returns null.

### Shape and asset relationships

Shapes reference assets through an `assetId` property in their props. Image shapes, video shapes, and bookmark shapes all follow this pattern. The shape stores its own properties like position, size, rotation, and crop settings, while the asset stores the media metadata and source URL.

When a shape references an asset, tldraw automatically tracks this relationship. The editor can query which assets are currently used by shapes in the document. When you delete an asset, any shapes referencing it will typically fall back to showing the URL directly or display a placeholder.

This separation enables several important features. You can update an asset's source URL and all shapes referencing it will immediately reflect the change. You can reuse the same asset across multiple shapes without duplicating storage. You can implement lazy loading where assets are only fetched when their shapes are visible.

## Extension points

### Custom storage backends

Implement TLAssetStore to integrate with any storage backend. For local development, convert files to data URLs or store them in memory. For production applications, upload to S3, Google Cloud Storage, or your own API.

When implementing upload, consider generating unique filenames to avoid collisions, validating file types and sizes before accepting uploads, and handling upload failures gracefully. The asset record already exists when upload is called, so you may need to update it with the final URL.

When implementing resolve, consider implementing tiered asset optimization with multiple resolutions, adding authentication tokens to URLs for private content, and leveraging CDN features like automatic image optimization. The context parameter provides everything needed to make intelligent caching decisions.

### Custom asset types

While tldraw provides three built-in asset types, you can extend the system with custom asset types using discriminated unions. Define a custom asset interface extending TLBaseAsset with your type string and props structure. Create a validator using createAssetValidator. Update the TLAsset union type to include your custom type. Implement shapes that reference your custom assets using the assetId pattern.

Custom asset types must follow the same storage lifecycle as built-in types, with upload, resolve, and remove handlers supporting them. Your custom shapes are responsible for interpreting the asset data and rendering it appropriately.

### Asset validation and migrations

Asset records use the migration system to evolve their schema over time. Each asset type has its own migration sequence that handles adding properties, renaming fields, and validating data. When you load a document with old asset records, migrations automatically transform them to the current schema.

Validators ensure asset data conforms to the expected structure at runtime. The assetValidator uses a discriminated union on the type field to validate each asset type appropriately. If you're implementing custom asset types, create validators following the same pattern and add proper migration sequences.

## Examples

- **[Hosted images](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/hosted-images)** - Handle images uploaded by the user by creating a TLAssetStore that manages uploaded assets.
- **[Local images](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/local-images)** - Create an image shape using a local asset by first creating an asset record, then creating a shape that references it.
- **[Local videos](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/local-videos)** - Create a video shape using a local asset by creating a TLVideoAsset and adding a VideoShape to the canvas.
- **[Asset options](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/asset-props)** - Control which asset types are allowed, maximum size, and maximum dimensions using Tldraw component props.
- **[Static assets](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/static-assets)** - Use custom fonts and icons by pre-loading static assets with the Tldraw component.

## Key files

- packages/tlschema/src/records/TLAsset.ts - Asset record type union and validators
- packages/tlschema/src/assets/TLBaseAsset.ts - Base asset interface and validator factory
- packages/tlschema/src/assets/TLImageAsset.ts - Image asset type and migrations
- packages/tlschema/src/assets/TLVideoAsset.ts - Video asset type and migrations
- packages/tlschema/src/assets/TLBookmarkAsset.ts - Bookmark asset type and migrations
- packages/tlschema/src/TLStore.ts - TLAssetStore interface and TLAssetContext
- packages/editor/src/lib/editor/Editor.ts - Asset management methods
- packages/editor/src/lib/editor/types/external-content.ts - External content and asset types

## Related

- [External content handling](./external-content.md)
- [Store and records](./store.md)
