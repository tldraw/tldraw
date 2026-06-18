import { OverlayUtil, PI2, TLOverlay } from '@tldraw/editor'

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
// Head and tail are separate Path2D objects per layer so each is filled in its own draw call,
// mirroring the original SVG's two-<path> layout per group.
let _shadowHead: Path2D | null = null
let _shadowTail: Path2D | null = null

let _whiteHead: Path2D | null = null
let _whiteTail: Path2D | null = null

let _fillHead: Path2D | null = null
let _fillTail: Path2D | null = null

function getCursorPaths() {
	if (!_shadowHead) {
		// Shadow layer (original SVG translate(-11,-11) pre-applied):
		_shadowHead = new Path2D('M 1 13.4219 V -2.593 L 12.591 9.026 H 5.81 L 5.399 9.15 Z')
		_shadowTail = new Path2D('M 10.0595 13.9498 L 6.3715 15.4978 L 2.4965 6.2803 L 6.1845 4.7323 Z')
		// White outline layer (original SVG translate(-12,-12) pre-applied):
		_whiteHead = new Path2D('M 0 12.4219 V -3.593 L 11.591 8.026 H 4.81 L 4.399 8.15 Z')
		_whiteTail = new Path2D('M 9.0595 12.9498 L 5.3715 14.4978 L 1.4965 5.2803 L 5.1845 3.7323 Z')
		// Colored fill layer (original SVG translate(-12,-12) pre-applied):
		_fillHead = new Path2D('M 1 -1.186 V 10.002 L 3.969 7.136 L 4.397 6.997 H 9.165 Z')
		_fillTail = new Path2D('M 7.751 12.4155 L 5.907 13.1895 L 2.807 5.8155 L 4.648 5.0405 Z')
	}
	return {
		shadowHead: _shadowHead,
		shadowTail: _shadowTail!,
		whiteHead: _whiteHead!,
		whiteTail: _whiteTail!,
		fillHead: _fillHead!,
		fillTail: _fillTail!,
	}
}

const TRUNCATE_CACHE_MAX = 200
const DEFAULT_LABEL_FONT_FAMILY = "'tldraw_sans', sans-serif"

function getLabelFontFamily(editorContainer: HTMLElement, editorWindow: Window): string {
	const fontFamily = editorWindow
		.getComputedStyle(editorContainer)
		.getPropertyValue('--tl-font-sans')
		.trim()

	return fontFamily && !fontFamily.includes('var(') ? fontFamily : DEFAULT_LABEL_FONT_FAMILY
}

/**
 * Overlay util for collaborator cursors (arrow + name tag + chat message).
 *
 * @public
 */
export class CollaboratorCursorOverlayUtil extends OverlayUtil<TLCollaboratorCursorOverlay> {
	static override type = 'collaborator_cursor'
	override options = { zIndex: 1100, fontSize: 12, nameMaxWidth: 120, chatMaxWidth: 200 }

	// Cache truncated text results to avoid repeated measureText loops.
	// Key format: `${maxWidth}|${text}` with an upper bound on cache size.
	// Per-editor so multiple <Tldraw /> instances on one page don't trample
	// each other's entries.
	private _truncateCache = new Map<string, string>()

	override isActive(): boolean {
		return this.editor.getVisibleCollaboratorsOnCurrentPage().some((presence) => !!presence.cursor)
	}

