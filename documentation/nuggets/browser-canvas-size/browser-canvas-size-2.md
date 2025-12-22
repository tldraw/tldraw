---
title: Three independent constraints
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - canvas
  - browser
  - limits
status: published
date: 12/21/2025
order: 1
---

# Browser canvas size limits

When we export a large diagram at high resolution, we need to render it to an HTML canvas before encoding it as a PNG or JPEG. Canvases have size limits, and those limits are different in every browser. Safari allows a 4,194,303px wide canvas, but Chrome caps any dimension at 32,767px. Safari also allows an 8,388,607px tall canvas, but restricts total area to 16,777,216 pixels (4096×4096). This means a 20,000×1 canvas works fine in Safari, but a 5,000×5,000 canvas fails.

We can't just pick conservative numbers and hope they work—users routinely export diagrams that would exceed them. Instead, we probe the browser once to find its actual limits, then clamp requested canvas sizes to fit while preserving aspect ratio.

## Three independent constraints

Canvas limits aren't just "width and height can't exceed X." There are three separate constraints:

1. **Maximum width** (independent of height)
2. **Maximum height** (independent of width)
3. **Maximum area** (total pixels, width × height)

All three matter. Chrome might allow 65,535px in either dimension but that doesn't mean you can create a 65,535×65,535 canvas—the area would be 4 billion pixels, far beyond what any browser supports.

Safari demonstrates why all three constraints exist. It allows enormous individual dimensions (4M+ pixels wide, 8M+ pixels tall) but restricts area to 16M pixels. A 4,000×4,000 canvas works. A 20,000×1 canvas works. But a 20,000×20,000 canvas silently fails despite each dimension being under the individual limits.

## Probing for limits

Browsers provide no API to query their canvas size limits. We probe by creating test canvases and checking if drawing works.

The algorithm creates a 1×1 "crop" canvas that stays small, then tests increasingly large canvases by drawing a pixel in the far corner and attempting to read it back via the crop canvas:

```typescript
function getCanvasSize(dimension: 'width' | 'height' | 'area'): number {
	const cropCvs = document.createElement('canvas')
	cropCvs.width = 1
	cropCvs.height = 1
	const cropCtx = cropCvs.getContext('2d')!

	for (const size of TEST_SIZES[dimension]) {
		const testCvs = document.createElement('canvas')
		const w = dimension === 'width' ? size : 1
		const h = dimension === 'height' ? size : 1
		testCvs.width = w
		testCvs.height = h

		const testCtx = testCvs.getContext('2d')!
		testCtx.fillRect(w - 1, h - 1, 1, 1)
		cropCtx.drawImage(testCvs, w - 1, h - 1, 1, 1, 0, 0, 1, 1)

		const isTestPassed = cropCtx.getImageData(0, 0, 1, 1).data[3] !== 0

		// Release memory
		testCvs.width = 0
		testCvs.height = 0

		if (isTestPassed) {
			return dimension === 'area' ? size * size : size
		}
	}
}
```

The two-canvas approach is necessary because directly calling `getImageData()` on a test canvas near its size limits can fail in ways that don't indicate the canvas itself failed. Drawing to a small intermediate canvas isolates "did the canvas allocate?" from "can we read pixels at these coordinates?"

We probe three times—once for width (testing very wide, 1px tall canvases), once for height (very tall, 1px wide canvases), and once for area (square canvases). The results are cached in memory for the session.

### Fast-path optimization

Most exports don't approach browser limits. Before probing, we check if the requested dimensions fall within safe minimums that work on every browser:

```typescript
const MAX_SAFE_CANVAS_DIMENSION = 8192
const MAX_SAFE_CANVAS_AREA = 4096 * 4096 // 16,777,216 pixels

if (
	width <= MAX_SAFE_CANVAS_DIMENSION &&
	height <= MAX_SAFE_CANVAS_DIMENSION &&
	width * height <= MAX_SAFE_CANVAS_AREA
) {
	return [width, height]
}
```

This avoids expensive probing for typical use. The safe limits (8192×8192, 16M pixel area) work on Chrome, Firefox, Safari, Edge, and even old IE9—they're the lowest common denominator from empirical browser testing.

## Clamping while preserving aspect ratio

Once we know the limits, we clamp requested dimensions sequentially:

```typescript
export function clampToBrowserMaxCanvasSize(width: number, height: number) {
	// Fast path check...

	const { maxWidth, maxHeight, maxArea } = getBrowserCanvasMaxSize()
	const aspectRatio = width / height

	// 1. Clamp width
	if (width > maxWidth) {
		width = maxWidth
		height = width / aspectRatio
	}

	// 2. Clamp height
	if (height > maxHeight) {
		height = maxHeight
		width = height * aspectRatio
	}

	// 3. Clamp area
	if (width * height > maxArea) {
		const ratio = Math.sqrt(maxArea / (width * height))
		width *= ratio
		height *= ratio
	}

	return [width, height]
}
```

The order matters. If we clamped width to 32,767px, the aspect ratio might push height above its own limit. We clamp width first, then height, then check if the resulting area still exceeds the limit.

Area clamping uses square root scaling. If the current area is 4× too large, we scale each dimension by √4 = 2. If it's 2× too large, we scale by √2 ≈ 1.414. This preserves aspect ratio because scaling both dimensions by the same factor maintains their ratio.

Example with all three limits exceeded:

- Request: 50,000×25,000 (aspect ratio 2:1)
- Max width: 32,767
- Max height: 32,767
- Max area: 16,777,216 pixels

After width clamp: 32,767×16,383.5 (halved height to maintain 2:1 ratio)

After height clamp: 32,767×16,383.5 (no change, height already under limit)

After area clamp: 32,767×16,383.5 = 536,854,056 pixels (32× too large)

- Scale factor: √(16,777,216 / 536,854,056) ≈ 0.177
- Final: 5,800×2,900

The final dimensions are well under all three constraints and maintain the original 2:1 aspect ratio.

## Integration with export

When exporting to PNG, we multiply logical dimensions by the pixel ratio (typically 2 for high-DPI rendering), clamp the result, then calculate the effective scale:

```typescript
let [clampedWidth, clampedHeight] = clampToBrowserMaxCanvasSize(
	width * pixelRatio,
	height * pixelRatio
)
clampedWidth = Math.floor(clampedWidth)
clampedHeight = Math.floor(clampedHeight)
const effectiveScale = clampedWidth / width
```

The `effectiveScale` is embedded in the PNG's pHYs chunk so image viewers display it at the correct size. If we requested 10,000×5,000 at 2× pixel ratio (20,000×10,000 canvas) but clamped to 16,383×8,191, the effective scale is 1.6383 instead of 2. The viewer sees this metadata and displays the image at 61% of its pixel dimensions instead of 50%.

## Where this lives

The probing and clamping code is in `/packages/editor/src/lib/utils/browserCanvasMaxSize.ts`. It's used in `/packages/editor/src/lib/exports/getSvgAsImage.ts` for diagram exports and in `/packages/tldraw/src/lib/utils/assets/assets.ts` for image downsizing.

The test size arrays come from the [canvas-size](https://github.com/jhildenbiddle/canvas-size) library (MIT licensed), which collected empirical measurements across browser versions. We don't cache results to localStorage because browser limits can change between versions—a stale cached value could cause exports to fail. Probing once per page load is cheap enough.

The silent failure mode in Safari (canvas creation "succeeds" but drawing operations do nothing) is why probing is necessary. There's no error to catch, no warning in the console—just blank images when you exceed the limit. Testing with actual draw-and-read operations is the only reliable detection method.
