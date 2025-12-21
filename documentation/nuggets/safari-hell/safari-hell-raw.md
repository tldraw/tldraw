---
title: Safari quirks and workarounds - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - safari
  - hell
---

# Safari quirks and workarounds: raw notes

Internal research notes for the safari-hell.md article.

## Browser detection

**File:** `/packages/editor/src/lib/globals/environment.ts`

**Detection logic (lines 23-34):**
```typescript
if (typeof window !== 'undefined') {
	if ('navigator' in window) {
		tlenv.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
		tlenv.isIos = !!navigator.userAgent.match(/iPad/i) || !!navigator.userAgent.match(/iPhone/i)
		tlenv.isChromeForIos = /crios.*safari/i.test(navigator.userAgent)
		tlenv.isFirefox = /firefox/i.test(navigator.userAgent)
		tlenv.isAndroid = /android/i.test(navigator.userAgent)
		tlenv.isDarwin = window.navigator.userAgent.toLowerCase().indexOf('mac') > -1
	}
	tlenv.hasCanvasSupport = 'Promise' in window && 'HTMLCanvasElement' in window
	isForcedFinePointer = tlenv.isFirefox && !tlenv.isAndroid && !tlenv.isIos
}
```

**Key regex patterns:**
- Safari: `/^((?!chrome|android).)*safari/i` - negative lookahead to exclude Chrome/Android
- iOS: `/iPad/i` and `/iPhone/i` - matches iPad and iPhone devices
- Chrome for iOS: `/crios.*safari/i` - identifies Chrome running on iOS

**tlenv object (lines 10-19):**
```typescript
const tlenv = {
	isSafari: false,
	isIos: false,
	isChromeForIos: false,
	isFirefox: false,
	isAndroid: false,
	isWebview: false,
	isDarwin: false,
	hasCanvasSupport: false,
}
```

## Text shadow performance

**File:** `/packages/editor/src/lib/components/default-components/DefaultCanvas.tsx`

**Implementation (lines 53-78):**
```typescript
const rMemoizedStuff = useRef({ lodDisableTextOutline: false, allowTextOutline: true })

useQuickReactor(
	'position layers',
	function positionLayersWhenCameraMoves() {
		const { x, y, z } = editor.getCamera()

		// This should only run once on first load
		if (rMemoizedStuff.current.allowTextOutline && tlenv.isSafari) {
			container.style.setProperty('--tl-text-outline', 'none')
			rMemoizedStuff.current.allowTextOutline = false
		}

		// And this should only run if we're not in Safari;
		// If we're below the lod distance for text shadows, turn them off
		if (
			rMemoizedStuff.current.allowTextOutline &&
			z < editor.options.textShadowLod !== rMemoizedStuff.current.lodDisableTextOutline
		) {
			const lodDisableTextOutline = z < editor.options.textShadowLod
			container.style.setProperty(
				'--tl-text-outline',
				lodDisableTextOutline ? 'none' : `var(--tl-text-outline-reference)`
			)
			rMemoizedStuff.current.lodDisableTextOutline = lodDisableTextOutline
		}
		// ... camera transform logic
	},
	[editor, container]
)
```

**Configuration constant:**
`/packages/editor/src/lib/options.ts:144`
```typescript
textShadowLod: 0.35,
```

**Logic:**
- Safari: Text outlines disabled completely on first render (`allowTextOutline = false`)
- Chrome/Firefox: Text outlines disabled when zoom level < 0.35 (`textShadowLod`)
- Uses CSS custom property `--tl-text-outline` to toggle between `none` and reference value
- LOD (Level of Detail) optimization only applies to non-Safari browsers

**Performance characteristics:**
- Chrome: Can handle dozens of text shapes with shadows at 60fps
- Safari: Drops to ~20fps with 50 text shapes during camera movement
- Cause: Safari's compositor doesn't batch or optimize text shadows

## Culled elements viewport bug

**File:** `/packages/editor/src/lib/components/default-components/DefaultCanvas.tsx`

