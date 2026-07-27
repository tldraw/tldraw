import {
	Circle2d,
	Editor,
	EditorAtom,
	Geometry2d,
	OverlayUtil,
	Rectangle2d,
	TLCommentAnchor,
	TLCursorType,
	TLOverlay,
} from 'tldraw'
import { commentsHidden, openThreadId } from './state'
import { anchorPagePoint, impreciseShapePinInset } from './thread-state'

/** The marker's screen size, matching the DOM pin (`.tlui-cmt-pin` is 34×34). */
const PIN_SIZE = 34
/** The teardrop's corner radii, matching `border-radius: 50% 50% 50% 3px`. */
const PIN_RADII = [17, 17, 17, 3]
/** The open ring's two bands, matching the DOM pin's box-shadow rings. */
const OPEN_RING_INNER = 3
const OPEN_RING_OUTER = 5
/** Screen-space cull margin around the viewport, so a marker straddling the edge still draws. */
const CULL_MARGIN_PX = 60
const DEFAULT_FONT_FAMILY = "'tldraw_sans', sans-serif"

/**
 * A pin to draw: the thread's anchor (resolved to a page point at draw time, so pins ride shape
 * moves and region edits without the mirror rewriting) plus the marker's display state.
 * @public
 */
export interface CommentPinDisplayPin {
	threadId: string
	anchor: TLCommentAnchor
	/** The author tint, or undefined for the default pin color. */
	color: string | undefined
	/** The marker's content — an author initial. */
	label: string
	resolved: boolean
	/** Extra screen-px offset: region pins center on their corner instead of hanging off it. */
	screenOffset: { x: number; y: number } | null
}

/** A cluster badge to draw: a baked page-space centroid and its member count. @public */
export interface CommentPinDisplayBadge {
	nodeId: string
	point: { x: number; y: number }
	count: number
}

/** The full pin/badge list the overlay util draws, plus the resolved imprecise-anchor spot.
 * @public */
export interface CommentPinDisplay {
	pins: CommentPinDisplayPin[]
	badges: CommentPinDisplayBadge[]
	/** The imprecise shape-anchor spot the layer resolved from props/options. */
	impreciseShapeAnchor: { x: number; y: number }
}

const EMPTY_DISPLAY: CommentPinDisplay = {
	pins: [],
	badges: [],
	impreciseShapeAnchor: { x: 1, y: 0 },
}

/**
 * What the pin overlay should draw, mirrored from `CanvasComments`. The React layer stays the
 * brain — it computes clustering, holds, orphans, and the open thread — and writes the resulting
 * pin/badge list here; the overlay util is a renderer of this atom. Cleared when the layer
 * unmounts, so an unlicensed or comments-free editor draws nothing.
 * @public
 */
export const commentPinDisplay = new EditorAtom<CommentPinDisplay>(
	'commentPinDisplay',
	() => EMPTY_DISPLAY
)

/**
 * A pending request to zoom a cluster badge to its first split — the badge click's counterpart to
 * `revealThreadRequest`. Written by the overlay util's pointer handler; served and cleared by
 * `CanvasComments`, which owns the cluster table the zoom is computed from.
 * @public
 */
export const clusterExpandRequest = new EditorAtom<string | null>(
	'clusterExpandRequest',
	() => null
)

/** The overlay instances the pin util produces — one per pin, one per cluster badge.
 * @public */
export interface TLCommentPinOverlay extends TLOverlay {
	props: {
		kind: 'pin' | 'badge'
		/** The pin's thread id, or the badge's cluster node id. */
		targetId: string
		/** Marker origin in page space (the anchor point, screen offsets applied). */
		x: number
		y: number
		color: string | undefined
		label: string
		resolved: boolean
		open: boolean
		count: number
		/** Page-space hit rect, baked at the zoom this instance was generated for. */
		hit: { x: number; y: number; w: number; h: number }
	}
}

/**
 * Draws the comment pins and cluster badges into the canvas overlay layer, between the selection
 * chrome and the collaborator cursors.
 *
 * The pin is a canvas-space pseudo-shape like the built-in handles and cursors: it joins the one
 * ordered overlay canvas at zIndex 1050 — the gap between `ArrowHintOverlayUtil` (1000) and
 * `CollaboratorCursorOverlayUtil` (1100) — so it paints above every selection/brush/snap/indicator
 * overlay and below cursors. Clicking a pin toggles its thread's popover (still DOM, anchored by
 * coordinates); clicking a badge requests its cluster's expand zoom via `clusterExpandRequest`.
 *
 * The `PinContent` component slot is not supported here — arbitrary React content can't render to
 * the canvas. Threads still draw the default author-initial marker when it's configured.
 * @public
 */
export class CommentPinOverlayUtil extends OverlayUtil<TLCommentPinOverlay> {
	static override type = 'comment_pin'
	override options = { zIndex: 1050 }

