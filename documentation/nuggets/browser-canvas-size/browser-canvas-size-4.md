---
title: Probing for maximum dimensions
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - browser
  - canvas
  - size
---

# Browser canvas size limits

HTML canvas elements have maximum dimensions that vary wildly between browsers and devices. Chrome caps at 32,767 pixels per side. Safari allows over 4 million pixels wide—but only 16,384 pixels of total area on older versions. iOS Safari on certain devices has stricter limits than desktop Safari. There's no API to query these limits. Exceeding them causes silent failures: the canvas simply won't render, or `toBlob()` returns null.

When users export a large document or zoom out to capture an overview, their canvas dimensions can exceed these limits. Without detection and clamping, exports silently fail or produce blank images.

## Why probing is required

You can't ask a browser "what's your maximum canvas size?" The limits aren't exposed through any API, and they change between browser versions, operating system updates, and even device memory configurations. The only way to know is to try.

The probing algorithm creates test canvases at various dimensions, draws a single pixel in the far corner, then attempts to read that pixel back:

```typescript
for (const size of TEST_SIZES[dimension]) {
	const testCvs = document.createElement('canvas')
	testCvs.width = dimension === 'height' ? 1 : size
	testCvs.height = dimension === 'width' ? 1 : size
	const testCtx = testCvs.getContext('2d')!

	// Draw a pixel in the far corner
	testCtx.fillRect(w - 1, h - 1, 1, 1)

	// Try to read it back through a second canvas
	cropCtx.drawImage(testCvs, w - 1, h - 1, 1, 1, 0, 0, 1, 1)
	const isTestPassed = cropCtx.getImageData(0, 0, 1, 1).data[3] !== 0
}
```

If the pixel is readable (non-zero alpha), the canvas size works. If not, the browser silently failed to allocate the canvas, and we try a smaller size.

The clever bit is using a second 1x1 canvas to read the pixel. We can't just call `getImageData` on the test canvas at coordinates near the limit—we draw the far corner to a tiny crop canvas and check there. This isolates the test from any weirdness in how browsers handle pixel access near their limits.

## Three separate limits

Canvas dimensions are constrained in three independent ways:

- **Maximum width**: How wide a canvas can be (Safari allows 4,194,303 pixels)
- **Maximum height**: How tall a canvas can be (Safari allows 8,388,607 pixels)
- **Maximum area**: Total pixel count regardless of aspect ratio

A canvas might be allowed to be 4 million pixels wide if it's only 1 pixel tall, but not if it's square. The area limit often constrains before width or height do:

```typescript
TEST_SIZES = {
	area: [16384, 14188, 11402, 11180, 10836, 8192, 4096], // square side length
	height: [8388607, 65535, 32767, 16384, 8192, 4096],
	width: [4194303, 65535, 32767, 16384, 8192, 4096],
}
```

These test sizes are drawn from empirical testing across browser versions. Safari 7-12 allows enormous linear dimensions but has a 16,384×16,384 area limit (about 268 million pixels as a square). Chrome 70 maxes out at 32,767 on any side. iOS Safari 9-12 caps at 4,096×4,096. The comments in our code document which browser version each limit comes from.

## Caching the results

Probing is expensive—it creates multiple canvases and performs pixel reads. We run it once per browser session and cache the results:

```typescript
let maxCanvasSizes: CanvasMaxSize | null = null

function getBrowserCanvasMaxSize(): CanvasMaxSize {
	if (!maxCanvasSizes) {
		maxCanvasSizes = {
			maxWidth: getCanvasSize('width'),
			maxHeight: getCanvasSize('height'),
			maxArea: getCanvasSize('area'),
		}
	}
	return maxCanvasSizes
}
```

The cache is in-memory only. We don't persist to localStorage because browser limits can change between versions, and a stale cached value could cause failures after a browser update.

## Avoiding probing in common cases

Most exports don't approach browser limits. A "safe" size exists that works everywhere:

```typescript
const MAX_SAFE_CANVAS_DIMENSION = 8192
const MAX_SAFE_CANVAS_AREA = 4096 * 4096

function clampToBrowserMaxCanvasSize(width: number, height: number) {
	// Fast path: dimensions below universal safe limits
	if (
		width <= MAX_SAFE_CANVAS_DIMENSION &&
		height <= MAX_SAFE_CANVAS_DIMENSION &&
		width * height <= MAX_SAFE_CANVAS_AREA
	) {
		return [width, height]
	}

	// Only probe when we need to
	const { maxWidth, maxHeight, maxArea } = getBrowserCanvasMaxSize()
	// ...clamping logic...
}
```

8,192 pixels per side and 16 million total pixels works on every browser we've tested, including old iOS Safari. Most exports fit within this, so probing never runs. Only when exporting unusually large content—a zoomed-out view of a massive document—do we pay the probing cost.

## Clamping with aspect ratio preservation

When dimensions exceed the limit, we scale down while preserving aspect ratio. The clamping applies constraints in sequence:

```typescript
const aspectRatio = width / height

// Clamp to max width
if (width > maxWidth) {
	width = maxWidth
	height = width / aspectRatio
}

// Clamp to max height
if (height > maxHeight) {
	height = maxHeight
	width = height * aspectRatio
}

// Clamp to max area
if (width * height > maxArea) {
	const ratio = Math.sqrt(maxArea / (width * height))
	width *= ratio
	height *= ratio
}
```

The area calculation uses `Math.sqrt` because we need to scale both dimensions by the same factor. If the area is 4× too large, we divide each dimension by 2 (since 2×2=4).

This clamping happens in `getSvgAsImage`, where SVG content is rasterized for export:

```typescript
let [clampedWidth, clampedHeight] = clampToBrowserMaxCanvasSize(
	width * pixelRatio,
	height * pixelRatio
)
const effectiveScale = clampedWidth / width
```

The effective scale gets embedded in PNG metadata so that tools can correctly interpret the image's intended size (see [PNG scale metadata](./png-scale.md)).

## The user experience

When clamping occurs, exports succeed but at reduced resolution. A 20,000×10,000 pixel export that exceeds Chrome's 32,767 width limit gets scaled down proportionally. Users get a working export rather than a silent failure or blank image.

This is a reasonable tradeoff for a problem most users never encounter. The limits affect extreme cases—exporting massive documents at high DPI, or capturing wide panoramic views. For typical exports, the safe-size fast path means zero overhead.

## Key files

- `packages/editor/src/lib/utils/browserCanvasMaxSize.ts` — Probing and clamping implementation
- `packages/editor/src/lib/exports/getSvgAsImage.ts` — Export code that applies clamping
