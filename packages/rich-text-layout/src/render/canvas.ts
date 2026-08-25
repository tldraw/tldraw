import { TextLayout } from '../layout/types'
import { fontSpecToString } from '../measure/types'

/**
 * The drawing subset of a canvas 2D context used by `drawLayout`.
 *
 * @public
 */
export interface CanvasDrawContextLike {
	font: string
	fillStyle: string
	textBaseline: string
	fillText(text: string, x: number, y: number): void
	fillRect(x: number, y: number, width: number, height: number): void
}

/** @public */
export interface CanvasRenderOptions {
	x?: number
	y?: number
	/** Draw inline backgrounds. Defaults to true. */
	backgrounds?: boolean
}

/**
 * Draw a layout with `fillText`, one call per fragment at the layout's positions.
 *
 * @public
 */
export function drawLayout(
	layout: TextLayout,
	ctx: CanvasDrawContextLike,
	options: CanvasRenderOptions = {}
): void {
	const dx = options.x ?? 0
	const dy = options.y ?? 0
	ctx.textBaseline = 'alphabetic'
	for (const line of layout.lines) {
		const baseline = line.y + line.baseline + dy
		if (options.backgrounds !== false) {
			for (const f of line.fragments) {
				if (!f.style.background || f.kind === 'tab') continue
				ctx.fillStyle = f.style.background
				ctx.fillRect(
					line.x + f.x + dx,
					baseline + f.baselineShift - f.ascent,
					f.width,
					f.ascent + f.descent
				)
			}
		}
		for (const f of line.fragments) {
			if (f.kind === 'tab' || f.text.length === 0) continue
			ctx.font = fontSpecToString(f.style.font)
			ctx.fillStyle = f.style.color
			ctx.fillText(f.text, line.x + f.x + dx, baseline + f.baselineShift)
		}
	}
}