	override isActive(): boolean {
		if (commentsHidden.get(this.editor)) return false
		const display = commentPinDisplay.get(this.editor)
		return display.pins.length > 0 || display.badges.length > 0
	}

	override getOverlays(): TLCommentPinOverlay[] {
		const editor = this.editor
		const display = commentPinDisplay.get(editor)
		const openId = openThreadId.get(editor)
		// Read zoom here so instances regenerate per camera change — the baked hit rects (and the
		// manager's per-instance geometry cache) stay correct as the screen-fixed marker's page
		// footprint scales.
		const zoom = editor.getZoomLevel()
		const size = PIN_SIZE / zoom

		const overlays: TLCommentPinOverlay[] = []
		for (const pin of display.pins) {
			const point = anchorPagePoint(editor, pin.anchor, display.impreciseShapeAnchor)
			if (!point) continue
			const inset = impreciseShapePinInset(pin.anchor, display.impreciseShapeAnchor)
			const x = point.x + ((inset?.x ?? 0) + (pin.screenOffset?.x ?? 0)) / zoom
			const y = point.y + ((inset?.y ?? 0) + (pin.screenOffset?.y ?? 0)) / zoom
			overlays.push({
				id: `comment_pin:${pin.threadId}`,
				type: 'comment_pin',
				props: {
					kind: 'pin',
					targetId: pin.threadId,
					x,
					y,
					color: pin.color,
					label: pin.label,
					resolved: pin.resolved,
					open: pin.threadId === openId,
					count: 1,
					// The marker spans up-right of its origin: bottom-left corner at the anchor.
					hit: { x, y: y - size, w: size, h: size },
				},
			})
		}
		for (const badge of display.badges) {
			const { x, y } = badge.point
			overlays.push({
				id: `comment_pin:badge:${badge.nodeId}`,
				type: 'comment_pin',
				props: {
					kind: 'badge',
					targetId: badge.nodeId,
					x,
					y,
					color: undefined,
					label: String(badge.count),
					resolved: false,
					open: false,
					count: badge.count,
					// Badges center on their point.
					hit: { x: x - size / 2, y: y - size / 2, w: size, h: size },
				},
			})
		}
		return overlays
	}

	override getGeometry(overlay: TLCommentPinOverlay): Geometry2d {
		const { hit, kind } = overlay.props
		if (kind === 'badge') {
			return new Circle2d({ x: hit.x, y: hit.y, radius: hit.w / 2, isFilled: true })
		}
		return new Rectangle2d({ x: hit.x, y: hit.y, width: hit.w, height: hit.h, isFilled: true })
	}

	override getCursor(overlay: TLCommentPinOverlay): TLCursorType {
		// Badges zoom on click; pins use the default cursor like hovering a shape.
		return overlay.props.kind === 'badge' ? 'pointer' : 'default'
	}

	override onPointerDown(overlay: TLCommentPinOverlay): boolean {
		const editor = this.editor
		const { kind, targetId } = overlay.props
		if (kind === 'badge') {
			clusterExpandRequest.set(editor, targetId)
		} else {
			// Toggle, matching the DOM marker's click: a second click on the open pin closes it.
			openThreadId.update(editor, (current) => (current === targetId ? null : targetId))
		}
		// The pin owns this press — don't let it fall through and select the shape underneath.
		return true
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLCommentPinOverlay[]): void {
		const editor = this.editor
		const zoom = editor.getZoomLevel()
		const scale = 1 / zoom
		const viewport = editor.getViewportPageBounds()
		const margin = CULL_MARGIN_PX / zoom
		const theme = getPinTheme(editor)
		const hoveredId = editor.overlays.getHoveredOverlayId()

		for (const overlay of overlays) {
			const { kind, x, y } = overlay.props
			if (
				x < viewport.minX - margin ||
				y < viewport.minY - margin ||
				x > viewport.maxX + margin ||
				y > viewport.maxY + margin
			) {
				continue
			}

			ctx.save()
			ctx.translate(x, y)
			ctx.scale(scale, scale)
			if (kind === 'badge') {
				this._renderBadge(ctx, overlay, theme)
			} else {
				this._renderPin(ctx, overlay, theme, hoveredId === overlay.id)
			}
			ctx.restore()
		}
	}

	/** The teardrop marker, drawn in screen px with its bottom-left corner at the origin. */
	private _renderPin(
		ctx: CanvasRenderingContext2D,
		overlay: TLCommentPinOverlay,
		theme: PinTheme,
		hovered: boolean
	) {
		const { color, label, resolved, open } = overlay.props
		const fill = resolved ? theme.resolvedFill : (color ?? theme.defaultFill)

		// Hover grows the marker about its center, like the DOM pin's scale(1.08).
		if (hovered) {
			ctx.translate(PIN_SIZE / 2, -PIN_SIZE / 2)
			ctx.scale(1.08, 1.08)
			ctx.translate(-PIN_SIZE / 2, PIN_SIZE / 2)
		}

		// The open ring: two filled teardrops behind the marker (tint outside, panel inside),
		// standing in for the DOM pin's two box-shadow rings.
		if (open) {
			fillTeardrop(ctx, OPEN_RING_OUTER, fill)
			fillTeardrop(ctx, OPEN_RING_INNER, theme.panel)
		}

		ctx.shadowColor = hovered && !open ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.25)'
		ctx.shadowBlur = hovered && !open ? 10 : 6
		ctx.shadowOffsetY = hovered && !open ? 3 : 2
		fillTeardrop(ctx, 0, fill)
		ctx.shadowColor = 'transparent'
		ctx.shadowBlur = 0
		ctx.shadowOffsetY = 0

