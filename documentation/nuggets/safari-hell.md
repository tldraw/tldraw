# Safari hell

Safari and iOS present a unique collection of rendering quirks, missing APIs, and behaviors that work differently than every other browser. This article documents the workarounds we've implemented and the known issues we haven't solved.

## Text outline performance

CSS text shadows are expensive in Safari. When shapes use the "draw" style with hand-drawn-looking text, Chrome handles the text outline effect efficiently. Safari does not—it causes noticeable frame drops during panning and zooming.

Our solution is simple: disable text outlines entirely on Safari. On first load, we set the `--tl-text-outline` CSS variable to `none`:

```typescript
// packages/editor/src/lib/components/default-components/DefaultCanvas.tsx
if (rMemoizedStuff.current.allowTextOutline && tlenv.isSafari) {
	container.style.setProperty('--tl-text-outline', 'none')
	rMemoizedStuff.current.allowTextOutline = false
}
```

On other browsers, we use level-of-detail logic to disable text shadows when zoomed out (where they wouldn't be visible anyway), but Safari never gets them at all.

## Culled shape reflow

Safari has a rendering bug where shapes that return to the viewport after being culled sometimes don't appear until the user scrolls or resizes the window. The browser seems to cache the "nothing here" state and doesn't notice when we add content back.

The fix forces a browser reflow whenever the set of culled shapes changes:

```typescript
// packages/editor/src/lib/components/default-components/DefaultCanvas.tsx
function ReflowIfNeeded() {
	useQuickReactor('reflow for culled shapes', () => {
		const culledShapes = editor.getCulledShapes()
		// ...check if changed...
		const canvas = document.getElementsByClassName('tl-canvas')
		// This causes a reflow
		const _height = (canvas[0] as HTMLDivElement).offsetHeight
	})
	return null
}
```

Reading `offsetHeight` forces the browser to recalculate layout. This component only renders on Safari.

## SVG font loading race condition

When converting SVG to an image for export, we load the SVG into an `<img>` element, then draw it to a canvas. Safari fires `onload` before fonts embedded in the SVG are actually ready, resulting in exports with fallback fonts or missing text.

There's no event to listen for, no promise to await. Our workaround: wait 250ms and hope for the best.

```typescript
// packages/editor/src/lib/exports/getSvgAsImage.ts
image.onload = async () => {
	// safari will fire `onLoad` before the fonts in the SVG are
	// actually loaded. just waiting around a while is brittle, but
	// there doesn't seem to be any better solution for now :(
	// see https://bugs.webkit.org/show_bug.cgi?id=219770
	if (tlenv.isSafari) {
		await sleep(250)
	}
	// ...draw to canvas...
}
```

This is the kind of workaround that makes you question your career choices.

## Apple Pencil double-tap zoom

iOS has a "feature" where double-tapping with an Apple Pencil opens a zoom loupe. For drawing apps, this is catastrophic—users double-tap constantly while sketching, and each tap hijacks the interface.

We intercept touch events from pen input and prevent them from propagating:

```typescript
// packages/editor/src/lib/hooks/useFixSafariDoubleTapZoomPencilEvents.ts
const handleEvent = (e: PointerEvent | TouchEvent) => {
	if (e instanceof PointerEvent && e.pointerType === 'pen') {
		editor.markEventAsHandled(e)
		// Allow events for text inputs and content-editable elements
		if (/* editing text */) return
		preventDefault(e)
	}
}
elm.addEventListener('touchstart', handleEvent)
elm.addEventListener('touchend', handleEvent)
```

The challenge is knowing when *not* to suppress the event—users should still be able to tap into text fields.

## Text caret visibility

Sometimes when you start editing text in iOS Safari, the caret doesn't appear. The text input works fine, you just can't see where you're typing. The workaround: blur the input and immediately refocus it.

```typescript
// packages/tldraw/src/lib/shapes/shared/useEditablePlainText.ts
// This "shakes" the caret awake.
if (tlenv.isSafari) {
	rInput.current?.blur()
	rInput.current?.focus()
}
```

## Trackpad vs touch pinch detection

Safari's gesture events work differently on desktop (trackpad) and iOS (touch). A two-finger pinch on a Mac trackpad fires `gesturechange` events with zero touches. The same gesture on iOS fires `pointermove` events with two touches.

We detect which environment we're in by checking the event type:

```typescript
// packages/editor/src/lib/hooks/useGestureEvents.ts
const isSafariTrackpadPinch =
	gesture.type === 'gesturechange' || gesture.type === 'gestureend'
```

This distinction matters because the two environments need different handling for the zoom vs pan state machine.

## Clipboard synchronization

WebKit requires clipboard operations to be synchronous to prove user intent. If you try to write to the clipboard asynchronously after a user action, Safari rejects it.

```typescript
// packages/tldraw/src/lib/utils/clipboard.ts
// Note: This needs to be a synchronous call in webkit, otherwise it
// won't think that we have user intent to copy and will fail silently.
// It also appears that this call throws in Safari on iOS 17.4.1 inside
// webkit bug https://bugs.webkit.org/show_bug.cgi?id=222262
```

Safari also doesn't provide file type information when pasting files from Finder, requiring us to handle files without knowing their MIME type.

## Canvas size limits

Different Safari versions have different maximum canvas sizes. Safari 7-12 on Mac and iOS 9-12 have particularly restrictive limits:

- **Area**: 16,384 pixels total
- **Height**: 8,388,607 pixels max
- **Width**: 4,194,303 pixels max

We clamp canvas dimensions during export to avoid silent failures when users try to export very large areas.

## Known unsolved issues

### Blurry scaled layers

When you zoom in on the canvas, Chrome renders shapes at full resolution then scales the display. Safari does the opposite: it bakes the texture at the current resolution, then scales the already-rasterized pixels. The result is that zoomed-in content appears blurry in Safari.

This is a fundamental difference in how the browser composites layers, and we haven't found a workaround that doesn't destroy performance.

### iOS session storage

iOS doesn't fire `beforeunload`, so we can't reliably persist session state when users close the tab. We keep session storage values around longer on iOS, accepting that tab duplication might cause issues.

### Input font size zoom

iOS automatically zooms the page when focusing inputs with font sizes below 16px. We force all our inputs to 16px minimum to prevent this, even when it doesn't match our design system.

## Key files

- `packages/editor/src/lib/globals/environment.ts` — Browser detection (`tlenv.isSafari`, `tlenv.isIos`)
- `packages/editor/src/lib/hooks/useFixSafariDoubleTapZoomPencilEvents.ts` — Apple Pencil handling
- `packages/editor/src/lib/hooks/useGestureEvents.ts` — Pinch gesture detection
- `packages/editor/src/lib/components/default-components/DefaultCanvas.tsx` — Text outline and reflow fixes
- `packages/editor/src/lib/exports/getSvgAsImage.ts` — SVG font loading delay
- `packages/tldraw/src/lib/shapes/shared/useEditablePlainText.ts` — Caret visibility fix
- `packages/editor/src/lib/utils/browserCanvasMaxSize.ts` — Canvas size limits
