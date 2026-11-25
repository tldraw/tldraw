/**
 * The part of the window on screen. An on-screen keyboard, and pinch-zoom, shrink the visual
 * viewport but not the layout viewport or CSS's `dvh`, so anything kept above the keyboard has to be
 * measured against `window.visualViewport`. Where it's missing, the layout viewport.
 */
export function getVisibleViewport(win: Window) {
	const vv = win.visualViewport
	const top = vv ? vv.offsetTop : 0
	const height = vv ? vv.height : win.innerHeight
	return { top, height, bottom: top + height }
}
