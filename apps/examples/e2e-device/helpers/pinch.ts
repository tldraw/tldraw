import { currentWebContext } from './app'

const NATIVE_CONTEXT = 'NATIVE_APP'

/**
 * Two-finger pinch over the tldraw canvas.
 *
 * Why this is the way it is: on both iOS (XCUITest) and Android (UiAutomator2),
 * multi-touch W3C actions only operate in the NATIVE context, and only on native
 * screen coordinates. So we:
 *
 *   1. (web context)    measure the canvas rect + viewport in CSS pixels,
 *   2. (native context) translate those to device coordinates and run two
 *      simultaneous touch pointers from the centre outwards (or inwards),
 *   3. (web context)    hand back so the caller can assert on `editor` state.
 *
 * The touches enter through the OS, so Safari/Chrome's own gesture recogniser
 * sees them — that is the whole point, and what synthetic DOM touch can't do.
 *
 * @param scale  >1 spreads the fingers apart (zoom in), <1 brings them together
 *               (zoom out).
 */
export async function pinchCanvas({ scale, steps = 12 }: { scale: number; steps?: number }) {
	const web = await currentWebContext()

	// 1. Measure in the web context (CSS pixels relative to the layout viewport).
	await browser.switchContext(web)
	const rect = await browser.execute(() => {
		const el = document.querySelector('.tl-canvas')!
		const r = el.getBoundingClientRect()
		return {
			cx: r.left + r.width / 2,
			cy: r.top + r.height / 2,
			dpr: window.devicePixelRatio,
			// Offset of the web viewport inside the native window (browser chrome).
			// visualViewport.offsetTop is the cleanest signal we have for this.
			offsetTop: window.visualViewport?.offsetTop ?? 0,
		}
	})

	// 2. Translate CSS px -> native device coordinates.
	//
	// iOS reports native coordinates in POINTS (already CSS-px-equivalent), so the
	// scale factor is 1 and we only add the top inset for the Safari toolbar.
	// Android UiAutomator2 reports PIXELS, so we multiply by devicePixelRatio.
	//
	// `TOP_INSET` is the one bit that may need a per-device tweak — the height of
	// the browser chrome above the web viewport. Calibrate once per device class.
	const isAndroid = browser.isAndroid
	const pxScale = isAndroid ? rect.dpr : 1
	const TOP_INSET = Number(process.env.DEVICE_TOP_INSET ?? (isAndroid ? 0 : 0))

	const cx = rect.cx * pxScale
	const cy = (rect.cy + rect.offsetTop) * pxScale + TOP_INSET

	// Fingers start 60px either side of centre, end at 60*scale either side.
	const startGap = 60 * pxScale
	const endGap = startGap * scale

	const finger = (id: string, dir: -1 | 1) =>
		buildPinchPointer({
			id,
			cx,
			cy,
			startGap: dir * startGap,
			endGap: dir * endGap,
			steps,
		})

	// 3. Perform the gesture natively, then return to the web context.
	await browser.switchContext(NATIVE_CONTEXT)
	await browser.performActions([finger('finger1', -1), finger('finger2', 1)])
	await browser.releaseActions()
	await browser.switchContext(web)
}

/**
 * One touch pointer that presses at `cx + startGap`, then moves in `steps` hops
 * to `cx + endGap` along the x axis (so two mirrored pointers spread/contract).
 */
function buildPinchPointer({
	id,
	cx,
	cy,
	startGap,
	endGap,
	steps,
}: {
	id: string
	cx: number
	cy: number
	startGap: number
	endGap: number
	steps: number
}) {
	const actions: Array<Record<string, unknown>> = [
		{ type: 'pointerMove', duration: 0, x: Math.round(cx + startGap), y: Math.round(cy) },
		{ type: 'pointerDown', button: 0 },
		{ type: 'pause', duration: 50 },
	]
	for (let i = 1; i <= steps; i++) {
		const gap = startGap + ((endGap - startGap) * i) / steps
		actions.push({
			type: 'pointerMove',
			duration: 25,
			x: Math.round(cx + gap),
			y: Math.round(cy),
		})
	}
	actions.push({ type: 'pointerUp', button: 0 })

	return {
		type: 'pointer',
		id,
		parameters: { pointerType: 'touch' },
		actions,
	}
}
