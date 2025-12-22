---
title: Image level of detail - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - image
  - lod
status: published
date: 12/21/2025
order: 3
---

# Image level of detail: raw notes

Internal research notes for the image-lod.md article.

## Core problem

Loading high-resolution images wastes network bandwidth and memory when displaying them at small sizes. A 4000×3000 photo downloaded for a 50×50 thumbnail is wasteful. Naive solution is always fetching full resolution. Better solution is fetching different resolutions based on zoom level, but done carelessly this causes flickering and excessive network requests during camera movements.

## Screen scale calculation

**Formula:**
From `packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts:97-99`:

```typescript
const screenScale = exportInfo
	? exportInfo.scale * (width / asset.props.w)
	: editor.getEfficientZoomLevel() * (width / asset.props.w)
```

**Breakdown:**

- `width`: The display width of the shape in shape-space pixels
- `asset.props.w`: The native width of the image in pixels
- `width / asset.props.w`: The relative scale of the shape vs the native image
- Multiply by current zoom level to get effective screen scale

**Example:**

- Native image: 2000px wide
- Canvas shape: 500px wide
- Zoom level: 0.5×
- Screen scale: `0.5 * (500 / 2000) = 0.125` (12.5% of native resolution)

## Power-of-two stepping

**Implementation:**
From `packages/editor/src/lib/editor/Editor.ts:4660-4661`:

```typescript
const zoomStepFunction = (zoom: number) => Math.pow(2, Math.ceil(Math.log2(zoom)))
const steppedScreenScale = zoomStepFunction(screenScale)
```

**Mathematical explanation:**

- `Math.log2(zoom)`: Convert to log base 2
- `Math.ceil()`: Round up to next integer
- `Math.pow(2, ...)`: Convert back from log space

**Mapping examples:**

- 0.10 → 0.125 (2^-3)
- 0.12 → 0.125 (2^-3)
- 0.13 → 0.25 (2^-2)
- 0.25 → 0.25 (2^-2)
- 0.73 → 1 (2^0)
- 1.0 → 1 (2^0)
- 1.5 → 2 (2^1)
- 4.2 → 8 (2^3)

**Why powers of two:**

- Discrete steps instead of continuous values
- Prevents infinite URL variations
- Improves browser cache hit rates
- Standard in graphics for mipmap levels

## Debouncing resolution changes

**First load (immediate):**
From `packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts:126-128`:

```typescript
} else {
  resolveAssetUrl(editor, assetId, screenScale, exportInfo, (url) => resolve(asset, url))
}
```

No debouncing on first resolution load - image appears immediately.

**Subsequent loads (debounced):**
From `packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts:111-125`:

```typescript
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

	cancelDebounceFn?.()
	editor.on('tick', resolveAssetAfterAWhile)
	cancelDebounceFn = () => editor.off('tick', resolveAssetAfterAWhile)
}
```

**Tick-based debouncing:**

- Editor emits 'tick' events on animation frames (roughly 60fps = ~16ms per tick)
- Counter increments on each tick
- `tick > 500 / 16` evaluates to `tick > 31.25`, so waits ~32 ticks
- 32 ticks × 16ms ≈ 512ms ≈ 500ms debounce period
- If camera still moving, event listener is removed and re-added, resetting counter

**Why 500ms:**
Tradeoff between network efficiency and user experience:

- Shorter: Faster resolution upgrades, more network churn, more flickering
- Longer: Fewer network requests, but users see low-res images longer after stopping

**State tracking:**
From `packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts:60`:

```typescript
const didAlreadyResolve = useRef(false)
```

Flag set to `true` after first resolution loads (line 104), enabling debouncing for subsequent changes.

## Efficient zoom level for dense canvases

**Threshold check:**
From `packages/editor/src/lib/editor/Editor.ts:2765-2767`:

```typescript
@computed private _getAboveDebouncedZoomThreshold() {
  return this.getCurrentPageShapeIds().size > this.options.debouncedZoomThreshold
}
```

