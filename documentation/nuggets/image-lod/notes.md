- `packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts` — Client-side hook for image resolution selection and debouncing
- `packages/editor/src/lib/editor/Editor.ts:4641-4671` — Asset URL resolution with stepped screen scale
- `packages/editor/src/lib/editor/Editor.ts:2753-2785` — Efficient and debounced zoom level calculation
- `packages/editor/src/lib/editor/Editor.ts:4172-4186` — Camera state management and timeout handling
- `packages/editor/src/lib/options.ts` — Configuration constants (debouncedZoomThreshold: 500, cameraMovingTimeoutMs: 64)
- `apps/dotcom/client/src/utils/multiplayerAssetStore.ts` — Production asset resolver with network-aware scaling, skip conditions
- `apps/dotcom/client/src/utils/config.ts` — Environment variable configuration (IMAGE_WORKER)
- `apps/dotcom/image-resize-worker/src/worker.ts` — Cloudflare image transformation worker (format negotiation, caching, validation)
- `packages/utils/src/lib/media/media.ts` — Media type helpers (isAnimatedImageType, isVectorImageType, supported format constants)

---

Debounced zoom level calculation:
/\*\*
_ Get the debounced zoom level. When the camera is moving, this returns the zoom level
_ from when the camera started moving rather than the current zoom level. This can be
_ used to avoid expensive re-renders during camera movements.
_
_ This behavior is controlled by the `useDebouncedZoom` option. When `useDebouncedZoom`
_ is `false`, this method always returns the current zoom level. \*
_ @public
_/
@computed getDebouncedZoomLevel() {
if (this.options.debouncedZoom) {
if (this.getCameraState() === 'idle') {
return this.getZoomLevel()
} else {
return this.\_debouncedZoomLevel.get()
}
}

    	return this.getZoomLevel()
    }

    @computed private _getAboveDebouncedZoomThreshold() {
    	return this.getCurrentPageShapeIds().size > this.options.debouncedZoomThreshold
    }

    /**
     * Get the efficient zoom level. This returns the current zoom level if there are less than 300 shapes on the page,
     * otherwise it returns the debounced zoom level. This can be used to avoid expensive re-renders during camera movements.
     *
     * @public
     * @example
     * ```ts
     * editor.getEfficientZoomLevel()
     * ```
     *
     * @public
     */
    @computed getEfficientZoomLevel() {
    	return this._getAboveDebouncedZoomThreshold()
    		? this.getDebouncedZoomLevel()
    		: this.getZoomLevel()
    }

---

    async resolveAssetUrl(
    	assetId: TLAssetId | null,
    	context: {
    		screenScale?: number
    		shouldResolveToOriginal?: boolean
    		dpr?: number
    	}
    ): Promise<string | null> {
    	if (!assetId) return null
    	const asset = this.getAsset(assetId)
    	if (!asset) return null

    	const {
    		screenScale = 1,
    		shouldResolveToOriginal = false,
    		dpr = this.getInstanceState().devicePixelRatio,
    	} = context

    	// We only look at the zoom level at powers of 2.
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
    // We only look at the zoom level at powers of 2.
    const zoomStepFunction = (zoom: number) => Math.pow(2, Math.ceil(Math.log2(zoom)))
```

1. Cache efficiency
   Without stepping, every tiny zoom change (e.g., 0.501×, 0.502×, 0.503×) would generate a different image URL, causing cache misses. Powers of 2 create discrete buckets (0.125×, 0.25×, 0.5×, 1×, 2×, etc.), so nearby zoom levels share the same cached image.

2. Practical quality tradeoff
   The visual difference between 0.501× and 0.5× is negligible, so grouping them into the same bucket (0.5×) is acceptable.
   Example:
   Zoom 0.10× → steps to 0.125× (2^-3)
   Zoom 0.12× → steps to 0.125× (same bucket)
   Zoom 0.13× → steps to 0.25× (2^-2)
   This keeps the number of distinct image resolutions small while maintaining acceptable visual quality.

We don't do the full mipmap thing but we do some kind of hybrid.

---

multiplayerAssetStore is a TLAssetStore implementation designed for multiplayer tldraw applications, handling asset uploads and URL resolution for collaborative environments.

Resolution selection logic (lines 92-109):

- Calculates the actual requested width based on steppedScreenScale, network conditions, and device pixel ratio
- Applies the 1.5MB threshold for whether to resize at all

All skip conditions (lines 49-91):

- Local files (asset: prefix)
- Videos (always original)
- Non-HTTP sources (data URLs, blobs)
- Export context (use original)
- Animated images (GIFs, APNGs)
- Vector images (SVGs)
- External domains (only transform tldraw-hosted images)
- Small files (<1.5MB)

URL construction (line 111):

- Routes requests through the image worker: ${IMAGE_WORKER}/${url.host}/...

The LOD system has three main layers:

1. Editor core (Editor.ts) — calculates efficient zoom levels and applies power-of-two stepping
2. React hook (useImageOrVideoAsset.ts) — handles debouncing and state management
3. Asset resolver (multiplayerAssetStore.ts) — production implementation that decides if and how to transform

So multiplayerAssetStore.ts is where the rubber meets the road for dotcom — it's the production asset resolver that actually decides whether to request a smaller image and what size to request.
