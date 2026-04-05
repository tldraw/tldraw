import { EASINGS, OverlayUtil, TLOverlay, TLScribble, getSvgPathFromPoints } from '@tldraw/editor'
import { getStroke } from '../shapes/shared/freehand/getStroke'

/** @public */
export interface TLScribbleOverlay extends TLOverlay {
	props: {
		scribble: TLScribble
	}
}

/**
 * Overlay util for scribble strokes (eraser, lasso selection, etc.).
 *
 * @public
 */
export class ScribbleOverlayUtil extends OverlayUtil<TLScribbleOverlay> {
	static override type = 'scribble'

	override isActive(): boolean {
		return this.editor.getInstanceState().scribbles.length > 0
	}

	override getOverlays(): TLScribbleOverlay[] {
		return this.editor.getInstanceState().scribbles.map((scribble) => ({
			id: `scribble:${scribble.id}`,
			type: 'scribble',
			props: { scribble },
		}))
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLScribbleOverlay[]): void {
		const zoom = this.editor.getEfficientZoomLevel()

		for (const overlay of overlays) {
			const { scribble } = overlay.props
			if (!scribble.points.length) continue

			const stroke = getStroke(scribble.points, {
				size: scribble.size / zoom,
				start: { taper: scribble.taper, easing: EASINGS.linear },
				last: scribble.state === 'complete' || scribble.state === 'stopping',
				simulatePressure: false,
				streamline: 0.32,
			})

			let d: string
			if (stroke.length < 4) {
				const r = scribble.size / zoom / 2
				const { x, y } = scribble.points[scribble.points.length - 1]
				d = `M ${x - r},${y} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0`
			} else {
				d = getSvgPathFromPoints(stroke)
			}

			const path = new Path2D(d)
			ctx.fillStyle = this._resolveColor(`var(--tl-color-${scribble.color})`)
			ctx.globalAlpha = scribble.opacity
			ctx.fill(path)
			ctx.globalAlpha = 1
		}
	}

	/** @internal */
	_resolveColor(value: string): string {
		if (!value.startsWith('var(')) return value
		const varName = value.slice(4, -1)
		const container = this.editor.getContainer()
		return getComputedStyle(container).getPropertyValue(varName) || value
	}
}