**Efficient zoom method:**
From `packages/editor/src/lib/editor/Editor.ts:2781-2785`:

```typescript
@computed getEfficientZoomLevel() {
  return this._getAboveDebouncedZoomThreshold()
    ? this.getDebouncedZoomLevel()
    : this.getZoomLevel()
}
```

**Debounced zoom implementation:**
From `packages/editor/src/lib/editor/Editor.ts:2753-2763`:

```typescript
@computed getDebouncedZoomLevel() {
  if (this.options.debouncedZoom) {
    if (this.getCameraState() === 'idle') {
      return this.getZoomLevel()
    } else {
      return this._debouncedZoomLevel.get()
    }
  }

  return this.getZoomLevel()
}
```

**Camera state management:**
From `packages/editor/src/lib/editor/Editor.ts:2741`:

```typescript
private _debouncedZoomLevel = atom('debounced zoom level', 1)
```

From `packages/editor/src/lib/editor/Editor.ts:4178-4186`:

```typescript
private _tickCameraState() {
  // always reset the timeout
  this._cameraStateTimeoutRemaining = this.options.cameraMovingTimeoutMs
  // If the state is idle, then start the tick
  if (this._cameraState.__unsafe__getWithoutCapture() !== 'idle') return
  this._cameraState.set('moving')
  this._debouncedZoomLevel.set(unsafe__withoutCapture(() => this.getCamera().z))
  this.on('tick', this._decayCameraStateTimeout)
}
```

From `packages/editor/src/lib/editor/Editor.ts:4172-4177`:

```typescript
private _decayCameraStateTimeout(elapsed: number) {
  this._cameraStateTimeoutRemaining -= elapsed
  if (this._cameraStateTimeoutRemaining > 0) return
  this.off('tick', this._decayCameraStateTimeout)
  this._cameraState.set('idle')
}
```

**Configuration values:**
From `packages/editor/src/lib/options.ts:99-100, 158-159`:

```typescript
readonly debouncedZoomThreshold: number  // Default: 500 shapes
readonly debouncedZoom: boolean          // Default: true

debouncedZoomThreshold: 500,
cameraMovingTimeoutMs: 64,
```

**Behavior:**

- Below 500 shapes: Every zoom change triggers recalculation
- Above 500 shapes: Use cached zoom value while camera is moving
- Camera state goes to 'idle' after 64ms of no movement
- Prevents hundreds of components from recalculating on every frame

## Resolution selection on client

**Network-aware calculation:**
From `apps/dotcom/client/src/utils/multiplayerAssetStore.ts:92-109`:

```typescript
const isWorthResizing = fileSize >= 1024 * 1024 * 1.5

if (isWorthResizing) {
	// N.B. navigator.connection is only available in certain browsers (mainly Blink-based browsers)
	// 4g is as high the 'effectiveType' goes and we can pick a lower effective image quality for slower connections.
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
}
```

**Formula breakdown:**

```
requestedWidth = min(
  nativeWidth * clamp(steppedScale, 0.03125, 1) * networkComp * dpr,
  nativeWidth
)
```

**Parameters:**

- `fileSize >= 1024 * 1024 * 1.5`: Only resize files ≥ 1.5MB
- `clamp(steppedScreenScale, 1/32, 1)`: Minimum 3.125%, maximum 100% of native size
- `networkCompensation`: 1.0 for 4g/unknown, 0.5 for 2g/3g (50% resolution reduction)
- `context.dpr`: Device pixel ratio (typically 1 for standard displays, 2+ for retina)
- `Math.min(..., asset.props.w)`: Never request larger than native resolution
- `Math.ceil()`: Round up to avoid fractional pixels

**Example calculations:**

1. **Standard display, good network:**
   - Native: 2000px
   - Stepped scale: 0.25
   - Network: 4g (comp = 1.0)
   - DPR: 1
   - Result: `min(2000 * 0.25 * 1.0 * 1, 2000) = 500px`

