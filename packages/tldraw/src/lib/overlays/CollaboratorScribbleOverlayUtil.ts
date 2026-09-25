import { OverlayUtil, TLOverlay, TLScribble } from '@tldraw/editor'
import { ScribblePathCache, getScribblePath } from './ScribbleOverlayUtil'

/** @public */
export interface TLCollaboratorScribbleOverlay extends TLOverlay {
	props: {
		scribble: TLScribble
		color: string
	}
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
	// cap in `getScribblePath`.
	private _collabScribblePathCache: ScribblePathCache = new Map()

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
			const path = getScribblePath(
				this._collabScribblePathCache,
				overlay.id,
				scribble,
				zoom,
				this.options
			)
			if (!path) continue

			ctx.fillStyle = color
			ctx.globalAlpha = scribble.color === 'laser' ? 0.5 : 0.1
			ctx.fill(path)
			ctx.globalAlpha = 1
		}
	}
}
