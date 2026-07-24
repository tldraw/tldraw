import { Circle2d, Geometry2d, OverlayUtil, TLCursorType, TLOverlay } from 'tldraw'
import { demoThreads, openThreadId } from './comment-pin-demo-state'

/** Pin radius, in screen pixels — the marker stays a constant on-screen size at any zoom. */
const PIN_RADIUS = 13

interface TLCommentPinOverlay extends TLOverlay {
	props: {
		threadId: string
		x: number
		y: number
		color: string
		label: string
		resolved: boolean
		open: boolean
	}
}

/**
 * Draws each comment thread as a pin on the canvas, and opens its thread on click.
 *
 * The pin is a canvas-space pseudo-shape, exactly like the built-in selection handles and
 * collaborator cursors: it lives in the one flattened overlay canvas, positioned by `zIndex`
 * alone. At 1050 it sits in the gap between `ArrowHintOverlayUtil` (1000) and
 * `CollaboratorCursorOverlayUtil` (1100) — above every selection / brush / snap / indicator
 * overlay, below collaborator cursors. That single integer is the whole layering behaviour;
 * no second canvas and no band split are involved.
 *
 * The thread popover stays in the React tree (see `CommentPinOverlayExample`) — only the marker
 * is on the canvas.
 */
export class CommentPinOverlayUtil extends OverlayUtil<TLCommentPinOverlay> {
	static override type = 'comment_pin'
	override options = { zIndex: 1050 }

	override isActive(): boolean {
		return demoThreads.get().length > 0
	}

	override getOverlays(): TLCommentPinOverlay[] {
		const openId = openThreadId.get()
		return demoThreads.get().map((thread) => ({
			id: `comment_pin:${thread.id}`,
			type: 'comment_pin',
			props: {
				threadId: thread.id,
				x: thread.x,
				y: thread.y,
				color: thread.color,
				label: thread.count > 1 ? String(thread.count) : thread.initial,
				resolved: thread.resolved,
				open: thread.id === openId,
			},
		}))
	}

	override getGeometry(overlay: TLCommentPinOverlay): Geometry2d {
		// Match the screen-constant marker: a page-space radius that shrinks as you zoom in.
		const radius = PIN_RADIUS / this.editor.getZoomLevel()
		const { x, y } = overlay.props
		// Circle2d's x/y is the top-left of the bounding box, so offset by the radius to center on
		// the anchor.
		return new Circle2d({ x: x - radius, y: y - radius, radius, isFilled: true })
	}

	override getCursor(): TLCursorType {
		return 'pointer'
	}

	override onPointerDown(overlay: TLCommentPinOverlay): boolean {
		// Open this thread and consume the event, so the press doesn't fall through to the shape
		// under the pin (which would start a selection/translate). Returning true skips the default
		// canvas routing — the pin owns this pointer-down.
		openThreadId.set(overlay.props.threadId)
		return true
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLCommentPinOverlay[]): void {
		// The context is in page space with the camera applied; scale by 1/zoom so everything below
		// is drawn in screen pixels around the anchor.
		const scale = 1 / this.editor.getZoomLevel()

		for (const overlay of overlays) {
			const { x, y, color, label, resolved, open } = overlay.props
			ctx.save()
			ctx.translate(x, y)
			ctx.scale(scale, scale)

			// White disc with a soft drop shadow — the pin's outline.
			ctx.shadowColor = 'rgba(0,0,0,0.25)'
			ctx.shadowBlur = 4
			ctx.shadowOffsetY = 2
			ctx.fillStyle = '#ffffff'
			ctx.beginPath()
			ctx.arc(0, 0, PIN_RADIUS, 0, Math.PI * 2)
			ctx.fill()
			ctx.shadowColor = 'transparent'
			ctx.shadowBlur = 0
			ctx.shadowOffsetY = 0

			// Colored fill (muted when resolved).
			ctx.fillStyle = resolved ? '#c1c8cd' : color
			ctx.beginPath()
			ctx.arc(0, 0, PIN_RADIUS - 2, 0, Math.PI * 2)
			ctx.fill()

			if (resolved) {
				// A check mark instead of a label.
				ctx.strokeStyle = '#ffffff'
				ctx.lineWidth = 2
				ctx.lineCap = 'round'
				ctx.lineJoin = 'round'
				ctx.beginPath()
				ctx.moveTo(-4, 0)
				ctx.lineTo(-1.5, 3)
				ctx.lineTo(4, -3.5)
				ctx.stroke()
			} else {
				ctx.fillStyle = '#ffffff'
				ctx.font = '600 12px sans-serif'
				ctx.textAlign = 'center'
				ctx.textBaseline = 'middle'
				// Nudge down 1px: text baseline metrics sit slightly high for a centered glyph.
				ctx.fillText(label, 0, 1)
			}

			// Open threads get a ring so the marker reads as selected under its popover.
			if (open) {
				ctx.strokeStyle = resolved ? '#8b949e' : color
				ctx.lineWidth = 2
				ctx.beginPath()
				ctx.arc(0, 0, PIN_RADIUS + 2.5, 0, Math.PI * 2)
				ctx.stroke()
			}

			ctx.restore()
		}
	}

	override renderMinimap(
		ctx: CanvasRenderingContext2D,
		overlays: TLCommentPinOverlay[],
		zoom: number
	): void {
		const radius = 3 / zoom
		for (const overlay of overlays) {
			const { x, y, color, resolved } = overlay.props
			ctx.beginPath()
			ctx.arc(x, y, radius, 0, Math.PI * 2)
			ctx.fillStyle = resolved ? '#c1c8cd' : color
			ctx.fill()
		}
	}
}