2. **Retina display, good network:**
   - Native: 2000px
   - Stepped scale: 0.25
   - Network: 4g (comp = 1.0)
   - DPR: 2
   - Result: `min(2000 * 0.25 * 1.0 * 2, 2000) = 1000px`

3. **Standard display, slow network:**
   - Native: 2000px
   - Stepped scale: 0.25
   - Network: 3g (comp = 0.5)
   - DPR: 1
   - Result: `min(2000 * 0.25 * 0.5 * 1, 2000) = 250px`

**Context object:**
From `packages/editor/src/lib/editor/Editor.ts:4641-4671`:

```typescript
async resolveAssetUrl(
  assetId: TLAssetId | null,
  context: {
    screenScale?: number
    shouldResolveToOriginal?: boolean
    dpr?: number
  }
): Promise<string | null> {
  // ...
  const {
    screenScale = 1,
    shouldResolveToOriginal = false,
    dpr = this.getInstanceState().devicePixelRatio,
  } = context

  const zoomStepFunction = (zoom: number) => Math.pow(2, Math.ceil(Math.log2(zoom)))
  const steppedScreenScale = zoomStepFunction(screenScale)
  const networkEffectiveType: string | null =
    'connection' in navigator ? (navigator as any).connection.effectiveType : null

  return await this.store.props.assets.resolve(asset, {
    screenScale: screenScale || 1,
    steppedScreenScale,
    dpr,
    networkEffectiveType,
    shouldResolveToOriginal,
  })
}
```

## Format negotiation on server

**Accept header parsing:**
From `apps/dotcom/image-resize-worker/src/worker.ts:42-47`:

```typescript
const accept = request.headers.get('Accept') ?? ''
const format = accept.includes('image/avif')
	? ('avif' as const)
	: accept.includes('image/webp')
		? ('webp' as const)
		: null
```

**Priority order:**

1. AVIF (best compression, ~50% smaller than JPEG)
2. WebP (good compression, wider support)
3. Original format (fallback)

**Cloudflare image options:**
From `apps/dotcom/image-resize-worker/src/worker.ts:76-81`:

```typescript
const imageOptions: RequestInitCfPropertiesImage = {
	fit: 'scale-down',
}
if (format) imageOptions.format = format
if (query.w) imageOptions.width = Number(query.w)
if (query.q) imageOptions.quality = Number(query.q)
```

**fit: 'scale-down':**
Never upscales images - prevents requesting 5000px version of 2000px image.

**Cache key construction:**
From `apps/dotcom/image-resize-worker/src/worker.ts:50-55`:

```typescript
const cacheKey = new URL(passthroughUrl)
cacheKey.searchParams.set('format', format ?? 'original')
for (const [key, value] of Object.entries(query)) {
	cacheKey.searchParams.set(key, value)
}
```

Cache key includes format + width + quality, so different browsers/requests get appropriate versions.

**URL construction:**
From `apps/dotcom/client/src/utils/multiplayerAssetStore.ts:111`:

```typescript
return `${IMAGE_WORKER}/${url.host}/${url.toString().slice(url.origin.length + 1)}`
```

Example: `https://images.tldraw.com/localhost:3000/uploads/asset-123.jpg?w=500`

## Skip conditions

**Local files:**
From `apps/dotcom/client/src/utils/multiplayerAssetStore.ts:49-58`:

```typescript
if (asset.props.src.startsWith('asset:')) {
	if (!asset.meta.hidden) {
		const res = await loadLocalFile(asset)
		if (res) {
			return res.url
		}
	} else {
		return asset.props.src
	}
}
```

Assets with `asset:` prefix handled via local file loading, not through image worker.

**Videos:**
From `apps/dotcom/client/src/utils/multiplayerAssetStore.ts:60-61`:

```typescript
if (asset.type === 'video') return asset.props.src
```

Videos always use original URL - no transformation.

