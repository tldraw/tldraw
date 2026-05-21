/**
 * Feature detection for the experimental `CanvasRenderingContext2D.drawElementImage()`
 * API (https://html-in-canvas.dev/), which can rasterize a live DOM subtree into a
 * `<canvas>` while preserving the source's layout participation and hit testing.
 *
 * At time of writing this API ships in Chromium 146+ / Brave Stable behind
 * `chrome://flags/#canvas-draw-element` and is not available elsewhere.
 *
 * @public
 */
export function isDrawElementImageSupported(): boolean {
	if (typeof CanvasRenderingContext2D === 'undefined') return false
	return 'drawElementImage' in CanvasRenderingContext2D.prototype
}

/**
 * Human-readable hint for callers that want to surface the chrome flag URL when
 * the API is unavailable.
 *
 * @public
 */
export const DRAW_ELEMENT_IMAGE_FLAG_HINT =
	'Enable chrome://flags/#canvas-draw-element in Chrome Canary or Brave (Chromium 146+) to try this experimental API.'
