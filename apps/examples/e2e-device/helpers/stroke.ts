import { currentWebContext } from './app'

const NATIVE_CONTEXT = 'NATIVE_APP'

/**
 * Draw a single-finger freehand stroke across the canvas through the real OS
 * touch pipeline (same native-context + coordinate-translation approach as
 * pinch.ts). `from`/`to` are CSS-pixel offsets relative to the canvas centre.
 */
export async function drawTouchStroke({
	from,
	to,
	steps = 12,
}: {
	from: { x: number; y: number }
	to: { x: number; y: number }
	steps?: number
}) {
	const web = await currentWebContext()

	// Measure in the web context (CSS pixels relative to the layout viewport).
	await browser.switchContext(web)
	const rect = await browser.execute(() => {
		const el = document.querySelector('.tl-canvas')!
		const r = el.getBoundingClientRect()
		return {
			cx: r.left + r.width / 2,
			cy: r.top + r.height / 2,
			dpr: window.devicePixelRatio,
			offsetTop: window.visualViewport?.offsetTop ?? 0,
		}
	})

	// CSS px -> native device coordinates (iOS reports points, Android pixels).
	const isAndroid = browser.isAndroid
	const pxScale = isAndroid ? rect.dpr : 1
	const TOP_INSET = Number(process.env.DEVICE_TOP_INSET ?? 0)
	const cx = rect.cx * pxScale
	const cy = (rect.cy + rect.offsetTop) * pxScale + TOP_INSET

	const point = (p: { x: number; y: number }) => ({
		x: Math.round(cx + p.x * pxScale),
		y: Math.round(cy + p.y * pxScale),
	})

	const start = point(from)
	const actions: Array<Record<string, unknown>> = [
		{ type: 'pointerMove', duration: 0, ...start },
		{ type: 'pointerDown', button: 0 },
		{ type: 'pause', duration: 50 },
	]
	for (let i = 1; i <= steps; i++) {
		actions.push({
			type: 'pointerMove',
			duration: 25,
			...point({
				x: from.x + ((to.x - from.x) * i) / steps,
				y: from.y + ((to.y - from.y) * i) / steps,
			}),
		})
	}
	actions.push({ type: 'pointerUp', button: 0 })

	await browser.switchContext(NATIVE_CONTEXT)
	await browser.performActions([
		{ type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' }, actions },
	])
	await browser.releaseActions()
	await browser.switchContext(web)
}
