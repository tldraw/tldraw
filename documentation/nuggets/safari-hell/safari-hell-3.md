---
title: Safari quirks and workarounds
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - Safari
  - browser
  - workarounds
status: published
date: 12/21/2025
order: 2
---

# Safari quirks and workarounds

Safari has some delightful quirks. Canvas size limits that vary by dimension. Fonts that load after their load event fires. An invisible text caret that comes and goes. We've hit most of them by now, and this article walks through the ones that caused the most trouble.

## Canvas size limits

Browsers impose different maximum sizes for canvas elements. Chrome caps width and height at 65,535 pixels. Safari allows 4,194,303 pixels wide but only 8,388,607 pixels tall—and the total area can't exceed 16,777,216 pixels.

These limits are both arbitrary and silent. Call `createElement('canvas')` with dimensions that exceed the limits and you get a canvas. Call `getContext('2d')` and you get a context. Try to draw and nothing happens. No error, no warning, just quiet failure.

We detect the actual limits by probing. Create a test canvas at a candidate size, draw a single pixel in the bottom-right corner, copy it to a second canvas, and check if the pixel is visible. If it shows up, that size is supported. If not, the canvas creation failed silently and we try the next size down.

```typescript
export function getCanvasSize(dimension: 'width' | 'height' | 'area') {
	const cropCvs = document.createElement('canvas')
	cropCvs.width = 1
	cropCvs.height = 1
	const cropCtx = cropCvs.getContext('2d')!

	for (const size of TEST_SIZES[dimension]) {
		const w = dimension === 'height' ? 1 : size
		const h = dimension === 'width' ? 1 : size

		const testCvs = document.createElement('canvas')
		testCvs.width = w
		testCvs.height = h
		const testCtx = testCvs.getContext('2d')!

		testCtx.fillRect(w - 1, h - 1, 1, 1)
		cropCtx.drawImage(testCvs, w - 1, h - 1, 1, 1, 0, 0, 1, 1)

		const isTestPassed = cropCtx.getImageData(0, 0, 1, 1).data[3] !== 0

		testCvs.width = 0
		testCvs.height = 0

		if (isTestPassed) {
			cropCvs.width = 0
			cropCvs.height = 0
			return dimension === 'area' ? size * size : size
		}
	}

	throw Error('Failed to determine maximum canvas dimension')
}
```

The array of test sizes includes known limits for Safari 7-12, Chrome 68-83, Firefox 63, Edge 17, and IE 9-11. We test in descending order and cache the first one that succeeds.

When we need to render something—like exporting a selection to PNG—we clamp the requested dimensions to fit within the detected limits. If clamping by width or height isn't enough, we scale down the entire canvas to fit within the area limit.

```typescript
export function clampToBrowserMaxCanvasSize(width: number, height: number) {
	const { maxWidth, maxHeight, maxArea } = getBrowserCanvasMaxSize()
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

	return [width, height]
}
```

This detection code comes from the [canvas-size](https://github.com/jhildenbiddle/canvas-size) library, which maintains a comprehensive database of browser canvas limits.

## SVG font loading delay

When we export shapes to PNG, we first render them to SVG, load that SVG as an image, draw the image to a canvas, and extract the PNG. This works—except in Safari, where the `onload` event for SVG images fires before embedded fonts are ready.

The `Image` object fires `onload` immediately when the SVG data is available, but Safari's rendering engine hasn't finished loading the fonts referenced in the SVG. Draw the image to canvas at that moment and you get system fallback fonts instead of the fonts you specified.

WebKit bug 219770, filed in 2020 and still open, documents this issue. There's no programmatic way to know when the fonts are actually ready. No promise, no event, no callback.

So we wait.

```typescript
const canvas = await new Promise<HTMLCanvasElement | null>((resolve) => {
	const image = Image()
	image.crossOrigin = 'anonymous'

	image.onload = async () => {
		// Safari will fire `onload` before the fonts in the SVG are
		// actually loaded. Waiting around a while is brittle, but
		// there's no better solution for now. See
		// https://bugs.webkit.org/show_bug.cgi?id=219770
		if (tlenv.isSafari) {
			await sleep(250)
		}

		const canvas = document.createElement('canvas')
		const ctx = canvas.getContext('2d')!
		canvas.width = clampedWidth
		canvas.height = clampedHeight
		ctx.drawImage(image, 0, 0, clampedWidth, clampedHeight)
		resolve(canvas)
	}

	image.onerror = () => resolve(null)
	image.src = svgUrl
})
```

250 milliseconds. Pure voodoo. It works most of the time, fails if fonts are slow to load, and there's no better alternative within the constraints WebKit provides.

## Apple Pencil double-tap zoom

iOS Safari has a feature where double-tapping with the Apple Pencil shows a magnifying loupe. This is useful for reading small text on web pages. It's catastrophic in a drawing app, where natural drawing gestures frequently include double-taps.

We suppress the default behavior by intercepting touch events when the pointer type is `'pen'`:

```typescript
const handleEvent = (e: PointerEvent | TouchEvent) => {
	if (e instanceof PointerEvent && e.pointerType === 'pen') {
		editor.markEventAsHandled(e)
		const { target } = e

		// Allow events to propagate if editing a shape or in text inputs
		if (
			IGNORED_TAGS.includes((target as Element).tagName?.toLocaleLowerCase()) ||
			(target as HTMLElement).isContentEditable ||
			editor.isIn('select.editing_shape')
		) {
			return
		}

		preventDefault(e)
	}
}
```

We let the default behavior through for text areas, inputs, and content-editable elements—places where the magnifying glass might actually be useful. Everywhere else we prevent it, preserving the drawing flow.

## Text caret visibility

Sometimes on iOS Safari, the text caret disappears. The input has focus, typing works, but there's no visible cursor. The bug is intermittent enough that we can't reproduce it reliably, but common enough that users notice.

The fix is to blur and immediately refocus the input:

```typescript
useEffect(() => {
	if (!isEditing) return

	if (document.activeElement !== rInput.current) {
		rInput.current?.focus()
	}

	if (editor.getInstanceState().isCoarsePointer) {
		rInput.current?.select()
	}

	// This fixes iOS not showing the caret sometimes.
	// This "shakes" the caret awake.
	if (tlenv.isSafari) {
		rInput.current?.blur()
		rInput.current?.focus()
	}
}, [editor, isEditing])
```

We don't know why the caret disappears. We don't know why the blur/focus cycle helps. It works empirically, so we do it.

## Perspective

Safari quirks accumulate. Some have documented bugs, some have workarounds, and some—like the caret visibility issue—are just mysteries we've solved through trial and error. The canvas limits are discoverable, the font loading is documented (if unfixed), and the Apple Pencil behavior is intentional but needs suppression.

These solutions live in:

- `/packages/editor/src/lib/utils/browserCanvasMaxSize.ts` — Canvas size detection and clamping
- `/packages/editor/src/lib/exports/getSvgAsImage.ts` — SVG font loading delay
- `/packages/editor/src/lib/hooks/useFixSafariDoubleTapZoomPencilEvents.ts` — Apple Pencil zoom suppression
- `/packages/tldraw/src/lib/shapes/shared/useEditablePlainText.ts` — Caret visibility fix

The other Safari issues—text shadow performance, culled element viewport bugs, gesture event differences, and clipboard synchronous requirements—deserve their own articles. This one covers the most frustrating: silent failures and race conditions with no good solutions.
