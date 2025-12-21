# Browser canvas size limits - raw notes

## Source files

**Primary implementation:**
- `/packages/editor/src/lib/utils/browserCanvasMaxSize.ts` - Main probing and clamping logic
- `/packages/editor/src/lib/exports/getSvgAsImage.ts` - Usage in SVG export pipeline
- `/packages/tldraw/src/lib/utils/assets/assets.ts` - Usage in image downsizing

**Related documentation:**
- `/documentation/nuggets/safari-hell.md` - Safari-specific canvas limits (lines 176-197)
- `/documentation/nuggets/png-scale.md` - PNG metadata handling for scaled exports

## Code attribution

The canvas size probing code is extracted from https://github.com/jhildenbiddle/canvas-size
- MIT License: https://github.com/jhildenbiddle/canvas-size/blob/master/LICENSE
- Copyright (c) John Hildenbiddle

Located at: `/packages/editor/src/lib/utils/browserCanvasMaxSize.ts` lines 22-26

## Constants and safe limits

### Safe dimension constants
File: `/packages/editor/src/lib/utils/browserCanvasMaxSize.ts` lines 28-29

```typescript
const MAX_SAFE_CANVAS_DIMENSION = 8192
const MAX_SAFE_CANVAS_AREA = 4096 * 4096  // 16,777,216 pixels
```

These values represent the universal safe limits that work on ALL tested browsers including old iOS Safari.

### Test size arrays
File: `/packages/editor/src/lib/utils/browserCanvasMaxSize.ts` lines 31-88

The `TEST_SIZES` constant contains empirically determined limits from browser testing:

**Area limits (square side length):**
- 16384 (Chrome 70 Mac/Win, Chrome 68 Android 4.4, Edge 17, Safari 7-12 Mac)
- 14188 (Chrome 68 Android 7.1-9)
- 11402 (Chrome 68 Android 5)
- 11180 (Firefox 63 Mac/Win)
- 10836 (Chrome 68 Android 6)
- 8192 (IE 9-11 Win)
- 4096 (IE Mobile Windows Phone 8.x, Safari iOS 9-12)

**Height limits:**
- 8388607 (Safari 7-12 Mac, Safari iOS 9-12)
- 65535 (Chrome 83 Mac/Win)
- 32767 (Chrome 70 Mac/Win, Chrome 68 Android 4.4-9, Firefox 63 Mac/Win)
- 16384 (Edge 17 Win, IE11 Win)
- 8192 (IE 9-10 Win)
- 4096 (IE Mobile Windows Phone 8.x)

**Width limits:**
- 4194303 (Safari 7-12 Mac, Safari iOS 9-12)
- 65535 (Chrome 83 Mac/Win)
- 32767 (Chrome 70 Mac/Win, Chrome 68 Android 4.4-9, Firefox 63 Mac/Win)
- 16384 (Edge 17 Win, IE11 Win)
- 8192 (IE 9-10 Win)
- 4096 (IE Mobile Windows Phone 8.x)

Notable observations:
- Safari allows HUGE width (4,194,303px) and height (8,388,607px) but small area (16384×16384)
- Chrome caps any dimension at 32,767px (Chrome 70) or 65,535px (Chrome 83+)
- iOS Safari 9-12 is most restrictive: 4096×4096 area limit

## CanvasMaxSize interface

File: `/packages/editor/src/lib/utils/browserCanvasMaxSize.ts` lines 2-6

```typescript
export interface CanvasMaxSize {
	maxWidth: number
	maxHeight: number
	maxArea: number
}
```

Represents the three independent limits that constrain canvas dimensions.

## Caching mechanism

File: `/packages/editor/src/lib/utils/browserCanvasMaxSize.ts` lines 8-20

```typescript
// Cache this, only want to do this once per browser session
let maxCanvasSizes: CanvasMaxSize | null = null

function getBrowserCanvasMaxSize(): CanvasMaxSize {
	if (!maxCanvasSizes) {
		maxCanvasSizes = {
			maxWidth: getCanvasSize('width'),   // test very wide but 1 pixel tall canvases
			maxHeight: getCanvasSize('height'),  // test very tall but 1 pixel wide canvases
			maxArea: getCanvasSize('area'),      // test square canvases
		}
	}
	return maxCanvasSizes
}
```

