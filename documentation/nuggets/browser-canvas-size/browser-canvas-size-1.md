---
title: The two-canvas probing trick
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - browser
  - canvas
  - size
---

# The two-canvas probing trick

When we implemented image export in tldraw, we discovered that browsers have maximum canvas sizes—and no API to tell you what they are. Worse, exceeding the limit doesn't throw an error. The canvas just doesn't work.

Try to create a 50,000×50,000 canvas in Chrome and call `getContext('2d')`. It returns a context object. Draw something. No error. Export the image. Blank. The browser accepted your request, gave you a context, let you draw, and produced nothing.

This silent failure makes detection tricky. We can't just try to create a canvas and catch an exception. So we probe.

## The naive approach that fails

The obvious probing strategy: create a canvas at a given size, draw a pixel, read it back:

```typescript
function testSize(width: number, height: number): boolean {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  ctx.fillRect(width - 1, height - 1, 1, 1)
  const pixel = ctx.getImageData(width - 1, height - 1, 1, 1)
  return pixel.data[3] !== 0 // Check alpha channel
}
```

This works for reasonable sizes. But near browser limits, `getImageData` itself can behave strangely—returning zeros even when the canvas technically exists, or failing to read from coordinates near the edge. The problem we're trying to detect interferes with our detection method.

## The two-canvas solution

We use an intermediate canvas to isolate the "did the draw work?" question from the "can I read at these coordinates?" question:

```typescript
function testSize(width: number, height: number): boolean {
  const testCanvas = document.createElement('canvas')
  testCanvas.width = width
  testCanvas.height = height
  const testCtx = testCanvas.getContext('2d')!

  // Draw a pixel in the far corner
  testCtx.fillRect(width - 1, height - 1, 1, 1)

  // Create a tiny 1×1 canvas to read the result
  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = 1
  cropCanvas.height = 1
  const cropCtx = cropCanvas.getContext('2d')!

  // Copy the far corner to our crop canvas
  cropCtx.drawImage(testCanvas, width - 1, height - 1, 1, 1, 0, 0, 1, 1)

  // Now read from the crop canvas at (0,0)—guaranteed to work
  const pixel = cropCtx.getImageData(0, 0, 1, 1)
  return pixel.data[3] !== 0
}
```

The crop canvas is always 1×1. Reading pixel (0,0) from a 1×1 canvas will never hit size limits. By drawing from the test canvas to the crop canvas, we test whether the test canvas actually contains data at the far corner.

If the test canvas failed to allocate, the `drawImage` call silently draws nothing, and we read back a transparent pixel. If it succeeded, we read back the opaque pixel we drew.

## Probing the three limits

Browsers constrain canvases in three ways: maximum width, maximum height, and maximum area (total pixels). A canvas can exceed any one of these and fail. Safari, for example, allows canvases millions of pixels wide but restricts total area.

We probe each limit independently:

```typescript
function getBrowserCanvasMaxSize() {
  return {
    maxWidth: probeLimit('width'),   // Test N×1 canvases
    maxHeight: probeLimit('height'), // Test 1×N canvases
    maxArea: probeLimit('area'),     // Test N×N canvases
  }
}
```

For width, we test canvases like 65535×1, 32767×1, 16384×1 in descending order. The first size that passes becomes `maxWidth`. Same for height (1×65535, etc.) and area (65535×65535, etc.).

The test sizes come from empirical browser testing—Chrome 83+ allows 65535, Chrome 70 allows 32767, Firefox allows 32767, and so on. We binary search through known limits rather than doing an actual binary search, since we already know the universe of values browsers use.

## Memory cleanup

During probing, we create many large canvases. Setting dimensions to zero releases the memory:

```typescript
testCanvas.width = 0
testCanvas.height = 0
```

Without this, memory usage spikes. It's especially important when testing large sizes that might succeed—a 32767×1 canvas that works still allocates 32K pixels.

## The fast path

Most exports never trigger probing. We define "safe" limits that work on every browser we've tested:

```typescript
const MAX_SAFE_CANVAS_DIMENSION = 8192
const MAX_SAFE_CANVAS_AREA = 4096 * 4096  // 16,777,216 pixels
```

Before probing, we check if the requested dimensions fit:

```typescript
if (width <= 8192 && height <= 8192 && width * height <= 16777216) {
  return [width, height]  // No probing needed
}
```

The safe limits are conservative—the worst-case browser (iOS Safari 9-12) supports 4096×4096 area. Most browsers allow much more, but we only probe to find out when someone actually needs more than the safe limits.

## The tradeoff

We cache probe results for the session but not to localStorage. Browser limits can change between versions, and stale cached values could cause silent export failures. The probing cost is acceptable—it runs at most once per session, and most sessions never trigger it at all.

The two-canvas trick lets us detect the undetectable: a canvas that looks fine but renders nothing. It's not elegant, but it's the only reliable way we've found.

## Key files

- `/packages/editor/src/lib/utils/browserCanvasMaxSize.ts` - Probing and clamping logic
- `/packages/editor/src/lib/exports/getSvgAsImage.ts` - Usage in SVG export
