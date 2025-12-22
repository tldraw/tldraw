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
order: 0
---

# Image level of detail

When we added image support to tldraw, we wanted images to look good at any zoom level without wasting bandwidth. Loading a 4000×3000 photo at full resolution just to display it as a 50×50 thumbnail is wasteful. The obvious solution is to request different resolutions based on zoom level. But if you just multiply the zoom level by the image dimensions and fetch that, you create a problem: every zoom value creates a different URL, and browsers can't cache any of them.

The trick is to step the zoom level to discrete values instead of using it directly.

## Powers of two

When we calculate what resolution to request, we round the zoom level up to the nearest power of two:

```typescript
const zoomStepFunction = (zoom: number) => Math.pow(2, Math.ceil(Math.log2(zoom)))
const steppedScreenScale = zoomStepFunction(screenScale)
```

This formula converts the zoom level to log base 2, rounds up to the next integer, then converts back. The result is that all zoom levels within a range map to the same power of two:

- 0.10 → 0.125 (2^-3)
- 0.12 → 0.125 (2^-3)
- 0.13 → 0.25 (2^-2)
- 0.25 → 0.25 (2^-2)
- 0.73 → 1 (2^0)
- 1.0 → 1 (2^0)
- 1.5 → 2 (2^1)
- 4.2 → 8 (2^3)

If you zoom from 0.10× to 0.12×, both requests ask for the same 0.125× resolution. If you zoom from 0.73× to 1.0×, both use the 1× resolution. The browser sees the same URL and can serve the cached version.

Without this stepping, smoothly zooming from 0.1× to 1.0× would generate hundreds of unique URLs as the zoom level changes every frame. With stepping, you get at most a handful of requests: 0.125×, 0.25×, 0.5×, 1×.

## Why powers of two

We could have used any discrete steps—rounding to 0.1, 0.2, 0.3, or bucketing into "small, medium, large." Powers of two work well for a few reasons.

They're standard in graphics programming. Mipmaps, the precomputed image levels used in 3D rendering, are always halved at each step. Image processing libraries and CDN workers understand powers of two natively.

They space out nicely. Each level is twice the previous one, which means the visual difference between adjacent levels is consistent. Going from 0.125× to 0.25× feels about the same as going from 0.5× to 1×.

They round up conservatively. If you're viewing an image at 0.13× zoom, rounding up to 0.25× means you fetch a resolution that's nearly twice what you need. That's wasteful, but it's better than rounding down and showing a blurry image. With powers of two, you never request less resolution than required.

## Screen scale calculation

The stepped value is what we use to request the image, but we derive it from the actual screen scale—the fraction of the native image that will appear on screen.

```typescript
const screenScale = editor.getEfficientZoomLevel() * (width / asset.props.w)
```

This multiplies the current zoom level by the ratio of the shape's display width to the native image width. If the native image is 2000px wide, the shape is 500px wide on the canvas, and you're zoomed to 0.5×, the screen scale is:

```
0.5 × (500 / 2000) = 0.125
```

That means you need 12.5% of the native resolution to fill the shape on screen. Step that up to the nearest power of two (0.125), multiply by the native width (2000 × 0.125 = 250), and you get the resolution to request: 250px.

On a retina display with a device pixel ratio of 2, the calculation includes the DPR:

```
0.5 × (500 / 2000) × 2 = 0.25
```

Now you need the 0.25× level, which is 500px. The higher-resolution screen gets a higher-resolution image, but still from the same discrete set of power-of-two levels.

## When it matters

If you zoom in and out frequently, power-of-two stepping prevents redundant network requests. If you zoom to 0.73× and then back to 0.95×, both use the 1× resolution and the browser serves it from cache. Without stepping, the second zoom would trigger a new fetch for a slightly different image.

The downside is that sometimes you fetch more than you strictly need. At 0.13× zoom, you're requesting the 0.25× level, which is nearly double the resolution required. For small images or fast networks, this doesn't matter. For large images on slow connections, we add a network compensation factor (described elsewhere) to reduce the requested resolution further.

The tradeoff is worth it. Cache hits are fast and free. Network requests are slow and expensive. Even if the cached image is slightly higher resolution than needed, serving it from cache is almost always faster than fetching a smaller image from the network.

## Where this lives

The zoom stepping happens in `packages/editor/src/lib/editor/Editor.ts` in the `resolveAssetUrl` method. The screen scale calculation is in `packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts`. The final resolution request, including network compensation and device pixel ratio, is in `apps/dotcom/client/src/utils/multiplayerAssetStore.ts`.