Important notes:
- Cache is in-memory only (module-level variable)
- NOT persisted to localStorage
- Reason: Browser limits can change between versions, stale cached values could cause failures
- Probing runs once per page load/session maximum

## Probing algorithm

File: `/packages/editor/src/lib/utils/browserCanvasMaxSize.ts` lines 90-135

### Core concept
The browser provides NO API to query canvas size limits. Must probe by attempting to create canvases and testing if they work.

### Algorithm steps

1. **Create 1×1 crop canvas** (lines 95-98)
   - Used as a "reader" canvas to test if drawing succeeded
   - Stays at 1×1 to avoid hitting limits during testing

2. **Iterate through test sizes** (line 100)
   - Tries sizes in descending order (largest to smallest)
   - Stops at first size that works

3. **Create test canvas at target size** (lines 101-107)
   - For width test: size × 1 pixels
   - For height test: 1 × size pixels
   - For area test: size × size pixels (square)

4. **Draw pixel in far corner** (line 109)
   ```typescript
   testCtx.fillRect(w - 1, h - 1, 1, 1)
   ```
   - Always draws in the furthest corner (bottom-right)
   - If canvas failed to allocate, this operation will silently do nothing

5. **Attempt to read pixel via crop canvas** (line 110)
   ```typescript
   cropCtx.drawImage(testCvs, w - 1, h - 1, 1, 1, 0, 0, 1, 1)
   ```
   - Draws the far corner (1×1 area) from test canvas to crop canvas
   - This is the "clever bit": can't just call getImageData on test canvas at coordinates near limit
   - Using intermediate 1×1 canvas isolates the test from weirdness in how browsers handle pixel access near limits

6. **Check if pixel is readable** (line 112)
   ```typescript
   const isTestPassed = cropCtx.getImageData(0, 0, 1, 1).data[3] !== 0
   ```
   - Reads alpha channel (index 3) of the pixel
   - Non-zero alpha means pixel was successfully drawn and read
   - Zero alpha means canvas allocation failed silently

7. **Release memory** (lines 114-115, 119-120)
   ```typescript
   testCvs.width = 0
   testCvs.height = 0
   ```
   - Setting canvas dimensions to 0 releases memory
   - Important when creating many test canvases
   - Prevents memory leaks during probing

8. **Return result** (lines 122-126)
   - For area test: returns `size * size` (total pixels)
   - For width/height test: returns `size` (dimension in pixels)

9. **Error if no size works** (lines 130-134)
   - Throws error if even smallest test size fails
   - Should never happen on real browsers

### Why the two-canvas approach works

Direct approach that doesn't work:
```typescript
// This can fail near browser limits
testCtx.getImageData(w - 1, h - 1, 1, 1)
```

Two-canvas approach that works:
```typescript
// Draw to small canvas, then read from small canvas
cropCtx.drawImage(testCvs, w - 1, h - 1, 1, 1, 0, 0, 1, 1)
cropCtx.getImageData(0, 0, 1, 1)
```

The second canvas is always 1×1, so getImageData definitely works. This isolates the "can the browser handle this size?" question from "can the browser read pixels at this coordinate?"

## Fast-path optimization

File: `/packages/editor/src/lib/utils/browserCanvasMaxSize.ts` lines 138-145

```typescript
export function clampToBrowserMaxCanvasSize(width: number, height: number) {
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

Optimization strategy:
- Check if dimensions are within safe limits (8192×8192, 16M pixels area)
- If yes, return immediately without probing
- Only run expensive probing when approaching browser limits
- Most exports fit within safe limits, so probing rarely runs

### Safe limit rationale
From testing across browsers:
- 8192×8192 dimension works on: Chrome, Firefox, Safari (all versions), Edge, IE9+
- 4096×4096 area (16M pixels) works on: iOS Safari 9-12 (most restrictive)
- These are the lowest common denominator

## Clamping algorithm

File: `/packages/editor/src/lib/utils/browserCanvasMaxSize.ts` lines 147-166

Applies three constraints sequentially while preserving aspect ratio:

### 1. Clamp to max width (lines 150-153)
```typescript
const aspectRatio = width / height

