import { EASINGS, OverlayUtil, TLOverlay, TLScribble, getSvgPathFromPoints } from '@tldraw/editor'
import { getStroke } from '../shapes/shared/freehand/getStroke'

/** @public */
export interface TLCollaboratorScribbleOverlay extends TLOverlay {
	props: {
		scribble: TLScribble
		color: string
	}
}

// Cache Path2D results for collaborator scribbles similarly to local scribbles
interface CollaboratorScribbleCacheEntry {
	len: number
	lastX: number
	lastY: number
	zoom: number
	size: number
	taper: boolean
	state: TLCollaboratorScribbleOverlay['props']['scribble']['state']
	path: Path2D
}

/**
 * Overlay util for collaborator scribble strokes (eraser, lasso, etc.).
 *
 * @public
 */
export class CollaboratorScribbleOverlayUtil extends OverlayUtil<TLCollaboratorScribbleOverlay> {
	static override type = 'collaborator_scribble'
	override options = { zIndex: 800, streamline: 0.32, cacheSize: 500 }

	// String-keyed (not a WeakMap) because the cache key is a logical identity
	// — `${overlay.id}` derived from `scribble.id` — not the scribble object.
	// Tldraw's store replaces record objects on every update, so a WeakMap
	// keyed on the `TLScribble` instance would cache-miss every frame. Lifetime
	// is bounded by the Util instance (so, by the editor) plus the `cacheSize`
	// cap in `render` below.
	private _collabScribblePathCache = new Map<string, CollaboratorScribbleCacheEntry>()

	override isActive(): boolean {
		return this.editor.getVisibleCollaboratorsOnCurrentPage().some((c) => c.scribbles.length > 0)
	}

	override getOverlays(): TLCollaboratorScribbleOverlay[] {
		const overlays: TLCollaboratorScribbleOverlay[] = []
		for (const presence of this.editor.getVisibleCollaboratorsOnCurrentPage()) {
			const { scribbles, color, userId } = presence
			for (const scribble of scribbles) {
				overlays.push({
					id: `collaborator_scribble:${userId}:${scribble.id}`,
					type: 'collaborator_scribble',
					props: { scribble, color },
				})
			}
		}
		return overlays
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLCollaboratorScribbleOverlay[]): void {
		const zoom = this.editor.getZoomLevel()

		for (const overlay of overlays) {
			const { scribble, color } = overlay.props
			const ptsLen = scribble.points.length
			if (!ptsLen) continue

			const last = scribble.points[ptsLen - 1]
			const cacheKey = overlay.id
			const cached = this._collabScribblePathCache.get(cacheKey)
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
					streamline: this.options.streamline,
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
				this._collabScribblePathCache.set(cacheKey, {
					len: ptsLen,
					lastX: last.x,
					lastY: last.y,
					zoom,
					size: scribble.size,
					taper: scribble.taper,
					state: scribble.state,
					path,
				})
				if (this._collabScribblePathCache.size > this.options.cacheSize)
					this._collabScribblePathCache.clear()
			}

			ctx.fillStyle = color
			ctx.globalAlpha = scribble.color === 'laser' ? 0.5 : 0.1
			ctx.fill(path)
			ctx.globalAlpha = 1
		}
	}
}
