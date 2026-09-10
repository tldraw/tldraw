// The visual viewport is the region actually on screen. The software keyboard (and pinch-zoom)
// shrink it while leaving the layout viewport — and CSS `dvh` — unchanged, most notably on iOS.
// So placing a panel above the keyboard means measuring against `window.visualViewport`, not CSS.
// These helpers are the single place the commenting layer reads it.

/** The on-screen viewport region in window coordinates, falling back to the layout viewport where
 *  `visualViewport` is unavailable. `top`/`left` carry the viewport's own offset — on iOS this is
 *  non-zero while the keyboard is open, and dropping it misplaces anything measured against it. */
export interface VisibleViewport {
	top: number
	left: number
	width: number
	height: number
	bottom: number
	right: number
}

/** Read the visible viewport once. Call it inside a `visualViewport` resize/scroll handler to keep
 *  a measurement current as the keyboard opens and closes. */
export function getVisibleViewport(win: Window): VisibleViewport {
	const vv = win.visualViewport
	const top = vv ? vv.offsetTop : 0
	const left = vv ? vv.offsetLeft : 0
	const width = vv ? vv.width : win.innerWidth
	const height = vv ? vv.height : win.innerHeight
	return { top, left, width, height, bottom: top + height, right: left + width }
}