		if (resolved) {
			// The resolved check, matching the DOM pin's inline SVG (a 15px glyph, centered).
			const s = 15 / 24
			ctx.save()
			ctx.translate((PIN_SIZE - 15) / 2, -PIN_SIZE + (PIN_SIZE - 15) / 2)
			ctx.scale(s, s)
			ctx.strokeStyle = theme.resolvedContent
			ctx.lineWidth = 2.5
			ctx.lineCap = 'round'
			ctx.lineJoin = 'round'
			ctx.beginPath()
			ctx.moveTo(4, 12.5)
			ctx.lineTo(9, 17.5)
			ctx.lineTo(20, 6.5)
			ctx.stroke()
			ctx.restore()
		} else {
			ctx.fillStyle = '#ffffff'
			ctx.font = `600 14px ${theme.fontFamily}`
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText(label, PIN_SIZE / 2, -PIN_SIZE / 2 + 1)
		}
	}

	/** The cluster count badge: a 34px circle in the theme's text color, centered on the origin. */
	private _renderBadge(
		ctx: CanvasRenderingContext2D,
		overlay: TLCommentPinOverlay,
		theme: PinTheme
	) {
		ctx.shadowColor = 'rgba(0,0,0,0.25)'
		ctx.shadowBlur = 6
		ctx.shadowOffsetY = 2
		ctx.fillStyle = theme.badgeFill
		ctx.beginPath()
		ctx.arc(0, 0, PIN_SIZE / 2, 0, Math.PI * 2)
		ctx.fill()
		ctx.shadowColor = 'transparent'
		ctx.shadowBlur = 0
		ctx.shadowOffsetY = 0

		ctx.fillStyle = theme.panel
		ctx.font = `700 13px ${theme.fontFamily}`
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillText(overlay.props.label, 0, 1)
	}

	override renderMinimap(
		ctx: CanvasRenderingContext2D,
		overlays: TLCommentPinOverlay[],
		zoom: number
	): void {
		const theme = getPinTheme(this.editor)
		const radius = 3 / zoom
		for (const overlay of overlays) {
			const { x, y, color, resolved, kind } = overlay.props
			ctx.beginPath()
			ctx.arc(x, y, radius, 0, Math.PI * 2)
			ctx.fillStyle =
				kind === 'badge'
					? theme.badgeFill
					: resolved
						? theme.resolvedFill
						: (color ?? theme.defaultFill)
			ctx.fill()
		}
	}
}

/** A teardrop path expanded by `grow` screen px on every side, spanning up-right of the origin. */
function fillTeardrop(ctx: CanvasRenderingContext2D, grow: number, fill: string) {
	ctx.fillStyle = fill
	ctx.beginPath()
	ctx.roundRect(
		-grow,
		-PIN_SIZE - grow,
		PIN_SIZE + grow * 2,
		PIN_SIZE + grow * 2,
		PIN_RADII.map((r) => (r > 3 ? r + grow : r))
	)
	ctx.fill()
}

interface PinTheme {
	defaultFill: string
	resolvedFill: string
	resolvedContent: string
	badgeFill: string
	panel: string
	fontFamily: string
}

/** Resolve the pin's colors from the live theme: CSS variables where they exist, and the resolved
 *  greys hardcoded per color mode, matching `comments.css`. */
function getPinTheme(editor: Editor): PinTheme {
	const style = editor.getContainerWindow().getComputedStyle(editor.getContainer())
	const dark = editor.user.getIsDarkMode()
	const font = style.getPropertyValue('--tl-font-sans').trim()
	return {
		defaultFill: style.getPropertyValue('--tl-color-selected').trim() || '#4465e9',
		resolvedFill: dark ? 'hsl(240, 5%, 30%)' : '#dfe0e1',
		resolvedContent: dark ? 'hsl(0, 0%, 72%)' : 'hsl(214, 8%, 42%)',
		badgeFill: style.getPropertyValue('--tl-color-text-1').trim() || (dark ? '#f2f2f2' : '#2d2d2d'),
		panel: style.getPropertyValue('--tl-color-panel').trim() || (dark ? '#212529' : '#ffffff'),
		fontFamily: font && !font.includes('var(') ? font : DEFAULT_FONT_FAMILY,
	}
}
