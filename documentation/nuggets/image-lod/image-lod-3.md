---
title: Image level of detail
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - image
  - LOD
  - resolution
status: published
date: 12/21/2025
order: 2
---

# Image level of detail

When we built image handling for tldraw, we wanted to avoid loading full-resolution images when they're displayed small. A 4000×3000 photo downloaded for a 50px thumbnail wastes bandwidth and memory. But requesting different resolutions based on zoom introduces a problem—if you fetch a new version every time the camera moves, users see constant flickering and the network gets hammered.

Here's how we select appropriate resolutions while avoiding those problems.

## Network-aware resolution

We calculate the requested width using screen scale, device pixel ratio, and network speed:

```typescript
const networkCompensation =
	!context.networkEffectiveType || context.networkEffectiveType === '4g' ? 1 : 0.5

const width = Math.ceil(
	Math.min(
		asset.props.w *
			clamp(context.steppedScreenScale, 1 / 32, 1) *
			networkCompensation *
			context.dpr,
		asset.props.w
	)
)
```

The formula multiplies the native image width by:

- **Stepped screen scale**: The zoom level rounded to the nearest power of two (0.125, 0.25, 0.5, 1, 2, 4...)
- **Network compensation**: 1.0 for 4G or unknown, 0.5 for 3G or slower
- **Device pixel ratio**: Typically 1 for standard displays, 2+ for retina

The stepped scale prevents infinite URL variations—instead of requesting 500px, 503px, 506px as you zoom, we jump from 512px to 1024px. This improves cache hit rates across users and sessions.

Network compensation halves the resolution on slow connections. A shape that would request 1000px on 4G requests 500px on 3G. The `navigator.connection` API is only available in Chromium browsers—other browsers get the 4G default, which means they always fetch full quality.

We clamp the minimum scale to 1/32 (3.125%) to avoid requesting absurdly small images, and never request larger than the native resolution.

## Skip conditions

Several image types bypass transformation entirely:

**Videos** always use the original URL—we don't resize them:

```typescript
if (asset.type === 'video') return asset.props.src
```

**Animated images** can't be resized without losing animation. GIFs, animated PNGs, animated WebP, and animated AVIF all use their original URLs:

```typescript
if (MediaHelpers.isAnimatedImageType(asset?.props.mimeType) || asset.props.isAnimated)
	return asset.props.src
```

**Vector images** (SVG) scale infinitely without quality loss:

```typescript
if (MediaHelpers.isVectorImageType(asset?.props.mimeType)) return asset.props.src
```

**Small files** under 1.5MB skip resolution changes. The processing cost isn't worth it:

```typescript
const isWorthResizing = fileSize >= 1024 * 1024 * 1.5

if (!isWorthResizing) return asset.props.src
```

These files still go through the image worker for format optimization (AVIF/WebP conversion), just not resolution changes.

**External domains** aren't transformed. We only resize images hosted on tldraw-controlled domains:

```typescript
const isTldrawImage = isDevelopmentEnv || /\.tldraw\.(?:com|xyz|dev|workers\.dev)$/.test(url.host)

if (!isTldrawImage) return asset.props.src
```

**Exports** always use original resolution:

```typescript
if (context.shouldResolveToOriginal) return asset.props.src
```

When exporting, we ignore zoom level and fetch the full-resolution image for quality.

## Format negotiation

The server uses the `Accept` header to determine which format to serve:

```typescript
const accept = request.headers.get('Accept') ?? ''
const format = accept.includes('image/avif')
	? ('avif' as const)
	: accept.includes('image/webp')
		? ('webp' as const)
		: null
```

The priority order is AVIF (best compression, ~50% smaller than JPEG), then WebP (good compression, wider support), then original format. Browsers that support modern formats get them automatically—no feature detection or manual configuration needed.

Cache keys include format and width, so different browsers and zoom levels get appropriate versions without collisions.

## Where this lives

The client-side resolution calculation is in `apps/dotcom/client/src/utils/multiplayerAssetStore.ts`. The power-of-two stepping happens in `packages/editor/src/lib/editor/Editor.ts` in the `resolveAssetUrl` method. Format negotiation and transformation runs in the Cloudflare worker at `apps/dotcom/image-resize-worker/src/worker.ts`.

The network compensation factor is conservative—3G users get half resolution, everyone else gets full. We could add more granular levels (2G gets quarter resolution), but the `effectiveType` API doesn't provide enough detail to make that reliable. The current approach keeps it simple and works.
