import { OverlayUtil, TLInstancePresence, TLOverlay, Vec, clamp } from '@tldraw/editor'

/** @public */
export interface TLCollaboratorHintOverlay extends TLOverlay {
	props: {
		/** Clamped point on viewport edge, in page coordinates */
		x: number
		y: number
		/** Rotation angle pointing toward the collaborator's actual cursor */
		rotation: number
		color: string
	}
}

// Lazy-init a Path2D for the hint arrow shape to avoid per-frame path building
let _arrowPath: Path2D | null = null
function getArrowPath() {
	if (!_arrowPath) {
		// Matches the path drawn via: M -2,-5 2,0 -2,5 Z
		_arrowPath = new Path2D('M -2 -5 L 2 0 L -2 5 Z')
	}
	return _arrowPath!
}

/**
 * Overlay util for off-screen collaborator cursor hints.
 * Shows a small directional arrow at the viewport edge pointing toward the collaborator.
 *
 * @public
 */
export class CollaboratorHintOverlayUtil extends OverlayUtil<TLCollaboratorHintOverlay> {
	static override type = 'collaborator_hint'
	override options = { zIndex: 900, lineWidth: 3, viewportPadding: 5 }

	override isActive(): boolean {
		const viewport = this.editor.getViewportPageBounds()
		const zoom = this.editor.getZoomLevel()
		const now = this._getNow()
		return this.editor.getCollaboratorsOnCurrentPage().some((presence) => {
			const { cursor } = presence
			if (!cursor) return false
			if (!this._shouldShow(presence, now)) return false
			if (this._isCursorInViewport(cursor, viewport, zoom)) return false
			return true
		})
	}

	override getOverlays(): TLCollaboratorHintOverlay[] {
		const overlays: TLCollaboratorHintOverlay[] = []
		const viewport = this.editor.getViewportPageBounds()
		const zoom = this.editor.getZoomLevel()
		const now = this._getNow()

		for (const presence of this.editor.getCollaboratorsOnCurrentPage()) {
			const { cursor, color, userId } = presence
			if (!cursor) continue
			if (!this._shouldShow(presence, now)) continue
			if (this._isCursorInViewport(cursor, viewport, zoom)) continue

			const pad = this.options.viewportPadding / zoom
			const x = clamp(cursor.x, viewport.minX + pad, viewport.maxX - pad)
			const y = clamp(cursor.y, viewport.minY + pad, viewport.maxY - pad)
			const rotation = Vec.Angle(viewport.center, cursor)

			overlays.push({
				id: `collaborator_hint:${userId}`,
				type: 'collaborator_hint',
				props: { x, y, rotation, color },
			})
		}
		return overlays
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLCollaboratorHintOverlay[]): void {
		const zoom = this.editor.getEfficientZoomLevel()
		const scale = 1 / zoom

		for (const overlay of overlays) {
			const { x, y, rotation, color } = overlay.props

			ctx.save()
			ctx.translate(x, y)
			ctx.scale(scale, scale)
			ctx.rotate(rotation)

			const path = getArrowPath()

			// Outline stroke (white background for contrast)
			ctx.lineWidth = this.options.lineWidth
			// Canvas doesn't support CSS vars in strokeStyle; use white
			ctx.strokeStyle = '#ffffff'
			ctx.stroke(path)

			// Fill with collaborator color
			ctx.fillStyle = color
			ctx.fill(path)

			ctx.restore()
		}
	}

	private _getNow() {
		;(this.editor as any)._collaboratorVisibilityClock.get()
		return Date.now()
	}

	private _shouldShow(presence: TLInstancePresence, now: number) {
		const elapsed = now - (presence.lastActivityTimestamp ?? 0)
		return shouldShowCollaborator(
			this.editor,
			presence,
			getCollaboratorStateFromElapsedTime(this.editor, elapsed)
		)
	}

	/** @internal */
	_isCursorInViewport(
		cursor: { x: number; y: number },
		viewport: { minX: number; minY: number; maxX: number; maxY: number },
		zoom: number
	): boolean {
		return !(
			cursor.x < viewport.minX - 12 / zoom ||
			cursor.y < viewport.minY - 16 / zoom ||
			cursor.x > viewport.maxX - 12 / zoom ||
			cursor.y > viewport.maxY - 16 / zoom
		)
	}
}

function getCollaboratorStateFromElapsedTime(
	editor: CollaboratorHintOverlayUtil['editor'],
	elapsed: number
) {
	return elapsed > editor.options.collaboratorInactiveTimeoutMs
		? 'inactive'
		: elapsed > editor.options.collaboratorIdleTimeoutMs
			? 'idle'
			: 'active'
}

function shouldShowCollaborator(
	editor: CollaboratorHintOverlayUtil['editor'],
	presence: TLInstancePresence,
	state: 'active' | 'idle' | 'inactive'
) {
	const { followingUserId, highlightedUserIds } = editor.getInstanceState()

	switch (state) {
		case 'inactive':
			return followingUserId === presence.userId || highlightedUserIds.includes(presence.userId)
		case 'idle':
			if (presence.followingUserId === editor.user.getId()) {
				return !!(presence.chatMessage || highlightedUserIds.includes(presence.userId))
			}
			return true
		case 'active':
			return true
	}
}