**ReflowIfNeeded component (lines 408-431):**
```typescript
function ReflowIfNeeded() {
	const editor = useEditor()
	const culledShapesRef = useRef<Set<TLShapeId>>(new Set())
	useQuickReactor(
		'reflow for culled shapes',
		() => {
			const culledShapes = editor.getCulledShapes()
			if (
				culledShapesRef.current.size === culledShapes.size &&
				[...culledShapes].every((id) => culledShapesRef.current.has(id))
			)
				return

			culledShapesRef.current = culledShapes
			const canvas = document.getElementsByClassName('tl-canvas')
			if (canvas.length === 0) return
			// This causes a reflow
			// https://gist.github.com/paulirish/5d52fb081b3570c81e3a
			const _height = (canvas[0] as HTMLDivElement).offsetHeight
		},
		[editor]
	)
	return null
}
```

**Rendering (line 443):**
```typescript
{tlenv.isSafari && <ReflowIfNeeded />}
```

**How it works:**
1. Tracks set of culled shape IDs using `useRef`
2. When culled set changes (size differs or IDs differ), force reflow
3. Reading `offsetHeight` forces synchronous layout recalculation
4. Component only renders on Safari (Chrome/Firefox don't need it)

**Reference:**
Paul Irish's list of layout-triggering properties: https://gist.github.com/paulirish/5d52fb081b3570c81e3a

**Bug behavior:**
- Element removed from viewport → Safari marks as "nothing to render"
- Element returns to viewport → Safari doesn't invalidate cached state
- Element present in DOM with correct styles but not painted
- Requires scroll/resize or forced reflow to trigger repaint

## SVG font loading delay

**File:** `/packages/editor/src/lib/exports/getSvgAsImage.ts`

**Implementation (lines 32-65):**
```typescript
const canvas = await new Promise<HTMLCanvasElement | null>((resolve) => {
	const image = Image()
	image.crossOrigin = 'anonymous'

	image.onload = async () => {
		// safari will fire `onLoad` before the fonts in the SVG are
		// actually loaded. just waiting around a while is brittle, but
		// there doesn't seem to be any better solution for now :( see
		// https://bugs.webkit.org/show_bug.cgi?id=219770
		if (tlenv.isSafari) {
			await sleep(250)
		}

		const canvas = document.createElement('canvas') as HTMLCanvasElement
		const ctx = canvas.getContext('2d')!

		canvas.width = clampedWidth
		canvas.height = clampedHeight

		ctx.imageSmoothingEnabled = true
		ctx.imageSmoothingQuality = 'high'
		ctx.drawImage(image, 0, 0, clampedWidth, clampedHeight)

		URL.revokeObjectURL(svgUrl)

		resolve(canvas)
	}

	image.onerror = () => {
		resolve(null)
	}

	image.src = svgUrl
})
```

**sleep utility:**
`/packages/utils/src/lib/control.ts:272-275`
```typescript
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}
```

**Canvas size clamping (lines 19-25):**
```typescript
let [clampedWidth, clampedHeight] = clampToBrowserMaxCanvasSize(
	width * pixelRatio,
	height * pixelRatio
)
clampedWidth = Math.floor(clampedWidth)
clampedHeight = Math.floor(clampedHeight)
const effectiveScale = clampedWidth / width
```

**WebKit bug:**
- Bug ID: 219770
- Filed: 2020
- Status: Still open as of article writing
- Issue: `onload` fires before embedded fonts fully loaded in SVG images
- No programmatic way to detect when fonts are ready
- No promise or event to await

**Fragility:**
- 250ms arbitrary timeout
- Fails if fonts take longer to load (slow network, complex fonts, busy system)
- No better alternative exists in WebKit

## Apple Pencil double-tap zoom loupe

**File:** `/packages/editor/src/lib/hooks/useFixSafariDoubleTapZoomPencilEvents.ts`

**Constants (line 5):**
```typescript
const IGNORED_TAGS = ['textarea', 'input']
```

**Implementation (lines 12-45):**
```typescript
export function useFixSafariDoubleTapZoomPencilEvents(ref: React.RefObject<HTMLElement | null>) {
	const editor = useEditor()

	useEffect(() => {
		const elm = ref.current

		if (!elm) return

		const handleEvent = (e: PointerEvent | TouchEvent) => {
			if (e instanceof PointerEvent && e.pointerType === 'pen') {
				editor.markEventAsHandled(e)
				const { target } = e

				// Allow events to propagate if the app is editing a shape, or if the event is occurring in a text area or input
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

		elm.addEventListener('touchstart', handleEvent)
		elm.addEventListener('touchend', handleEvent)
		return () => {
			elm.removeEventListener('touchstart', handleEvent)
			elm.removeEventListener('touchend', handleEvent)
		}
	}, [editor, ref])
}
```

**Usage in DefaultCanvas (line 51):**
```typescript
useFixSafariDoubleTapZoomPencilEvents(rCanvas)
```

**Logic:**
1. Intercept `touchstart` and `touchend` events
2. Check if pointer type is `'pen'` (Apple Pencil)
3. Allow events through for:
   - `<textarea>` elements
   - `<input>` elements
   - Elements with `contentEditable` attribute
   - When editor is in `select.editing_shape` state
4. Otherwise call `preventDefault(e)` to suppress default behavior

**iOS behavior:**
- Double-tap with Apple Pencil shows magnifying loupe by default
- Useful for reading small text
- Catastrophic for drawing apps (interrupts drawing flow)
- Natural drawing motion includes frequent double-taps

**preventDefault function:**
`/packages/editor/src/lib/utils/dom.ts:38-43`
```typescript
export function preventDefault(event: React.BaseSyntheticEvent | Event) {
	event.preventDefault()
	if (debugFlags.logPreventDefaults.get()) {
		console.warn('preventDefault called on event:', event)
	}
}
```

## Text caret visibility fix

**File:** `/packages/tldraw/src/lib/shapes/shared/useEditablePlainText.ts`

**Implementation (lines 40-57):**
```typescript
useEffect(() => {
	if (!isEditing) return

	if (document.activeElement !== rInput.current) {
		rInput.current?.focus()
	}

	if (editor.getInstanceState().isCoarsePointer) {
		rInput.current?.select()
	}

	// XXX(mime): This fixes iOS not showing the caret sometimes.
	// This "shakes" the caret awake.
	if (tlenv.isSafari) {
		rInput.current?.blur()
		rInput.current?.focus()
	}
}, [editor, isEditing])
```

**Sequence:**
1. Check if editing mode active
2. Focus input if not already focused
3. Select text if using coarse pointer (touch)
4. **Safari only:** Blur then immediately refocus

**Bug characteristics:**
- Random occurrence (not consistently reproducible)
- Input has focus
- Typing works
- Caret is invisible
- Common enough to frustrate users

**Fix rationale:**
- Pure voodoo (comment says "XXX(mime)")
- Unknown why caret disappears
- Unknown why blur/focus cycle helps
- Empirically effective

## Gesture event differences

**File:** `/packages/editor/src/lib/hooks/useGestureEvents.ts`

**Pinch state machine (line 82):**
```typescript
let pinchState = 'not sure' as 'not sure' | 'zooming' | 'panning'
```

**Safari trackpad detection (lines 217-221):**
```typescript
// In (desktop) Safari, a two finger trackpad pinch will be a "gesturechange" event
// and will have 0 touches; on iOS, a two-finger pinch will be a "pointermove" event
// with two touches.
const isSafariTrackpadPinch =
	gesture.type === 'gesturechange' || gesture.type === 'gestureend'
```

**State update logic (lines 172-208):**
```typescript
const updatePinchState = (isSafariTrackpadPinch: boolean) => {
	if (isSafariTrackpadPinch) {
		pinchState = 'zooming'
	}

	if (pinchState === 'zooming') {
		return
	}

	// How far have the two touch points moved towards or away from eachother?
	const touchDistance = Math.abs(currDistanceBetweenFingers - initDistanceBetweenFingers)
	// How far has the point between the touches moved?
	const originDistance = Vec.Dist(initPointBetweenFingers, prevPointBetweenFingers)

	switch (pinchState) {
		case 'not sure': {
			if (touchDistance > 24) {
				pinchState = 'zooming'
			} else if (originDistance > 16) {
				pinchState = 'panning'
			}
			break
		}
		case 'panning': {
			// Slightly more touch distance needed to go from panning to zooming
			if (touchDistance > 64) {
				pinchState = 'zooming'
			}
			break
		}
	}
}
```

**Thresholds:**
- `touchDistance > 24` → switch to zooming from "not sure"
- `originDistance > 16` → switch to panning from "not sure"
- `touchDistance > 64` → switch to zooming from "panning"

**Key variables (lines 136-140):**
```typescript
let initDistanceBetweenFingers = 1 // the distance between the two fingers when the pinch starts
let initZoom = 1 // the browser's zoom level when the pinch starts
let currDistanceBetweenFingers = 0
const initPointBetweenFingers = new Vec()
const prevPointBetweenFingers = new Vec()
```

**Event type differences:**
- **Desktop Safari (trackpad):** `gesturechange` / `gestureend` events, 0 touches
- **iOS Safari (touch):** `pointermove` events, 2 touches
- **Chrome/Firefox:** Different gesture API entirely

**State machine rationale:**
From comment (lines 12-42):
```
Zooming is much more expensive than panning (because it causes shapes to render),
so we want to be sure that we don't zoom while two-finger panning.

If a user is on a trackpad, the pinchState will be set to "zooming".

If the user is on a touch screen, then we start in the "not sure" state and switch back and forth
between "zooming", "panning", and "not sure" based on what the user is doing with their fingers.

In the "not sure" state, we examine whether the user has moved the center of the gesture far enough
to suggest that they're panning; or else that they've moved their fingers further apart or closer
together enough to suggest that they're zooming.

In the "panning" state, we check whether the user's fingers have moved far enough apart to suggest
that they're zooming. If they have, we switch to the "zooming" state.

In the "zooming" state, we just stay zooming—it's not YET possible to switch back to panning.
```

## Clipboard synchronous requirement

**File:** `/packages/tldraw/src/lib/utils/clipboard.ts`

**Implementation (lines 36-62):**
```typescript
export function clipboardWrite(types: Record<string, Promise<Blob>>): Promise<void> {
	// Note:  it's important that this function itself isn't async and doesn't really use promises -
	// we need to create the relevant `ClipboardItem`s and call navigator.clipboard.write
	// synchronously to make sure safari knows that the user _wants_ to copy See
	// https://bugs.webkit.org/show_bug.cgi?id=222262

	const entries = Object.entries(types)

	// clipboard.write will swallow errors if any of the promises reject. we log them here so we can
	// understand what might have gone wrong.
	for (const [_, promise] of entries) promise.catch((err) => console.error(err))

	return navigator.clipboard.write([new ClipboardItem(types)]).catch((err) => {
		// Firefox will fail with the above if `dom.events.asyncClipboard.clipboardItem` is enabled.
		// See <https://github.com/tldraw/tldraw/issues/1325>
		console.error(err)

		return Promise.all(
			entries.map(async ([type, promise]) => {
				return [type, await promise] as const
			})
		).then((entries) => {
			const resolvedTypes = objectMapFromEntries(entries)
			return navigator.clipboard.write([new ClipboardItem(resolvedTypes)])
		})
	})
}
```

**Custom PNG format (lines 4-19):**
```typescript
// Browsers sanitize image formats to prevent security issues when pasting between applications. For
// paste within an application though, some browsers (only chromium-based browsers as of Nov 2024)
// support custom clipboard formats starting with "web " which are unsanitized. Our PNGs include a
// special chunk which indicates they're at 2x resolution, but that normally gets stripped - so if
// you copy as png from tldraw, then paste back in, the resulting image will be 2x the expected
// size. To work around this, we write 2 version of the image to the clipboard - the normal png, and
// the same blob with a custom mime type. When pasting, we check first for the custom mime type, and
// if it's there, use that instead of the normal png.
export const TLDRAW_CUSTOM_PNG_MIME_TYPE = 'web image/vnd.tldraw+png' as const

const additionalClipboardWriteTypes = {
	png: TLDRAW_CUSTOM_PNG_MIME_TYPE,
} as const
const canonicalClipboardReadTypes = {
	[TLDRAW_CUSTOM_PNG_MIME_TYPE]: 'image/png',
}
```

**WebKit bug:**
- Bug ID: 222262
- Issue: Async gap between user gesture and clipboard write breaks "user intent" chain
- Safari silently rejects clipboard operations if they're not synchronous

**Key constraint:**
- Function itself is NOT async (returns `Promise<void>` but is synchronous)
- `ClipboardItem` created synchronously with promise-valued types
- `navigator.clipboard.write` called synchronously
- Blob generation happens asynchronously but creation of ClipboardItem is sync

**Firefox fallback:**
- Some Firefox configs fail with promise-valued ClipboardItem
- Fallback: await all promises first, then create ClipboardItem with resolved blobs

**Also in:** `/packages/tldraw/src/lib/utils/export/copyAs.ts:35-41` (same pattern)

## Canvas size limits

**File:** `/packages/editor/src/lib/utils/browserCanvasMaxSize.ts`

**Constants (lines 28-29):**
```typescript
const MAX_SAFE_CANVAS_DIMENSION = 8192
const MAX_SAFE_CANVAS_AREA = 4096 * 4096
```

**Test sizes array (lines 31-88):**
```typescript
const TEST_SIZES = {
	area: [
		// Chrome 70 (Mac, Win)
		// Chrome 68 (Android 4.4)
		// Edge 17 (Win)
		// Safari 7-12 (Mac)
		16384,
		// Chrome 68 (Android 7.1-9)
		14188,
		// Chrome 68 (Android 5)
		11402,
		// Firefox 63 (Mac, Win)
		11180,
		// Chrome 68 (Android 6)
		10836,
		// IE 9-11 (Win)
		8192,
		// IE Mobile (Windows Phone 8.x)
		// Safari (iOS 9 - 12)
		4096,
	],
	height: [
		// Safari 7-12 (Mac)
		// Safari (iOS 9-12)
		8388607,
		// Chrome 83 (Mac, Win)
		65535,
		// Chrome 70 (Mac, Win)
		// Chrome 68 (Android 4.4-9)
		// Firefox 63 (Mac, Win)
		32767,
		// Edge 17 (Win)
		// IE11 (Win)
		16384,
		// IE 9-10 (Win)
		8192,
		// IE Mobile (Windows Phone 8.x)
		4096,
	],
	width: [
		// Safari 7-12 (Mac)
		// Safari (iOS 9-12)
		4194303,
		// Chrome 83 (Mac, Win)
		65535,
		// Chrome 70 (Mac, Win)
		// Chrome 68 (Android 4.4-9)
		// Firefox 63 (Mac, Win)
		32767,
		// Edge 17 (Win)
		// IE11 (Win)
		16384,
		// IE 9-10 (Win)
		8192,
		// IE Mobile (Windows Phone 8.x)
		4096,
	],
} as const
```

**Safari-specific limits (older versions 7-12):**
- **Area:** 16,777,216 pixels (4096 × 4096)
- **Height:** 8,388,607 pixels
- **Width:** 4,194,303 pixels

**Detection algorithm (lines 94-135):**
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
		// release memory
		testCvs.width = 0
		testCvs.height = 0

		if (isTestPassed) {
			// release memory
			cropCvs.width = 0
			cropCvs.height = 0

			if (dimension === 'area') {
				return size * size
			} else {
				return size
			}
		}
	}

	// didn't find a good size, release memory and error
	cropCvs.width = 0
	cropCvs.height = 0

	throw Error('Failed to determine maximum canvas dimension')
}
```

**How detection works:**
1. Create test canvas at candidate size
2. Draw 1px square at bottom-right corner
3. Copy that pixel to crop canvas
4. Check if pixel is visible (alpha channel > 0)
5. If visible → canvas size is supported
6. If not visible → canvas creation failed silently
7. Test sizes in descending order until one succeeds

**Clamping function (lines 138-167):**
```typescript
export function clampToBrowserMaxCanvasSize(width: number, height: number) {
	if (
		width <= MAX_SAFE_CANVAS_DIMENSION &&
		height <= MAX_SAFE_CANVAS_DIMENSION &&
		width * height <= MAX_SAFE_CANVAS_AREA
	) {
		return [width, height]
	}

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

**Usage in getSvgAsImage (line 19):**
```typescript
let [clampedWidth, clampedHeight] = clampToBrowserMaxCanvasSize(
	width * pixelRatio,
	height * pixelRatio
)
```

**Silent failure characteristics:**
- `createElement('canvas')` succeeds
- `getContext('2d')` may return `null` OR return context that doesn't work
- Drawing operations fail silently
- No error thrown
- Makes debugging very difficult

**Caching (lines 8-20):**
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

Sizes detected once per browser session and cached.

**Attribution:**
Extracted from https://github.com/jhildenbiddle/canvas-size (MIT License)

## Blurry content when zoomed

**Root cause:**
Fundamental difference in compositor architecture:
- **Chrome:** Renders shapes at full resolution → scales display
- **Safari:** Rasterizes content at current resolution → scales rasterized pixels

**Result:**
- Chrome: Sharp vectors at all zoom levels
- Safari: Blurry/pixelated appearance when zoomed in

**No workaround:**
- Can't change Safari's compositing strategy via CSS or API
- Re-rendering everything at zoomed scale would be sharp but destroys performance
- Trade-off: Safari prioritizes performance, Chrome prioritizes sharpness

**Design choice:**
Living with the blur is more pragmatic than performance hit of constant re-renders.

## iOS input zoom

**Behavior:**
iOS Safari auto-zooms page when focusing input with `font-size < 16px`

**Intent:**
Make small text readable for users

**Problem:**
Breaks design systems that use smaller inputs

**Fix:**
Force 16px minimum:
```css
input,
textarea {
	font-size: max(16px, var(--desired-font-size));
}
```

**No override:**
No CSS property or JavaScript API to disable this behavior. Hard constraint.

**Trade-off:**
Either accept 16px minimum OR accept auto-zoom behavior.

## UseGesture wheel event quirk

**File:** `/packages/editor/src/lib/hooks/useGestureEvents.ts`

**Issue (lines 53-60):**
```typescript
/**
 * GOTCHA
 *
 * UseGesture fires a wheel event 140ms after the gesture actually ends, with a momentum-adjusted
 * delta. This creates a messed up interaction where after you stop scrolling suddenly the dang page
 * jumps a tick. why do they do this? you are asking the wrong person. it seems intentional though.
 * anyway we want to ignore that last event, but there's no way to directly detect it so we need to
 * keep track of timestamps. Yes this is awful, I am sorry.
 */
```

**Timestamp tracking (lines 61-76):**
```typescript
let lastWheelTime = undefined as undefined | number

const isWheelEndEvent = (time: number) => {
	if (lastWheelTime === undefined) {
		lastWheelTime = time
		return false
	}

	if (time - lastWheelTime > 120 && time - lastWheelTime < 160) {
		lastWheelTime = time
		return true
	}

	lastWheelTime = time
	return false
}
```

**Detection window:**
- If wheel event arrives 120-160ms after previous event → it's the phantom end event
- Otherwise → it's a real wheel event

**Usage (lines 91-94):**
```typescript
if (isWheelEndEvent(Date.now())) {
	// ignore wheelEnd events
	return
}
```

**Not Safari-specific but affects all browsers using @use-gesture/react library.**

## Wheel normalization

**File:** `/packages/editor/src/lib/utils/normalizeWheel.ts`

**Constants (lines 2-6):**
```typescript
const MAX_ZOOM_STEP = 10
const IS_DARWIN = /Mac|iPod|iPhone|iPad/.test(
	typeof window === 'undefined' ? 'node' : window.navigator.platform
)
```

**Implementation (lines 10-25):**
```typescript
export function normalizeWheel(event: WheelEvent | React.WheelEvent<HTMLElement>) {
	let { deltaY, deltaX } = event
	let deltaZ = 0

	// wheeling
	if (event.ctrlKey || event.altKey || event.metaKey) {
		deltaZ = (Math.abs(deltaY) > MAX_ZOOM_STEP ? MAX_ZOOM_STEP * Math.sign(deltaY) : deltaY) / 100
	} else {
		if (event.shiftKey && !IS_DARWIN) {
			deltaX = deltaY
			deltaY = 0
		}
	}

	return { x: -deltaX, y: -deltaY, z: -deltaZ }
}
```

**Logic:**
- Modifier keys (ctrl/alt/meta) → interpret as zoom (`deltaZ`)
- Shift key on non-Darwin → swap X and Y (horizontal scroll)
- Clamp zoom delta to ±10 to prevent huge jumps
- Negate all deltas (convert browser convention to tldraw convention)

**Adapted from:** https://stackoverflow.com/a/13650579

## Key source files

### Core Safari detection
- `/packages/editor/src/lib/globals/environment.ts` - Browser/OS detection via user agent

### Performance workarounds
- `/packages/editor/src/lib/components/default-components/DefaultCanvas.tsx:53-78` - Text shadow disable
- `/packages/editor/src/lib/components/default-components/DefaultCanvas.tsx:408-431` - Culling reflow
- `/packages/editor/src/lib/options.ts:144` - textShadowLod constant

### Font and rendering
- `/packages/editor/src/lib/exports/getSvgAsImage.ts:36-43` - SVG font loading delay
- `/packages/utils/src/lib/control.ts:272-275` - sleep utility

### Input handling
- `/packages/editor/src/lib/hooks/useFixSafariDoubleTapZoomPencilEvents.ts` - Apple Pencil zoom suppression
- `/packages/tldraw/src/lib/shapes/shared/useEditablePlainText.ts:40-57` - Caret visibility fix

### Gesture and wheel
- `/packages/editor/src/lib/hooks/useGestureEvents.ts:172-221` - Pinch state machine and trackpad detection
- `/packages/editor/src/lib/hooks/useGestureEvents.ts:61-76` - UseGesture wheel quirk
- `/packages/editor/src/lib/utils/normalizeWheel.ts` - Wheel event normalization

### Clipboard
- `/packages/tldraw/src/lib/utils/clipboard.ts:36-62` - Synchronous clipboard write
- `/packages/tldraw/src/lib/utils/export/copyAs.ts:35-41` - Copy implementation with sync constraint

### Canvas limits
- `/packages/editor/src/lib/utils/browserCanvasMaxSize.ts` - Canvas size detection and clamping

### Utilities
- `/packages/editor/src/lib/utils/dom.ts:38-43` - preventDefault helper

## WebKit bug references

- **219770:** SVG font loading - `onload` fires before fonts ready
  - https://bugs.webkit.org/show_bug.cgi?id=219770
  - Filed: 2020
  - Status: Open

- **222262:** Clipboard write user intent requirement
  - https://bugs.webkit.org/show_bug.cgi?id=222262
  - Issue: Async gap breaks user gesture tracking

## External references

- Paul Irish's layout-triggering properties: https://gist.github.com/paulirish/5d52fb081b3570c81e3a
- canvas-size detection library: https://github.com/jhildenbiddle/canvas-size (MIT)
- Wheel normalization: https://stackoverflow.com/a/13650579

## Configuration values

### From defaultTldrawOptions
- `textShadowLod: 0.35` - Zoom level below which text shadows disabled (non-Safari)
- `doubleClickDurationMs: 450` - Double-click detection window
- `longPressDurationMs: 500` - Long press detection window

### Pinch gesture thresholds
- Touch distance > 24px → zooming (from "not sure")
- Origin distance > 16px → panning (from "not sure")
- Touch distance > 64px → zooming (from "panning")

### Timing constants
- SVG font delay: 250ms
- UseGesture phantom event window: 120-160ms after last real event

### Canvas safety limits
- Safe dimension: 8192px
- Safe area: 16,777,216 pixels (4096 × 4096)