**Non-HTTP sources:**
From `apps/dotcom/client/src/utils/multiplayerAssetStore.ts:66-68`:

```typescript
if (!asset.props.src.startsWith('http:') && !asset.props.src.startsWith('https:'))
	return asset.props.src
```

Data URLs, blob URLs, and other non-HTTP schemes bypass transformation.

**Export context:**
From `apps/dotcom/client/src/utils/multiplayerAssetStore.ts:70`:

```typescript
if (context.shouldResolveToOriginal) return asset.props.src
```

When exporting, always use original resolution for quality.

From `packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts:151`:

```typescript
shouldResolveToOriginal: exportInfo ? exportInfo.pixelRatio === null : false,
```

Export info with `pixelRatio: null` signals "use original".

**Animated images:**
From `apps/dotcom/client/src/utils/multiplayerAssetStore.ts:72-74`:

```typescript
if (MediaHelpers.isAnimatedImageType(asset?.props.mimeType) || asset.props.isAnimated)
	return asset.props.src
```

GIFs, animated WebPs, animated PNGs (APNG), animated AVIFs can't be resized without losing animation.

From `packages/utils/src/lib/media/media.ts:51-55, 389-391`:

```typescript
export const DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES = Object.freeze([
  'image/gif' as const,
  'image/apng' as const,
  'image/avif' as const,
])

static isAnimatedImageType(mimeType: string | null): boolean {
  return DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES.includes((mimeType as any) || '')
}
```

**Vector images:**
From `apps/dotcom/client/src/utils/multiplayerAssetStore.ts:76-77`:

```typescript
if (MediaHelpers.isVectorImageType(asset?.props.mimeType)) return asset.props.src
```

SVGs scale infinitely without quality loss - no need for multiple resolutions.

From `packages/utils/src/lib/media/media.ts:21, 421-423`:

```typescript
export const DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES = Object.freeze(['image/svg+xml' as const])

static isVectorImageType(mimeType: string | null): boolean {
  return DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES.includes((mimeType as any) || '')
}
```

**External domains:**
From `apps/dotcom/client/src/utils/multiplayerAssetStore.ts:82-85`:

```typescript
const isTldrawImage = isDevelopmentEnv || /\.tldraw\.(?:com|xyz|dev|workers\.dev)$/.test(url.host)

if (!isTldrawImage) return asset.props.src
```

Only transform images on tldraw-controlled domains:

- `*.tldraw.com`
- `*.tldraw.xyz`
- `*.tldraw.dev`
- `*.workers.dev`
- Any domain in development environment

**Small files:**
From `apps/dotcom/client/src/utils/multiplayerAssetStore.ts:87-91`:

```typescript
const { fileSize = 0 } = asset.props
const isWorthResizing = fileSize >= 1024 * 1024 * 1.5
```

Files under 1.5MB (1,572,864 bytes) skip transformation to avoid processing cost. Still get format optimization (AVIF/WebP) via image worker, just no resolution changes.

## Constants and configuration

**Debounce timing:**

```typescript
// Resolution change debounce
500ms  // packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts:116
~16ms per tick (60fps)  // Assumption based on requestAnimationFrame
31.25 ticks ≈ 500ms  // 500 / 16

// Camera state timeout
64ms  // packages/editor/src/lib/options.ts:134 (cameraMovingTimeoutMs)
```

**Thresholds:**

```typescript
// Shape count threshold for debounced zoom
500 shapes  // packages/editor/src/lib/options.ts:159 (debouncedZoomThreshold)

// File size threshold for transformation
1.5MB = 1572864 bytes  // apps/dotcom/client/src/utils/multiplayerAssetStore.ts:90

// Minimum screen scale
1/32 = 0.03125  // apps/dotcom/client/src/utils/multiplayerAssetStore.ts:101
```

**Network compensation values:**

```typescript
4g or unknown: 1.0 (100%)  // Full resolution
3g or slower: 0.5 (50%)    // Half resolution
```

