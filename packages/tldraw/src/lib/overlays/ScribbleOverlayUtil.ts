import {
	EASINGS,
	OverlayUtil,
	TLCanvasUiColor,
	TLOverlay,
	TLScribble,
	TLThemeColors,
	getSvgPathFromPoints,
} from '@tldraw/editor'
import { getStroke } from '../shapes/shared/freehand/getStroke'

/** @public */
export interface TLScribbleOverlay extends TLOverlay {
	props: {
		scribble: TLScribble
	}
}

// Cache Path2D results for scribbles when inputs have not changed.
// Keyed by scribble id; invalidated when points length/last point/zoom/size/taper/state change.
interface ScribbleCacheEntry {
	len: number
	lastX: number
	lastY: number
	zoom: number
	size: number
	taper: boolean
	state: TLScribble['state']
	path: Path2D
}
const _scribblePathCache = new Map<string, ScribbleCacheEntry>()
const SCRIBBLE_CACHE_MAX = 500

/**
 * Overlay util for scribble strokes (eraser, lasso selection, etc.).
 *
 * @public
 */
export class ScribbleOverlayUtil extends OverlayUtil<TLScribbleOverlay> {
	static override type = 'scribble'
	override options = { zIndex: 600 }

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
		const colors = this.editor.getCurrentTheme().colors[this.editor.getColorMode()]

		for (const overlay of overlays) {
			const { scribble } = overlay.props
			const ptsLen = scribble.points.length
			if (!ptsLen) continue

			const last = scribble.points[ptsLen - 1]
			const cached = _scribblePathCache.get(scribble.id)
			let path: Path2D
			if (
				cached &&
				cached.len === ptsLen &&
				cached.lastX === last.x &&
				cached.lastY === last.y &&
				cached.zoom === zoom &&
				cached.size === scribble.size &&
				cached.taper === scribble.taper &&
				cached.state === scribble.state
			) {
				path = cached.path
			} else {
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
					const { x, y } = last
					d = `M ${x - r},${y} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0`
				} else {
					d = getSvgPathFromPoints(stroke)
				}

				path = new Path2D(d)
				_scribblePathCache.set(scribble.id, {
					len: ptsLen,
					lastX: last.x,
					lastY: last.y,
					zoom,
					size: scribble.size,
					taper: scribble.taper,
					state: scribble.state,
					path,
				})
				if (_scribblePathCache.size > SCRIBBLE_CACHE_MAX) _scribblePathCache.clear()
			}

			ctx.fillStyle = resolveCanvasUiColor(colors, scribble.color)
			ctx.globalAlpha = scribble.opacity
			ctx.fill(path)
			ctx.globalAlpha = 1
		}
	}
}

/** @internal */
function resolveCanvasUiColor(colors: TLThemeColors, color: TLCanvasUiColor): string {
	switch (color) {
		case 'accent':
		case 'selection-stroke':
			return colors.selectionStroke
		case 'selection-fill':
			return colors.selectionFill
		case 'white':
			return colors.selectedContrast
		case 'black':
			return colors.text
		case 'laser':
			return colors.laser
		case 'muted-1':
			return colors.brushFill
		default:
			return colors.text
	}
}
