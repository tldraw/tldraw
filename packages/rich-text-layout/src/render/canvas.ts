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
	strokeStyle: string
	lineWidth: number
	fillText(text: string, x: number, y: number): void
	fillRect(x: number, y: number, width: number, height: number): void
	strokeRect(x: number, y: number, width: number, height: number): void
	beginPath(): void
	arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void
	fill(): void
	stroke(): void
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
			if (f.kind === 'marker' && f.symbol) {
				const { shape, size } = f.symbol
				const sx = line.x + f.symbol.x + dx
				const sy = line.y + f.symbol.y + dy
				ctx.fillStyle = f.style.color
				ctx.strokeStyle = f.style.color
				ctx.lineWidth = 1
				if (shape === 'square') {
					ctx.fillRect(sx, sy, size, size)
				} else {
					ctx.beginPath()
					ctx.arc(
						sx + size / 2,
						sy + size / 2,
						shape === 'circle' ? (size - 1) / 2 : size / 2,
						0,
						Math.PI * 2
					)
					if (shape === 'circle') ctx.stroke()
					else ctx.fill()
				}
				continue
			}
			ctx.font = fontSpecToString(f.style.font)
			ctx.fillStyle = f.style.color
			ctx.fillText(f.text, line.x + f.x + dx, baseline + f.baselineShift)
		}
	}
}
