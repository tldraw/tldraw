---
title: Why browsers fail silently
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - canvas
  - browser
  - limits
status: published
date: 12/21/2025
order: 2
---

# Browser canvas size limits

When we added high-resolution image export to tldraw, we ran into a problem: browsers don't tell you how large a canvas can be. Safari desktop allows 4 million pixel widths but iOS Safari caps at 4096×4096. Chrome's limits change between versions. There's no spec.

The solution is to probe—create test canvases at various sizes and check if they work. Here's what we learned about browser canvas limits and why they're all over the place.

## No standard, no API

The HTML canvas spec doesn't define size limits. Browsers implement their own constraints based on memory, GPU limits, and implementation details. Some browsers changed their limits between versions. Chrome 70 capped dimensions at 32,767px, but Chrome 83 raised it to 65,535px.

There's no API to query these limits. You can't ask the browser "what's the largest canvas you support?" You have to try creating one and see if it works.

## Why browsers fail silently

Creating an oversized canvas doesn't throw an error. The browser returns a valid canvas object, but when you try to draw on it, operations silently do nothing. Safari is particularly frustrating—`getContext()` might return null, or it might return a context that simply doesn't render anything.

This makes debugging painful. Your code looks correct, the canvas exists, but nothing appears. Without knowing the limits ahead of time, you'd just see blank exports.

## Three independent limits

Browsers constrain canvases in three ways:

1. **Max width** — Widest possible canvas (height = 1)
2. **Max height** — Tallest possible canvas (width = 1)
3. **Max area** — Largest square canvas

These limits are independent. Safari desktop has fascinating asymmetry:

- Width: 4,194,303px
- Height: 8,388,607px
- Area: 16,384×16,384 (268M pixels)

A 4M×1 canvas works. A 20,000×20,000 canvas doesn't, even though it's smaller in both dimensions, because the area exceeds the limit.

## Test sizes from empirical data

We probe using test sizes extracted from actual browser testing. These numbers come from the `canvas-size` library, which tested across real browser versions:

**Area limits (square side length):**

- 16384 — Chrome 70 Mac/Win, Safari 7-12 Mac
- 14188 — Chrome 68 Android 7.1-9
- 11402 — Chrome 68 Android 5
- 11180 — Firefox 63 Mac/Win
- 8192 — IE 9-11 Win
- 4096 — IE Mobile, Safari iOS 9-12

**Width limits:**

- 4,194,303 — Safari 7-12 Mac/iOS
- 65,535 — Chrome 83+
- 32,767 — Chrome 70, Firefox 63
- 16,384 — Edge 17, IE11
- 4,096 — IE Mobile

**Height limits:**

- 8,388,607 — Safari 7-12 Mac/iOS
- 65,535 — Chrome 83+
- 32,767 — Chrome 70, Firefox 63
- 16,384 — Edge 17, IE11
- 4,096 — IE Mobile

iOS Safari is the most restrictive modern browser at 4096×4096. That's why our safe fallback constants are 8192×8192 with 16M pixel area—the lowest common denominator that works everywhere.

## Probing algorithm

We test each dimension separately, trying sizes in descending order until one works:

1. Create a 1×1 "crop canvas" for reading test results
2. For each test size, create a canvas at the target dimensions
3. Draw a single pixel in the far corner (bottom-right)
4. Use `drawImage()` to copy that corner onto the crop canvas
5. Read the pixel from the crop canvas
6. If the alpha channel is non-zero, the test passed

The two-canvas approach is the clever part. We can't just call `getImageData()` directly on the test canvas at coordinates near the limit—browsers behave inconsistently when reading pixels at extreme positions. By drawing to a small intermediate canvas and reading from there, we isolate the "can the browser handle this size?" question from "can the browser read pixels at this coordinate?"

We cache the result for the session. Limits don't change while the page is loaded, but we don't persist to localStorage because browser versions can update between sessions and stale cached values could cause failures.

## Clamping with aspect ratio preservation

Once we know the limits, we clamp requested canvas dimensions while preserving aspect ratio. This happens in three sequential steps:

```typescript
const aspectRatio = width / height

if (width > maxWidth) {
	width = maxWidth
	height = width / aspectRatio
}

if (height > maxHeight) {
	height = maxHeight
	width = height * aspectRatio
}

if (width * height > maxArea) {
	const ratio = Math.sqrt(maxArea / (width * height))
	width *= ratio
	height *= ratio
}
```

The area scaling uses a square root because both dimensions need to scale by the same factor. If the area is 4× too large, each dimension scales by √4 = 2. If it's 2× too large, each scales by √2 ≈ 1.414.

The sequential order matters. If you clamped area first, the result might still exceed width or height limits. Clamping width first, then height, then area ensures all three constraints are satisfied.

## Fast path optimization

Most exports fit comfortably within safe limits, so we avoid probing entirely for small canvases:

```typescript
if (width <= 8192 && height <= 8192 && width * height <= 16777216) {
	return [width, height]
}

// Only probe when we need to
const { maxWidth, maxHeight, maxArea } = getBrowserCanvasMaxSize()
```

This means the expensive probing code rarely runs. For typical exports—a few hundred to a few thousand pixels on a side—we return immediately without creating any test canvases.

## When it matters

Clamping happens during high-DPI exports. Users export a 10,000×5,000 shape at 2× resolution, requesting a 20,000×10,000 canvas. On Chrome that works fine (under the 32,767px limit). On iOS Safari it doesn't—4096×4096 area limit means the canvas gets clamped to roughly 4096×2048.

We don't notify users when this happens. The export succeeds at reduced resolution. It's a better experience than showing an error or producing a blank image, and the quality difference is usually imperceptible unless you zoom in heavily.

The effective scale is written to PNG metadata (pHYs chunk) so image viewers can display at the correct size. If we clamp from 2× to 1.638×, that information is preserved in the file.

## Tradeoffs

We chose silent clamping over user notification. Showing a "canvas too large, exporting at reduced resolution" warning adds complexity and might confuse users who don't understand canvas limits. The alternative—failing the export entirely—is worse. Silently producing a working image at slightly reduced resolution is the pragmatic choice.

The probing cost is acceptable. It runs once per session maximum, only when approaching browser limits, and most sessions never trigger it. The test canvases are created and destroyed quickly with explicit memory release (setting dimensions to 0).

## Where to find it

The probing and clamping code is in `/packages/editor/src/lib/utils/browserCanvasMaxSize.ts`. It's used in:

- `/packages/editor/src/lib/exports/getSvgAsImage.ts` — SVG to PNG/JPEG/WebP export
- `/packages/tldraw/src/lib/utils/assets/assets.ts` — Image downsizing for uploads

The code is adapted from the [canvas-size](https://github.com/jhildenbiddle/canvas-size) library (MIT licensed), which did the hard work of empirically testing browser limits across versions and devices.
