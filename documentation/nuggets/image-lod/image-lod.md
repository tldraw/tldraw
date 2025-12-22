---
title: Image level of detail
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - image
  - lod
status: published
date: 12/21/2025
order: 4
---

# Image level of detail

Try loading a canvas with 200 high-resolution photos and you'll watch the browser choke. Network bandwidth evaporates. Memory fills up. The page becomes unresponsive. And for what? Most of those images appear as tiny thumbnails—downloading 4000×3000 photos to display them at 50×50 pixels is absurd. The naive solution is to always fetch full resolution, but that's wasteful. The slightly-less-naive solution is to fetch different resolutions based on zoom level, but done carelessly that causes flickering and excessive network requests on every camera movement.

tldraw uses a level-of-detail system that automatically loads appropriate image resolutions based on how large images actually appear on screen, with debouncing to prevent thrashing during camera movements.

## Screen scale determines resolution

The first step is calculating how large an image actually appears relative to its native dimensions. This combines the current zoom level with the image's display size:

```typescript
// packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts
const screenScale = editor.getEfficientZoomLevel() * (width / asset.props.w)
```

If a 2000px-wide image displays at 500px on the canvas and the zoom level is 0.5×, the screen scale is `0.5 * (500 / 2000) = 0.125`—the image is effectively at 12.5% of its native resolution. No point fetching the full thing.

## Power-of-two stepping for cache efficiency

Continuous zoom values would generate infinite variations of image URLs, defeating browser caching. Instead, screen scales are quantized to powers of two:

```typescript
// packages/editor/src/lib/editor/Editor.ts
const zoomStepFunction = (zoom: number) => Math.pow(2, Math.ceil(Math.log2(zoom)))
const steppedScreenScale = zoomStepFunction(screenScale)
```

This maps any screen scale to discrete levels: 0.125, 0.25, 0.5, 1, 2, 4, and so on. A zoom of 0.73 becomes 1. A zoom of 0.12 becomes 0.125. Fewer unique URLs means better cache hit rates across zoom operations.

## Debouncing prevents mid-zoom flickering

Switching image resolutions while zooming causes visible popping as the browser swaps between different image files. To prevent this, resolution changes are debounced using the editor's tick system:

```typescript
// packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts
if (didAlreadyResolve.current) {
	let tick = 0

	const resolveAssetAfterAWhile = () => {
		tick++
		if (tick > 500 / 16) {
			// debounce for 500ms
			resolveAssetUrl(editor, assetId, screenScale, exportInfo, (url) => resolve(asset, url))
			cancelDebounceFn?.()
		}
	}

	editor.on('tick', resolveAssetAfterAWhile)
}
```

The first resolution loads immediately. Subsequent changes wait approximately 500ms of camera inactivity before fetching a new resolution. If the camera is still moving, the debounce counter resets. This means rapid zooming shows a slightly stale resolution until you stop, then smoothly upgrades without visible popping.

The 500ms threshold represents a tradeoff: shorter delays give faster resolution upgrades but more network churn, longer delays reduce network requests but leave users looking at lower-resolution images after they've stopped zooming.

## Efficient zoom level for dense canvases

On canvases with many shapes, recalculating image resolutions on every frame during camera movements becomes expensive. The `getEfficientZoomLevel()` method returns a debounced zoom value when the page contains more than a configurable threshold of shapes:

```typescript
// packages/editor/src/lib/editor/Editor.ts
@computed getEfficientZoomLevel() {
  return this._getAboveDebouncedZoomThreshold()
    ? this.getDebouncedZoomLevel()
    : this.getZoomLevel()
}

@computed private _getAboveDebouncedZoomThreshold() {
  return this.getCurrentPageShapeIds().size > this.options.debouncedZoomThreshold
}
```

The default `debouncedZoomThreshold` is 500 shapes (defined in `packages/editor/src/lib/options.ts`). Below that threshold, image components react to every camera change. Above it, they use the debounced zoom level, preventing hundreds of components from recalculating resolution on every single frame.

## Resolution selection on the server

The client passes the stepped screen scale to the asset resolver, which constructs the appropriate URL. On tldraw.com, this considers network conditions and device capabilities:

```typescript
// apps/dotcom/client/src/utils/multiplayerAssetStore.ts
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

url.searchParams.set('w', width.toString())
```

Key decisions embedded in this calculation:

- **Network-aware**: Slow connections (2g/3g) get 50% resolution reduction
- **Retina-aware**: Device pixel ratio is multiplied in, so high-DPI displays get sharper images
- **Capped at original**: Never requests larger than the native resolution
- **Minimum floor**: The stepped scale is clamped to 1/32, preventing absurdly tiny requests

## Format negotiation

The Cloudflare image worker serves modern formats when the browser supports them:

```typescript
// apps/dotcom/image-resize-worker/src/worker.ts
const accept = request.headers.get('Accept') ?? ''
const format = accept.includes('image/avif')
	? ('avif' as const)
	: accept.includes('image/webp')
		? ('webp' as const)
		: null
```

AVIF offers roughly 50% smaller files than JPEG at equivalent quality. Combined with resolution scaling based on zoom level, a zoomed-out canvas loads dramatically faster than naive full-resolution fetching.

## Skip conditions

Not everything goes through the LOD system. The resolver returns the original URL for:

- **Local files**: Assets with `asset:` prefixed URLs (handled via `loadLocalFile()` on tldraw.com)
- **Videos**: Video assets always use the original URL (only images are transformed)
- **Non-HTTP sources**: Data URLs and blob URLs bypass transformation (checked via `!asset.props.src.startsWith('http')`)
- **Exports**: When `context.shouldResolveToOriginal` is true, the original resolution is always used
- **Animated images**: GIFs and animated WebPs can't be resized without losing animation (`MediaHelpers.isAnimatedImageType()`)
- **Vector formats**: SVGs scale infinitely without quality loss (`MediaHelpers.isVectorImageType()`)
- **External domains**: Only images hosted on tldraw-controlled domains (`.tldraw.com`, `.tldraw.xyz`, `.tldraw.dev`, `.workers.dev`) are transformed
- **Small files**: Images under 1.5MB aren't worth the transformation cost, though they still get format optimization

## The result

This system balances multiple concerns: initial load speed, visual quality during interaction, network bandwidth, and browser cache efficiency. The power-of-two stepping ensures cache hits across zoom operations. The debouncing prevents network thrashing and visual flickering. The network-aware scaling keeps the app responsive on slow connections. And the format negotiation delivers smaller files without any manual configuration.

The main limitation is the 500ms debounce delay—users zooming in on an image see the lower resolution briefly before the higher resolution loads. This feels better than constant flickering, but it's still a visible transition. Faster networks and browser preloading could reduce this delay, but then you risk wasting bandwidth on images the user zooms past. Every multiplier in that resolution formula is a tradeoff.

## Key files

- `packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts` — Client-side resolution selection and debouncing
- `packages/editor/src/lib/editor/Editor.ts` — Efficient zoom level calculation and power-of-two stepping
- `apps/dotcom/client/src/utils/multiplayerAssetStore.ts` — Production asset resolver with network-aware scaling
- `apps/dotcom/image-resize-worker/src/worker.ts` — Cloudflare image transformation and format negotiation
