---
title: The two-canvas probing trick
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - canvas
  - browser
  - limits
---

# Browser canvas size limits

When we export large documents or high-resolution images, we create canvases that can push against browser limits. The problem is that browsers don't tell you what those limits are. There's no API to query "how big can my canvas be?" The limits vary wildly—Safari allows 8 million pixels tall but only 16 thousand pixels square. Chrome caps any dimension at 32,767 pixels. iOS Safari is even more restrictive.

Worse, when you exceed the limit, the browser doesn't throw an error. It just silently fails. Your canvas appears to be created, `getContext()` returns a context, but drawing operations do nothing. This makes debugging nearly impossible—the code looks correct, but nothing renders.

We solve this by probing. Before creating a canvas for export, we test what the browser can actually handle.

## The probing algorithm

The core idea is to try creating canvases at known size thresholds and see which ones work. We maintain a list of empirically determined limits from testing across browsers—Safari's 4096×4096 area limit, Chrome's 32,767 dimension cap, Firefox's 11,180 square pixel limit, and so on.

The algorithm tests these sizes in descending order, stopping at the first one that succeeds. Three separate probes run: one for maximum width (testing very wide but 1 pixel tall canvases), one for maximum height (1 pixel wide but very tall), and one for maximum area (square canvases).

Here's the interesting part: you can't just draw to a test canvas and check if it worked. Near browser limits, `getImageData()` can fail even when the canvas was successfully allocated. Instead, we use a two-canvas approach.

## The two-canvas trick

For each test size, we create two canvases:

1. A test canvas at the target dimensions
2. A 1×1 "crop" canvas that stays small

We draw a single pixel in the far corner of the test canvas—the bottom-right at coordinates `(width-1, height-1)`. Then we use `drawImage()` to copy just that 1×1 area from the test canvas to the crop canvas:

```typescript
// Draw pixel in far corner of test canvas
testCtx.fillRect(w - 1, h - 1, 1, 1)

// Copy that pixel to the 1x1 crop canvas
cropCtx.drawImage(testCvs, w - 1, h - 1, 1, 1, 0, 0, 1, 1)

// Read from the crop canvas
const isTestPassed = cropCtx.getImageData(0, 0, 1, 1).data[3] !== 0
```

If the alpha channel is non-zero, the test passed. The pixel was successfully drawn and read. If it's zero, the canvas silently failed.

The crop canvas isolates the test. Since it's always 1×1, `getImageData()` definitely works. We're not testing whether we can read pixels at extreme coordinates—we're testing whether the test canvas can be allocated at all. If allocation fails, drawing to it does nothing, and the crop canvas reads back zeros.

## Why this matters

The probing code runs once per session and caches the result. Most exports never trigger it—there's a fast path that returns immediately for canvases under 8192×8192. But when users export very large documents or use high pixel ratios, we need to clamp dimensions to what the browser can handle.

Without probing, we'd either:

- Set conservative limits that waste capability on modern browsers
- Risk silent failures that produce blank exports

The two-canvas approach lets us test aggressively while avoiding the edge cases that make direct pixel reading unreliable near browser limits.

After determining the limits, we clamp the requested canvas size while preserving aspect ratio. For width and height, that's straightforward scaling. For area limits, we scale both dimensions by `sqrt(maxArea / currentArea)` so the proportions stay consistent.

## Memory management

During probing, we create and test many canvases. Each one allocates memory, especially when testing large dimensions. After each test, we explicitly release that memory:

```typescript
testCvs.width = 0
testCvs.height = 0
```

Setting dimensions to zero deallocates the canvas buffer. Without this, memory usage could spike as we test progressively larger sizes.

## Where this lives

The probing code is in `/packages/editor/src/lib/utils/browserCanvasMaxSize.ts`. It's extracted from the [canvas-size](https://github.com/jhildenbiddle/canvas-size) library, which did the empirical browser testing to determine the test sizes.

The limits are used in:

- `/packages/editor/src/lib/exports/getSvgAsImage.ts` — clamping export dimensions
- `/packages/tldraw/src/lib/utils/assets/assets.ts` — downsizing uploaded images

The cached limits are stored in a module-level variable, not localStorage. Browser limits can change between versions, so we don't want stale cached values causing failures.
