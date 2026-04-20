import { OverlayUtil, TLInstancePresence, TLOverlay } from '@tldraw/editor'
import type { Editor } from '@tldraw/editor'

/** @public */
export interface TLCollaboratorCursorOverlay extends TLOverlay {
	props: {
		x: number
		y: number
		color: string
		name: string | null
		chatMessage: string
	}
}

// Lazy-initialized Path2D objects for the cursor arrow shape (deferred to avoid jsdom issues in tests).
let _shadowPath: Path2D | null = null
let _whitePath: Path2D | null = null
let _fillPath: Path2D | null = null

function getCursorPaths() {
	if (!_shadowPath) {
		// Shadow layer (original SVG translate(-11,-11) pre-applied):
		_shadowPath = new Path2D(
			'M 1 13.4219 V -2.593 L 12.591 9.026 H 5.81 L 5.399 9.15 Z M 10.0845 14.0962 L 6.4795 15.6312 L 1.7975 4.5422 L 5.4835 2.9892 Z'
		)
		// White outline layer (original SVG translate(-12,-12) pre-applied):
		_whitePath = new Path2D(
			'M 0 12.4219 V -3.593 L 11.591 8.026 H 4.81 L 4.399 8.15 Z M 9.0845 13.0962 L 5.4795 14.6312 L 0.7975 3.5422 L 4.4835 1.9892 Z'
		)
		// Colored fill layer (original SVG translate(-12,-12) pre-applied):
		_fillPath = new Path2D(
			'M 7.751 12.4155 L 5.907 13.1895 L 2.807 5.8155 L 4.648 5.0405 Z M 1 -1.186 V 10.002 L 3.969 7.136 L 4.397 6.997 H 9.165 Z'
		)
	}
	return { shadow: _shadowPath, white: _whitePath!, fill: _fillPath! }
}

// Cache truncated text results to avoid repeated measureText loops.
// Key format: `${maxWidth}|${text}` with an upper bound on cache size.
const _truncateCache = new Map<string, string>()
const TRUNCATE_CACHE_MAX = 200

/**
 * Overlay util for collaborator cursors (arrow + name tag + chat message).
 *
 * @public
 */
export class CollaboratorCursorOverlayUtil extends OverlayUtil<TLCollaboratorCursorOverlay> {
	static override type = 'collaborator_cursor'
	override options = { zIndex: 1100 }

	override isActive(): boolean {
		return this.editor.getCollaboratorsOnCurrentPage().length > 0
	}

	override getOverlays(): TLCollaboratorCursorOverlay[] {
		const overlays: TLCollaboratorCursorOverlay[] = []
		const editor = this.editor
		const viewport = editor.getViewportPageBounds()
		const zoom = editor.getZoomLevel()
		const now = Date.now()

		for (const presence of editor.getCollaboratorsOnCurrentPage()) {
			const { cursor, color, userName, chatMessage, userId } = presence
			if (!cursor) continue

			// Viewport check
			if (
				cursor.x < viewport.minX - 12 / zoom ||
				cursor.y < viewport.minY - 16 / zoom ||
				cursor.x > viewport.maxX - 12 / zoom ||
				cursor.y > viewport.maxY - 16 / zoom
			) {
				continue
			}

			// Activity state check
			if (!this._shouldShow(editor, presence, now)) continue

			overlays.push({
				id: `collaborator_cursor:${userId}`,
				type: 'collaborator_cursor',
				props: {
					x: cursor.x,
					y: cursor.y,
					color,
					name: userName !== 'New User' ? userName : null,
					chatMessage: chatMessage ?? '',
				},
			})
		}
		return overlays
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLCollaboratorCursorOverlay[]): void {
		const zoom = this.editor.getEfficientZoomLevel()
		const scale = 1 / zoom

		for (const overlay of overlays) {
			const { x, y, color, name, chatMessage } = overlay.props

			ctx.save()
			ctx.translate(x, y)
			ctx.scale(scale, scale)

			// Draw cursor arrow
			const paths = getCursorPaths()

			// Shadow
			ctx.fillStyle = 'rgba(0,0,0,0.2)'
			ctx.fill(paths.shadow)

			// White outline
			ctx.fillStyle = '#ffffff'
			ctx.fill(paths.white)

			// Colored fill
			ctx.fillStyle = color
			ctx.fill(paths.fill)

			// Draw name tag / chat
			if (chatMessage) {
				if (name) {
					this._drawNameTitle(ctx, name, color)
				}
				this._drawChatBubble(ctx, chatMessage, color)
			} else if (name) {
				this._drawNameTag(ctx, name, color)
			}

			ctx.restore()
		}
	}