	override getOverlays(): TLCollaboratorCursorOverlay[] {
		const overlays: TLCollaboratorCursorOverlay[] = []

		// Visibility (activity state, following, highlighting) is handled by the
		// editor. The main-canvas viewport cull lives in `render` so off-screen
		// cursors still show on the minimap via `renderMinimap`.
		for (const presence of this.editor.getVisibleCollaboratorsOnCurrentPage()) {
			const { cursor, color, userName, chatMessage, userId } = presence
			if (!cursor) continue

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
		const zoom = this.editor.getZoomLevel()
		const scale = 1 / zoom
		const viewport = this.editor.getViewportPageBounds()
		const viewportMarginX = 12 / zoom
		const viewportMarginY = 16 / zoom
		const labelFontFamily = getLabelFontFamily(
			this.editor.getContainer(),
			this.editor.getContainerWindow()
		)
		let paths: ReturnType<typeof getCursorPaths> | null = null

		for (const overlay of overlays) {
			const { x, y, color, name, chatMessage } = overlay.props

			// Cull cursors outside the main viewport (with a small margin for
			// the cursor glyph). Off-screen cursors still show on the minimap
			// via `renderMinimap`.
			if (
				x < viewport.minX - viewportMarginX ||
				y < viewport.minY - viewportMarginY ||
				x > viewport.maxX - viewportMarginX ||
				y > viewport.maxY - viewportMarginY
			) {
				continue
			}

			ctx.save()
			ctx.translate(x, y)
			ctx.scale(scale, scale)

			// Draw cursor arrow
			paths ??= getCursorPaths()

			// Shadow
			ctx.fillStyle = 'rgba(0,0,0,0.2)'
			ctx.fill(paths.shadowHead)
			ctx.fill(paths.shadowTail)

			// White outline
			ctx.fillStyle = '#ffffff'
			ctx.fill(paths.whiteHead)
			ctx.fill(paths.whiteTail)

			// Colored fill
			ctx.fillStyle = color
			ctx.fill(paths.fillHead)
			ctx.fill(paths.fillTail)

			// Draw name tag / chat
			if (chatMessage) {
				if (name) {
					this._drawNameTitle(ctx, name, color, labelFontFamily)
				}
				this._drawChatBubble(ctx, chatMessage, color, labelFontFamily)
			} else if (name) {
				this._drawNameTag(ctx, name, color, labelFontFamily)
			}

			ctx.restore()
		}
	}

	/** Name tag (no chat) - colored background with white text */
	private _drawNameTag(
		ctx: CanvasRenderingContext2D,
		name: string,
		color: string,
		fontFamily: string
	) {
		const { fontSize, nameMaxWidth } = this.options
		ctx.font = `${fontSize}px ${fontFamily}`
		const text = this._truncateText(ctx, name, nameMaxWidth)
		const metrics = ctx.measureText(text)
		const textWidth = Math.min(metrics.width, nameMaxWidth)
		const px = 6
		const py = 3
		const x = 13
		const y = 16
		const h = fontSize + py * 2
		const w = textWidth + px * 2

		// Background
		ctx.fillStyle = color
		ctx.beginPath()
		ctx.roundRect(x, y, w, h, 4)
		ctx.fill()

		// Text
		ctx.fillStyle = '#ffffff'
		ctx.textBaseline = 'top'
		ctx.fillText(text, x + px, y + py)
	}

	/** Name title (when chat is present) - text with shadow, no background */
	private _drawNameTitle(
		ctx: CanvasRenderingContext2D,
		name: string,
		color: string,
		fontFamily: string
	) {
		const { fontSize, nameMaxWidth } = this.options
		ctx.font = `${fontSize}px ${fontFamily}`
		const text = this._truncateText(ctx, name, nameMaxWidth)
		const x = 13
		const y = -2

		// Text outline (simulate text-shadow)
		ctx.strokeStyle = '#ffffff'
		ctx.lineWidth = 3
		ctx.lineJoin = 'round'
		ctx.textBaseline = 'top'
		ctx.strokeText(text, x, y)

		// Text fill
		ctx.fillStyle = color
		ctx.fillText(text, x, y)
	}

	/** Chat bubble - colored background with white text */
	private _drawChatBubble(
		ctx: CanvasRenderingContext2D,
		chatMessage: string,
		color: string,
		fontFamily: string
	) {
		const { fontSize, chatMaxWidth } = this.options
		ctx.font = `${fontSize}px ${fontFamily}`
		const text = this._truncateText(ctx, chatMessage, chatMaxWidth)
		const metrics = ctx.measureText(text)
		const textWidth = Math.min(metrics.width, chatMaxWidth)
		const px = 6
		const py = 3
		const x = 13
		const y = 16
		const h = fontSize + py * 2
		const w = textWidth + px * 2

		// Background
		ctx.fillStyle = color
		ctx.beginPath()
		ctx.roundRect(x, y, w, h, 4)
		ctx.fill()

		// Text
		ctx.fillStyle = '#ffffff'
		ctx.textBaseline = 'top'
		ctx.fillText(text, x + px, y + py)
	}

	override renderMinimap(
		ctx: CanvasRenderingContext2D,
		overlays: TLCollaboratorCursorOverlay[],
		zoom: number
	): void {
		// Small filled dot per collaborator, clamped inside the minimap's
		// page bounds is left to the caller — we just render at the cursor
		// page-position and let the viewport rounded-rect indicate framing.
		const radius = 3 / zoom
		for (const overlay of overlays) {
			const { x, y, color } = overlay.props
			ctx.beginPath()
			ctx.arc(x, y, radius, 0, PI2)
			ctx.fillStyle = color
			ctx.fill()
		}
	}

	private _truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
		const key = `${ctx.font}|${maxWidth}|${text}`
		const cached = this._truncateCache.get(key)
		if (cached !== undefined) return cached

		if (ctx.measureText(text).width <= maxWidth) {
			return this._setTruncatedTextCache(key, text)
		}

		const ellipsis = '…'
		let low = 0
		let high = text.length
		while (low < high) {
			const mid = Math.ceil((low + high) / 2)
			if (ctx.measureText(text.slice(0, mid) + ellipsis).width <= maxWidth) {
				low = mid
			} else {
				high = mid - 1
			}
		}

		return this._setTruncatedTextCache(key, text.slice(0, low) + ellipsis)
	}

	private _setTruncatedTextCache(key: string, result: string): string {
		if (this._truncateCache.size >= TRUNCATE_CACHE_MAX) this._truncateCache.clear()
		this._truncateCache.set(key, result)
		return result
	}
}
