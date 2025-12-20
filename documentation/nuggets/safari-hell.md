# Safari quirks and workarounds

Safari behaves differently than other browsers. This isn't carelessness—it's a consequence of WebKit's rendering architecture, iOS's security model, and Apple's API design choices. For web apps that push the platform (canvas-heavy UIs, touch-first interactions, clipboard operations), these differences force workarounds that range from clever to desperate.

This article catalogs the Safari-specific issues we've encountered and the solutions we've implemented, with enough context that you can recognize and handle these problems in your own projects.

## Text shadow performance cliff

CSS text shadows are cheap in Chrome and Firefox. They're expensive in Safari. When rendering hand-drawn text with outline effects (implemented via text-shadow), Chrome handles dozens of animated shapes smoothly. Safari stutters noticeably during pan and zoom.

The performance gap isn't subtle. A canvas with 50 text shapes with shadows runs at 60fps in Chrome and drops to 20fps in Safari during camera movement. The cause is how Safari's compositor handles text shadows—it doesn't batch or optimize them the way other browsers do.

The pragmatic solution: disable text shadows entirely on Safari.

```typescript
if (rMemoizedStuff.current.allowTextOutline && tlenv.isSafari) {
	container.style.setProperty('--tl-text-outline', 'none')
	rMemoizedStuff.current.allowTextOutline = false
}
```

