---
title: Asset pipeline
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - assets
  - images
  - uploads
  - storage
  - pipeline
---

This document explains how tldraw handles assets like images, videos, and files—from upload through storage to display.

## Overview

The asset pipeline manages:

- Uploading files from drag/drop, paste, or file picker
- Storing assets in external storage (R2, S3, etc.)
- Resolving asset URLs for display
- Optimizing images for performance

## Asset types

```typescript
interface TLAsset {
  id: TLAssetId
  typeName: 'asset'
  type: 'image' | 'video' | 'bookmark'
  props: TLImageAsset | TLVideoAsset | TLBookmarkAsset
  meta: JsonObject
}

interface TLImageAsset {
  name: string
  src: string           // URL or data URI
  w: number            // Original width
  h: number            // Original height
  mimeType: string | null
  isAnimated: boolean
  fileSize: number
}
```

## TLAssetStore interface

The `TLAssetStore` interface defines how assets are uploaded and resolved:

```typescript
interface TLAssetStore {
  // Upload a file and return the asset data
  upload: (asset: TLAsset, file: File) => Promise<TLAsset>

  // Resolve an asset's source URL
  resolve: (asset: TLAsset, context: TLAssetContext) => Promise<string | null>
}
```

### Basic implementation

```typescript
const assetStore: TLAssetStore = {
  async upload(asset, file) {
    // Upload to your storage
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: file,
    })
    const { url } = await response.json()

    return {
      ...asset,
      props: {
        ...asset.props,
        src: url,
      },
    }
  },

  async resolve(asset, context) {
    // Return the asset URL, potentially with transformations
    return asset.props.src
  },
}
```

### With image optimization

```typescript
const assetStore: TLAssetStore = {
  async upload(asset, file) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    const { id, originalUrl } = await response.json()

    return {
      ...asset,
      props: {
        ...asset.props,
        src: id, // Store ID, not full URL
      },
    }
  },

  async resolve(asset, context) {
    const { screenScale } = context

    // Request appropriately sized image
    const width = Math.ceil(asset.props.w * screenScale)

    return `/api/images/${asset.props.src}?w=${width}`
  },
}
```

## Asset context

The resolve function receives context about the current display:

```typescript
interface TLAssetContext {
  screenScale: number      // Current zoom level
  steppedScreenScale: number // Rounded scale for caching
  dpr: number              // Device pixel ratio
  networkEffectiveType: string | null
  shouldResolveToOriginal: boolean
}
```

Use this to serve appropriately sized images:

```typescript
async resolve(asset, context) {
  const { steppedScreenScale, dpr } = context

  // Calculate display size
  const displayWidth = asset.props.w * steppedScreenScale * dpr

  // Return optimized URL
  return `${asset.props.src}?w=${Math.ceil(displayWidth)}`
}
```

## Registering the asset store

```typescript
<Tldraw
  assetStore={assetStore}
/>
```

Or with `useSync`:

```typescript
const store = useSync({
  uri: 'ws://localhost:5172/room/123',
  assets: assetStore,
})
```

## Default behavior

Without a custom `assetStore`, tldraw:

1. Converts files to base64 data URIs
2. Stores them directly in the document
3. Works offline but increases document size

This is fine for small files but not recommended for production.

## Upload flow

```
User drops file
      ↓
Editor.putExternalContent({ type: 'files', files })
      ↓
External content handler processes file
      ↓
assetStore.upload(asset, file)
      ↓
Shape created with asset reference
      ↓
assetStore.resolve(asset, context) for display
```

## R2/S3 integration

Example with Cloudflare R2:

```typescript
// Upload endpoint
app.post('/api/upload', async (request, env) => {
  const file = await request.blob()
  const id = crypto.randomUUID()

  await env.ASSETS_BUCKET.put(id, file, {
    httpMetadata: {
      contentType: request.headers.get('content-type'),
    },
  })

  return Response.json({ id })
})

// Asset store
const assetStore: TLAssetStore = {
  async upload(asset, file) {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: file,
      headers: { 'content-type': file.type },
    })
    const { id } = await response.json()

    return {
      ...asset,
      props: { ...asset.props, src: id },
    }
  },

  async resolve(asset) {
    return `https://assets.example.com/${asset.props.src}`
  },
}
```

## Image optimization

### Resize on upload

```typescript
async upload(asset, file) {
  // Create multiple sizes
  const sizes = [256, 512, 1024, 2048]

  for (const size of sizes) {
    const resized = await resizeImage(file, size)
    await uploadToStorage(`${id}-${size}`, resized)
  }

  return { ...asset, props: { ...asset.props, src: id } }
}
```

### Resize on request

```typescript
async resolve(asset, context) {
  const targetWidth = Math.ceil(
    asset.props.w * context.steppedScreenScale * context.dpr
  )

  // Use image CDN with resize parameters
  return `https://cdn.example.com/${asset.props.src}?width=${targetWidth}&format=webp`
}
```

## Bookmarks and embeds

Non-file assets like bookmarks:

```typescript
interface TLBookmarkAsset {
  title: string
  description: string
  image: string      // Preview image URL
  favicon: string    // Site favicon URL
  src: string        // Original URL
}

// Fetch metadata for URLs
async function createBookmarkAsset(url: string) {
  const metadata = await fetchUrlMetadata(url)

  return {
    id: createAssetId(),
    type: 'bookmark',
    props: {
      title: metadata.title,
      description: metadata.description,
      image: metadata.image,
      favicon: metadata.favicon,
      src: url,
    },
  }
}
```

## Error handling

```typescript
const assetStore: TLAssetStore = {
  async upload(asset, file) {
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: file,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      return { ...asset, props: { ...asset.props, src: await response.text() } }
    } catch (error) {
      // Return asset with error state or placeholder
      console.error('Asset upload failed:', error)
      throw error
    }
  },

  async resolve(asset) {
    // Return fallback for missing assets
    if (!asset.props.src) {
      return '/placeholder.png'
    }
    return asset.props.src
  },
}
```

## Key files

- packages/editor/src/lib/editor/types/external-content.ts - Content types
- packages/tldraw/src/lib/defaultExternalContentHandlers.ts - Default handlers
- apps/dotcom/asset-upload-worker/ - R2 upload worker

## Related

- [Asset upload worker](../infrastructure/asset-upload-worker.md) - R2 upload service
- [Image resize worker](../infrastructure/image-resize-worker.md) - Image optimization
- [@tldraw/editor](../packages/editor.md) - External content handling