if (width > maxWidth) {
	width = maxWidth
	height = width / aspectRatio
}
```
If width exceeds limit, set width to limit and scale height proportionally.

### 2. Clamp to max height (lines 155-158)
```typescript
if (height > maxHeight) {
	height = maxHeight
	width = height * aspectRatio
}
```
If height exceeds limit (including after width clamping), set height to limit and scale width proportionally.

### 3. Clamp to max area (lines 160-164)
```typescript
if (width * height > maxArea) {
	const ratio = Math.sqrt(maxArea / (width * height))
	width *= ratio
	height *= ratio
}
```

Area clamping math:
- If area is 4× too large, need to scale each dimension by `sqrt(4)` = 2
- If area is 2× too large, need to scale each dimension by `sqrt(2)` ≈ 1.414
- Scaling both dimensions by same factor preserves aspect ratio
- Formula: `scale_factor = sqrt(max_area / current_area)`

Example:
- Current: 20000×10000 = 200M pixels
- Max area: 50M pixels
- Ratio = sqrt(50M / 200M) = sqrt(0.25) = 0.5
- Result: 10000×5000 = 50M pixels

## Usage in SVG export

File: `/packages/editor/src/lib/exports/getSvgAsImage.ts` lines 17-25

```typescript
export async function getSvgAsImage(
	svgString: string,
	options: {
		type: 'png' | 'jpeg' | 'webp'
		width: number
		height: number
		quality?: number
		pixelRatio?: number  // defaults to 2
	}
) {
	const { type, width, height, quality = 1, pixelRatio = 2 } = options

	let [clampedWidth, clampedHeight] = clampToBrowserMaxCanvasSize(
		width * pixelRatio,
		height * pixelRatio
	)
	clampedWidth = Math.floor(clampedWidth)
	clampedHeight = Math.floor(clampedHeight)
	const effectiveScale = clampedWidth / width
```

Key details:
- Input dimensions are logical (CSS pixels)
- Multiplied by pixelRatio (typically 2) for high-DPI rendering
- Clamped AFTER multiplying by pixelRatio
- Floor the results to get integer pixel dimensions
- Calculate `effectiveScale` for PNG metadata

Example flow:
1. User exports 100×100 shape
2. With pixelRatio=2: canvas should be 200×200
3. Clamp (no-op if within limits): still 200×200
4. effectiveScale = 200/100 = 2
5. Canvas created at 200×200
6. effectiveScale=2 embedded in PNG pHYs chunk

Example with clamping:
1. User exports 20000×10000 shape
2. With pixelRatio=2: canvas should be 40000×20000
3. Clamp to Chrome limit (32767): 32767×16383 (preserving aspect ratio)
4. effectiveScale = 32767/20000 = 1.638
5. Canvas created at 32767×16383
6. effectiveScale=1.638 embedded in PNG pHYs chunk

### PNG metadata integration

File: `/packages/editor/src/lib/exports/getSvgAsImage.ts` lines 84-88

```typescript
if (type === 'png') {
	const view = new DataView(await blob.arrayBuffer())
	return PngHelpers.setPhysChunk(view, effectiveScale, {
		type: 'image/' + type,
	})
}
```

The effectiveScale is written to PNG pHYs chunk so image viewers can display at correct size.
- If effectiveScale=2: viewer should display at 0.5× size (for 2× DPI rendering)
- If effectiveScale=1.638: viewer should display at 0.61× size (clamping occurred)

See `/packages/utils/src/lib/media/png.ts` for pHYs chunk implementation details.

## Usage in image downsizing

File: `/packages/tldraw/src/lib/utils/assets/assets.ts` lines 55-69

```typescript
export async function downsizeImage(
	blob: Blob,
	width: number,
	height: number,
	opts = {} as { type?: string; quality?: number }
): Promise<Blob> {
	const { w, h, image } = await MediaHelpers.usingObjectURL(
		blob,
		MediaHelpers.getImageAndDimensions
	)
	const { type = blob.type, quality = 0.85 } = opts
	const [desiredWidth, desiredHeight] = clampToBrowserMaxCanvasSize(
		Math.min(width * 2, w),
		Math.min(height * 2, h)
	)
	// ...create canvas and draw...
}
```

Different usage pattern:
- Takes original image dimensions (w, h)
- Target dimensions (width, height)
- Uses `width * 2` for 2× resolution but caps at original size with `Math.min(width * 2, w)`
- Clamps result to browser limits
- Then creates canvas and draws resized image

This is for resizing uploaded images, not exporting drawings.

## Safari-specific context

From `/documentation/nuggets/safari-hell.md` lines 176-197:

### Historical Safari limits
Safari 7-12 (macOS and iOS 9-12):
- Area: 16,777,216 pixels (4096×4096)
- Height: 8,388,607 pixels
- Width: 4,194,303 pixels

### Silent failure mode
- Creating oversized canvas doesn't throw error
- Canvas appears to be created successfully
- `getContext()` returns null OR drawing operations silently fail
- Makes debugging difficult - code looks correct but nothing renders

This is why probing is necessary - there's no error to catch, just silent failure.

## Mathematical foundations

### Aspect ratio preservation

Original aspect ratio: `r = w / h`

After clamping width to W:
- new_width = W
- new_height = W / r = W / (w/h) = W × h/w

After clamping height to H:
- new_height = H
- new_width = H × r = H × (w/h)

### Area scaling

Given area limit A and current dimensions (w, h):
- Current area: w × h
- Need: w' × h' = A where w'/h' = w/h (preserve aspect ratio)
- Let scale factor s such that: w' = s×w and h' = s×h
- Then: (s×w) × (s×h) = A
- So: s² × w × h = A
- Therefore: s = sqrt(A / (w×h))

## Edge cases

### What if all three limits are exceeded?
The sequential clamping handles this:
1. First clamps width (may increase height if aspect ratio is tall)
2. Then clamps height (may decrease width if previous step made it too tall)
3. Finally clamps area (scales both down if still too large)

The order matters. If area was clamped first, the result might still exceed width or height limits.

### What if aspect ratio is extreme?
Example: 1000×1 image (1000:1 aspect ratio)
- MaxWidth = 100, MaxHeight = 100, MaxArea = 5000
- After width clamp: 100×0.1 (aspect ratio preserved)
- After height clamp: no change (0.1 < 100)
- After area clamp: no change (100×0.1 = 10 < 5000)
- Result: 100×0.1

Example: 1×1000 image (1:1000 aspect ratio)
- MaxWidth = 100, MaxHeight = 100, MaxArea = 5000
- After width clamp: no change (1 < 100)
- After height clamp: 1×100 → 0.1×100 (aspect ratio preserved)
- After area clamp: no change (0.1×100 = 10 < 5000)
- Result: 0.1×100

Wait, that's wrong. Let me recalculate:

Example: 1×1000 image (1:1000 aspect ratio), aspect_ratio = 1/1000 = 0.001
- After width clamp: no change (1 < 100)
- After height clamp: height = 100, width = 100 × 0.001 = 0.1
- After area clamp: 0.1×100 = 10 < 5000, no change
- Result: 0.1×100

But then the aspect ratio is 0.1/100 = 0.001 ✓ correct

### What about sub-pixel dimensions?
The code uses `Math.floor()` after clamping in getSvgAsImage (line 23-24):
```typescript
clampedWidth = Math.floor(clampedWidth)
clampedHeight = Math.floor(clampedHeight)
```

This ensures integer pixel dimensions, which canvases require.

## Behavioral notes

### When probing runs
- First call to `clampToBrowserMaxCanvasSize()` with dimensions exceeding safe limits
- Subsequent calls use cached result
- Never runs if all canvases stay within safe limits (common case)

### Performance characteristics
- Probing creates 3-21 test canvases (3 lists of 7, 6, 6 sizes)
- Each canvas creation + draw + read is expensive
- But happens max once per session
- Most sessions never trigger it (safe-size fast path)

### Memory management
During probing, many canvases are created and destroyed. The code explicitly sets canvas dimensions to 0 to release memory:
```typescript
testCvs.width = 0
testCvs.height = 0
```

Without this, memory usage could spike during probing, especially when testing large dimensions.

## Browser-specific behaviors

### Chrome
- Modern Chrome (70+): 32,767px limit on any dimension
- Newer Chrome (83+): 65,535px limit
- Consistent area limit across versions

### Firefox
- 32,767px limit on width/height
- 11,180px square (area limit)

### Safari Desktop
- Allows enormous width (4,194,303px)
- Allows enormous height (8,388,607px)
- But restricts area to 16,384×16,384 (268M pixels)
- This asymmetry means a 4M×1 canvas works but 20000×20000 doesn't

### Safari iOS
- Much more restrictive than desktop
- 4,096×4,096 area limit on older versions (iOS 9-12)
- This is the "lowest common denominator" that informs safe limits

### IE/Edge
- IE9-11: 8,192px - 16,384px limits
- Edge 17: 16,384px limits
- Largely irrelevant now but test sizes include them for historical reasons

## Testing approach

The test sizes are based on empirical testing, not browser specs:
- Someone (original canvas-size library author) tested on actual browser versions
- Recorded the limits that worked
- Organized them in descending order for efficient probing
- Comments document which browser/version each limit comes from

This is necessary because:
- No standardized canvas size limits in HTML spec
- Each browser implements their own limits
- Limits change between browser versions
- Limits depend on device memory and OS
- No way to query limits via API

## Related systems

### PNG pHYs chunk
File: `/packages/utils/src/lib/media/png.ts` lines 299-336

After clamping, the effectiveScale is embedded in PNG metadata:
```typescript
const DPI_72 = 2835.5  // 72 DPI in pixels per meter
pHYsDataView.setInt32(8, DPI_72 * dpr)   // X resolution
pHYsDataView.setInt32(12, DPI_72 * dpr)  // Y resolution
pHYsDataView.setInt8(16, 1)              // unit = meters
```

The value 2835.5 = 72 DPI converted to pixels per meter:
- 72 pixels per inch
- 1 inch = 0.0254 meters
- 72 / 0.0254 = 2834.645... ≈ 2835.5

When effectiveScale = 1.638 (clamped):
- pHYs stores: 2835.5 × 1.638 = 4643 pixels per meter
- Viewer interprets: display at 1.638× scale = 0.61× size

### File size implications
Clamping reduces canvas size, which reduces exported file size:
- Original 40000×20000 = 800M pixels
- Clamped 32767×16383 = 537M pixels
- 33% fewer pixels = ~33% smaller PNG (depends on compression)

This is actually a benefit - users get working exports that are also smaller.

## User experience tradeoffs

### When clamping occurs
Extreme cases:
- Very large documents exported at high resolution
- Zoomed-out overview of massive canvas
- High DPI (3×) export of already-large content

Typical users never hit this.

### Quality impact
When clamped from 40000×20000 to 32767×16383:
- Slight reduction in sharpness
- Usually imperceptible unless zooming in heavily
- Much better than complete failure (blank image)

### No user notification
The code doesn't warn users when clamping occurs:
- Happens silently
- Export succeeds at reduced resolution
- User gets working image

Alternative would be showing "Canvas too large, exporting at reduced resolution" warning, but this adds complexity and users might not understand.

## Alternative approaches considered

### Server-side rendering
Could render large canvases on server with fewer limits:
- Node.js canvas libraries have higher limits
- Or no limits (just memory constraints)
- But requires server infrastructure
- Adds latency, complexity, cost
- Client-side is simpler and faster for most cases

### Tiled rendering
Could render oversized canvas as tiles and stitch together:
- Render 4 quarters of 40000×20000 canvas
- Each quarter is 20000×10000 (might still exceed limits)
- Stitch together in final image
- Very complex, lots of edge cases
- Questionable benefit vs just clamping

### WebGL rendering
WebGL has different size limits (texture size limits):
- Not the same as canvas 2d limits
- Usually similar magnitude
- Would require rewriting entire rendering system
- Not worth it just for rare large exports

The current approach (probe and clamp) is the pragmatic solution.