On Chrome, we use level-of-detail logic to hide shadows when zoomed out (where they're not visible anyway). On Safari, we skip them at all zoom levels. Users don't notice—they just notice the app feels faster.

**Lesson**: If a visual effect causes performance problems on Safari but not Chrome, check if you can disable it selectively. The rendering pipeline differences between browsers mean some operations that are cheap in one are expensive in another.

## Culled elements don't reappear

Safari has a viewport culling bug. When a DOM element leaves the viewport (we remove it or set `display: none`), then returns to the viewport, Safari sometimes doesn't render it until the user scrolls or resizes the window. The browser seems to cache the "nothing here" state and doesn't invalidate it when content returns.

This breaks any app that dynamically shows/hides elements based on viewport position—virtualized lists, canvas shape culling, infinite scrollers. The element is in the DOM, styles are correct, but Safari refuses to paint it until forced.

The workaround: force a reflow when the set of culled elements changes.

```typescript
function ReflowIfNeeded() {
	useQuickReactor('reflow for culled shapes', () => {
		const culledShapes = editor.getCulledShapes()
		// ...check if set changed...

		const canvas = document.getElementsByClassName('tl-canvas')
		// Reading offsetHeight forces the browser to recalculate layout
		const _height = (canvas[0] as HTMLDivElement).offsetHeight
	})
	return null
}
```

Reading any layout property (`offsetHeight`, `getBoundingClientRect()`, etc.) forces the browser to synchronously recalculate layout. This is normally expensive and should be avoided, but it's the only way to wake Safari up when it gets stuck in the "nothing to paint" state.

This component only renders on Safari. Chrome and Firefox don't need it.

**Lesson**: If elements disappear and don't come back in Safari, you're hitting the culling cache bug. Force a reflow by reading a layout property when your visibility set changes.

## SVG font loading has no reliable signal

When exporting SVG to PNG, the standard flow is: create SVG string → load into `<img>` element → draw to canvas → export as image. The img's `onload` event should fire when the image is fully ready to render, including any embedded fonts.

Safari fires `onload` before fonts in the SVG are actually loaded. Draw the image to canvas immediately and you'll get fallback fonts or missing text. There's no font-ready event on SVG images, no promise to await, no way to detect when fonts are truly ready.

The workaround: wait 250ms and hope.

```typescript
image.onload = async () => {
	// Safari will fire `onload` before the fonts in the SVG are
	// actually loaded. Just waiting around a while is brittle, but
	// there doesn't seem to be any better solution for now.
	// See https://bugs.webkit.org/show_bug.cgi?id=219770
	if (tlenv.isSafari) {
		await sleep(250)
	}

	const canvas = document.createElement('canvas')
	const ctx = canvas.getContext('2d')
	ctx.drawImage(image, 0, 0)
	// ...
}
```

This is fragile. If the fonts take longer than 250ms to load (slow network, complex fonts, busy system), the export will still have wrong fonts. But there's no better option. The WebKit bug has been open since 2020 with no fix.

This pattern applies to any situation where you need to render SVG with custom fonts to canvas—screenshot tools, PDF generators, image processors. If you're exporting SVGs on Safari, you need this delay.

**Lesson**: When working with SVG images and custom fonts on Safari, assume `onload` fires too early. Add a delay before rendering to canvas. Yes, it's hacky. No, there's no better way.

## Apple Pencil double-tap triggers zoom loupe

iOS Safari has a zoom loupe feature: double-tap with an Apple Pencil and it magnifies the area under the stylus. This is useful for reading small text. It's catastrophic for drawing apps.

Users sketching with an Apple Pencil double-tap constantly—it's part of natural drawing motion. Each time, iOS hijacks the interface to show the zoom UI. The app loses pointer events, the drawing is interrupted, and the user is confused.

The solution: intercept touch events from pen input and prevent their default behavior.

```typescript
const handleEvent = (e: PointerEvent | TouchEvent) => {
	if (e instanceof PointerEvent && e.pointerType === 'pen') {
		editor.markEventAsHandled(e)

		// Allow events for text inputs and contenteditable elements
		if (
			IGNORED_TAGS.includes((target as Element).tagName?.toLowerCase()) ||
			(target as HTMLElement).isContentEditable
		) {
			return
		}

		preventDefault(e)
	}
}

elm.addEventListener('touchstart', handleEvent)
elm.addEventListener('touchend', handleEvent)
```

The challenge: knowing when to suppress the event and when to let it through. Users should still be able to tap into text fields and interact with standard UI elements. The detection logic checks if the target is an input, textarea, or contenteditable element before suppressing.

This pattern applies to any web app that uses stylus input—drawing tools, note-taking apps, whiteboarding software, digital art tools.

**Lesson**: If your app uses Apple Pencil input, you probably need to suppress default touch behavior to prevent iOS's zoom loupe from interfering. But preserve it for text input elements or you'll break typing.

## Text caret doesn't appear reliably

Sometimes when focusing a text input on iOS Safari, the blinking cursor doesn't appear. The input is focused, typing works, but you can't see where you're typing. This happens randomly—not consistently reproducible, but common enough to frustrate users.

The fix: blur and immediately refocus the input when entering editing mode.

```typescript
// This "shakes" the caret awake.
if (tlenv.isSafari) {
	rInput.current?.blur()
	rInput.current?.focus()
}
```

This is pure voodoo. Losing and regaining focus somehow causes Safari to realize it should draw the caret. We don't know why the caret disappears in the first place, or why this workaround helps, but empirically it does.

**Lesson**: If iOS Safari sometimes doesn't show the text cursor when focusing an input, try blur/focus cycling. It's not elegant, but it's the only reliable fix we've found.

## Gesture events work differently on desktop and mobile

Safari's gesture handling splits into two incompatible modes: trackpad on macOS, and touch on iOS. Both use the same gesture APIs, but with completely different event patterns.

A two-finger pinch on a MacBook trackpad fires `gesturechange` events with zero touches. The exact same gesture on an iPhone fires `pointermove` events with two touches. The gesture recognition library needs to handle both, but the event objects have different shapes.

The detection:

```typescript
// In (desktop) Safari, a two-finger trackpad pinch will be a "gesturechange"
// event and will have 0 touches; on iOS, a two-finger pinch will be a
// "pointermove" event with two touches.
const isSafariTrackpadPinch = gesture.type === 'gesturechange' || gesture.type === 'gestureend'
```

This distinction matters because the zoom state machine behaves differently in the two modes. On trackpad, pinch is always zoom. On touch, pinch might be zoom or pan depending on whether the center point is moving or the distance between fingers is changing.

This affects any web app with pinch-to-zoom or two-finger pan on Safari—maps, image viewers, canvas tools, photo editors.

**Lesson**: Don't assume gesture events work the same way on desktop Safari and iOS Safari. Check the event type to distinguish trackpad gestures from touch gestures, and handle each appropriately.

## Clipboard operations must be synchronous

WebKit enforces that clipboard writes must happen synchronously from a user gesture. If you start the copy operation, then await a promise, then write to the clipboard, Safari rejects it. The browser considers the async gap as breaking the "user intent" chain.

```typescript
// Note: This needs to be a synchronous call in WebKit, otherwise it
// won't think that we have user intent to copy and will fail silently.
```

This makes sense from a security perspective—clipboard access is powerful and shouldn't be triggerable by arbitrary code. But it complicates any app that needs to do async work before copying (generating images, fetching data, transforming content).

The workaround: prepare clipboard data synchronously, or split the operation into "user clicks → prepare data → write immediately" with no awaits between the click and the write.

Safari also doesn't provide file type information when pasting files from Finder, requiring extra detection logic to handle files without MIME types.

**Lesson**: On Safari, clipboard writes must be synchronous from the user gesture. Structure your copy/paste code to avoid async gaps, or Safari will silently reject the operation.

## Canvas size limits vary by version

Different Safari versions have different maximum canvas sizes. Older versions (Safari 7-12 on macOS, iOS 9-12) have particularly restrictive limits:

- **Area**: 16,777,216 pixels total (4096 × 4096)
- **Height**: 8,388,607 pixels max
- **Width**: 4,194,303 pixels max

Creating a canvas larger than these limits doesn't throw an error. The canvas appears to be created successfully, but `getContext()` returns null or drawing operations fail silently. This makes debugging difficult—your code looks correct but nothing renders.

The solution: probe the limits at runtime and clamp canvas dimensions before creating.

```typescript
let [clampedWidth, clampedHeight] = clampToBrowserMaxCanvasSize(
	width * pixelRatio,
	height * pixelRatio
)
```

This matters for any feature that creates large canvases—export to image, thumbnails of zoomed-out views, full-document renders, high-DPI screenshots.

**Lesson**: Don't assume canvas size limits are consistent across browsers or Safari versions. Probe at runtime and clamp dimensions to avoid silent failures.

## Blurry content when zoomed

When zooming a canvas, Chrome renders shapes at full resolution and then scales the display. Safari does the opposite: it rasterizes the content at the current resolution, then scales the already-baked pixels. The result is that zoomed-in content appears blurry on Safari—you're looking at scaled-up texture, not re-rendered vectors.

This is a fundamental difference in how the browser compositor works. Chrome prioritizes sharpness, Safari prioritizes performance. There's no CSS property or API to change this behavior.

We haven't found a workaround that doesn't destroy performance. Re-rendering everything at the zoomed scale would be sharp but too expensive. Living with the blur is the pragmatic choice.

**Lesson**: Safari and Chrome have different compositing strategies that affect zoomed content quality. This isn't fixable without major performance tradeoffs—you're choosing between sharp and fast.

## iOS input zoom prevents styling

iOS Safari automatically zooms the page when focusing an input with font size below 16px. The intent is to make small text readable, but it breaks the design of any app with a consistent type system. Users don't want the page to zoom when they start typing.

The workaround: force all inputs to 16px minimum, even if it doesn't match your design system.

```css
input,
textarea {
	font-size: max(16px, var(--desired-font-size));
}
```

This is a hard constraint—there's no CSS or JavaScript to disable the zoom behavior. You either use 16px inputs or accept the auto-zoom.

**Lesson**: On iOS Safari, inputs below 16px trigger automatic page zoom. If you need smaller text inputs, you can't have them—either accept 16px or accept the zoom.

## Conclusion

These workarounds share a pattern: Safari's behavior is usually defensible from a security, performance, or UX perspective, but the constraints make building certain kinds of apps harder. iOS doesn't fire `beforeunload` because it can't guarantee the event will complete before the tab closes. Clipboard operations must be synchronous to prevent abuse. Font loading in SVG images doesn't have a ready event because it's genuinely hard to detect in WebKit's architecture.

The solutions range from elegant (feature detection and graceful degradation) to hacky (sleeping 250ms and hoping fonts loaded). When Safari has no proper API, you work around the edges. The key is knowing which quirks exist so you can recognize them when they break your app.

## Key files

- `packages/editor/src/lib/globals/environment.ts` — Browser detection (tlenv.isSafari, tlenv.isIos)
- `packages/editor/src/lib/hooks/useFixSafariDoubleTapZoomPencilEvents.ts` — Apple Pencil handling
- `packages/editor/src/lib/hooks/useGestureEvents.ts` — Pinch gesture detection
- `packages/editor/src/lib/components/default-components/DefaultCanvas.tsx` — Text outline and reflow fixes
- `packages/editor/src/lib/exports/getSvgAsImage.ts` — SVG font loading delay
- `packages/tldraw/src/lib/shapes/shared/useEditablePlainText.ts` — Caret visibility fix
- `packages/editor/src/lib/utils/browserCanvasMaxSize.ts` — Canvas size limits