	/** Name tag (no chat) - colored background with white text */
	private _drawNameTag(ctx: CanvasRenderingContext2D, name: string, color: string) {
		ctx.font = '12px var(--tl-font-body, sans-serif)'
		const maxWidth = 120
		const text = this._truncateText(ctx, name, maxWidth)
		const metrics = ctx.measureText(text)
		const textWidth = Math.min(metrics.width, maxWidth)
		const px = 6
		const py = 3
		const x = 13
		const y = 16
		const h = 12 + py * 2
		const w = textWidth + px * 2

		// Background
		ctx.fillStyle = color
		this._roundRect(ctx, x, y, w, h, 4)
		ctx.fill()

		// Text
		ctx.fillStyle = '#ffffff'
		ctx.textBaseline = 'top'
		ctx.fillText(text, x + px, y + py)
	}

	/** Name title (when chat is present) - text with shadow, no background */
	private _drawNameTitle(ctx: CanvasRenderingContext2D, name: string, color: string) {
		ctx.font = '12px var(--tl-font-body, sans-serif)'
		const x = 13
		const y = -2

		// Text outline (simulate text-shadow)
		ctx.strokeStyle = '#ffffff'
		ctx.lineWidth = 3
		ctx.lineJoin = 'round'
		ctx.textBaseline = 'top'
		ctx.strokeText(name, x, y)

		// Text fill
		ctx.fillStyle = color
		ctx.fillText(name, x, y)
	}

	/** Chat bubble - colored background with white text */
	private _drawChatBubble(ctx: CanvasRenderingContext2D, chatMessage: string, color: string) {
		ctx.font = '12px var(--tl-font-body, sans-serif)'
		const maxWidth = 200
		const text = this._truncateText(ctx, chatMessage, maxWidth)
		const metrics = ctx.measureText(text)
		const textWidth = Math.min(metrics.width, maxWidth)
		const px = 6
		const py = 3
		const x = 13
		const y = 16
		const h = 12 + py * 2
		const w = textWidth + px * 2

		// Background
		ctx.fillStyle = color
		this._roundRect(ctx, x, y, w, h, 4)
		ctx.fill()

		// Text
		ctx.fillStyle = '#ffffff'
		ctx.textBaseline = 'top'
		ctx.fillText(text, x + px, y + py)
	}

	private _shouldShow(editor: Editor, presence: TLInstancePresence, now: number): boolean {
		const elapsed = now - (presence.lastActivityTimestamp ?? 0)
		const { followingUserId, highlightedUserIds } = editor.getInstanceState()
		const isHighlighted = highlightedUserIds.includes(presence.userId)

		if (elapsed > editor.options.collaboratorInactiveTimeoutMs) {
			// Inactive: only show if following or highlighted
			return followingUserId === presence.userId || isHighlighted
		}
		if (elapsed > editor.options.collaboratorIdleTimeoutMs) {
			// Idle: hide if they're following us (unless chat/highlighted)
			if (presence.followingUserId === editor.user.getId()) {
				return !!(presence.chatMessage || isHighlighted)
			}
		}
		return true
	}

	private _truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
		const key = `${maxWidth}|${text}`
		const cached = _truncateCache.get(key)
		if (cached) return cached
		if (ctx.measureText(text).width <= maxWidth) {
			if (_truncateCache.size > TRUNCATE_CACHE_MAX) _truncateCache.clear()
			_truncateCache.set(key, text)
			return text
		}
		let truncated = text
		while (truncated.length > 0 && ctx.measureText(truncated + '…').width > maxWidth) {
			truncated = truncated.slice(0, -1)
		}
		const result = truncated + '…'
		if (_truncateCache.size > TRUNCATE_CACHE_MAX) _truncateCache.clear()
		_truncateCache.set(key, result)
		return result
	}

	private _roundRect(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		r: number
	) {
		ctx.beginPath()
		ctx.moveTo(x + r, y)
		ctx.lineTo(x + w - r, y)
		ctx.quadraticCurveTo(x + w, y, x + w, y + r)
		ctx.lineTo(x + w, y + h - r)
		ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
		ctx.lineTo(x + r, y + h)
		ctx.quadraticCurveTo(x, y + h, x, y + h - r)
		ctx.lineTo(x, y + r)
		ctx.quadraticCurveTo(x, y, x + r, y)
		ctx.closePath()
	}
}