**Environment variables:**
From `apps/dotcom/client/src/utils/config.ts:12-15`:

```typescript
if (!process.env.IMAGE_WORKER) {
	throw new Error('Missing IMAGE_WORKER env var')
}
export const IMAGE_WORKER = process.env.IMAGE_WORKER
```

IMAGE_WORKER env var points to Cloudflare worker URL for image transformation.

## Culling optimization

**Shape culling check:**
From `packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts:72`:

```typescript
if (!exportInfo && shapeId && editor.getCulledShapes().has(shapeId)) return
```

If shape is off-screen (culled) and not exporting, skip resolution calculation entirely. Prevents unnecessary work for shapes not currently visible.

## React effect and state management

**State structure:**
From `packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts:51-57`:

```typescript
const [result, setResult] = useState<{
	asset: (TLImageAsset | TLVideoAsset) | null
	url: string | null
}>(() => ({
	asset: assetId ? (editor.getAsset<TLImageAsset | TLVideoAsset>(assetId) ?? null) : null,
	url: null as string | null,
}))
```

**URL deduplication:**
From `packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts:63, 103`:

```typescript
const previousUrl = useRef<string | null>(null)

// ...
if (previousUrl.current === url) return // don't update the state if the url is the same
```

Prevents re-renders when URL hasn't actually changed.

**Cleanup:**
From `packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts:131-135`:

```typescript
return () => {
	cleanupEffectScheduler()
	cancelDebounceFn?.()
	isCancelled = true
}
```

Removes tick listeners and cancels pending resolutions when component unmounts or dependencies change.

**Asset deletion handling:**
From `packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts:75-80`:

```typescript
const asset = editor.getAsset<TLImageAsset | TLVideoAsset>(assetId)
if (!asset) {
	// If the asset is deleted, such as when an upload fails, set the URL to null
	setResult((prev) => ({ ...prev, asset: null, url: null }))
	return
}
```

**Temporary preview handling:**
From `packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts:82-93`:

```typescript
if (!asset.props.src) {
	const preview = editor.getTemporaryAssetPreview(asset.id)
	if (preview) {
		if (previousUrl.current !== preview) {
			previousUrl.current = preview
			setResult((prev) => ({ ...prev, isPlaceholder: true, url: preview }))
			exportIsReady()
		}
		return
	}
}
```

Displays base64 preview for assets without src (e.g., pasted images before upload completes).

## Reactive dependency tracking

**react() wrapper:**
From `packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts:71`:

```typescript
const cleanupEffectScheduler = react('update state', () => {
```

Uses tldraw's reactive signals system - automatically tracks dependencies and re-runs when editor state changes.

**Export readiness signaling:**
From `packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts:89, 107`:

```typescript
exportIsReady() // let the SVG export know we're ready for export
```

Signals to SVG export system that image has loaded and shape is ready to export.

## Key source files

- `packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts` — Client-side hook for image resolution selection and debouncing
- `packages/editor/src/lib/editor/Editor.ts:4641-4671` — Asset URL resolution with stepped screen scale
- `packages/editor/src/lib/editor/Editor.ts:2753-2785` — Efficient and debounced zoom level calculation
- `packages/editor/src/lib/editor/Editor.ts:4172-4186` — Camera state management and timeout handling
- `packages/editor/src/lib/options.ts` — Configuration constants (debouncedZoomThreshold: 500, cameraMovingTimeoutMs: 64)
- `apps/dotcom/client/src/utils/multiplayerAssetStore.ts` — Production asset resolver with network-aware scaling, skip conditions
- `apps/dotcom/client/src/utils/config.ts` — Environment variable configuration (IMAGE_WORKER)
- `apps/dotcom/image-resize-worker/src/worker.ts` — Cloudflare image transformation worker (format negotiation, caching, validation)
- `packages/utils/src/lib/media/media.ts` — Media type helpers (isAnimatedImageType, isVectorImageType, supported format constants)
