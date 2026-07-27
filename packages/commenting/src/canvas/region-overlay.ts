import {
	BoxModel,
	Geometry2d,
	OverlayUtil,
	Rectangle2d,
	TLCursorType,
	TLOverlay,
	TLPointerEventInfo,
} from 'tldraw'
import { getCommentRecord, putCommentRecords } from './comment-store'
import { getCommentingOptions } from './options'
import {
	commentPinDisplay,
	commentPinDrag,
	commentRegionEdit,
	getPinTheme,
	type CommentPinDisplayPin,
} from './pin-overlay'
import {
	REGION_CORNERS,
	REGION_EDGES,
	REGION_HANDLE_MARGIN_PX,
	resizeRegion,
	type RegionHandle,
} from './region-geometry'
import { commentsHidden, openThreadId, pendingComment, regionDraft } from './state'
import { regionAnchorPinCorner } from './thread-state'

/** The handle's screen size, matching the DOM handle (`.tlui-cmt-canvas-region-handle` is 9×9). */
const HANDLE_SIZE = 9
/** The handle's square hit target half-extent, in screen px — wider than the 9px visual. */
const HANDLE_HIT_HALF = 8
/** The box's border width and dash pattern, matching `border: 2px dashed`. */
const BORDER_WIDTH = 2
const BORDER_DASH = 6
const BORDER_RADIUS = 6

/** The overlay instances the region util produces — a body per revealed region, plus its
 * resize handles.
 * @public */
export interface TLCommentRegionOverlay extends TLOverlay {
	props: {
		kind: 'body' | 'handle'
		threadId: string
		/** The region's live page-space bounds this instance was generated against. */
		bounds: BoxModel
		/** The handle's normalized spot and cursor; undefined for the body. */
		handle: RegionHandle | undefined
		/** Page-space hit rect, baked at the zoom this instance was generated for. */
		hit: { x: number; y: number; w: number; h: number }
	}
}

/**
 * Draws region comment areas — the dashed box, its fill, and the resize handles — into the canvas
 * overlay layer, just under the comment pins (zIndex 1040 vs the pins' 1050), so a pin paints
 * above its own region's border instead of the border cutting across the marker.
 *
 * Interaction matches the DOM region: dragging the body translates the region (when `regionMove`
 * allows), dragging a handle resizes it (corners or edges per `regionResize`); both preview
 * through `commentRegionEdit` — which the pin overlay and the open popover also follow — and
 * commit to the thread record on release. Reveal follows the `regionReveal` option: while open or
 * editing, plus pointer-within-bounds ('pointer') or marker hover ('pin-hover').
 *
 * The comment tool's drag-out draft and a pending (composing) region draw here too, display-only.
 * @public
 */
export class CommentRegionOverlayUtil extends OverlayUtil<TLCommentRegionOverlay> {
	static override type = 'comment_region'
	override options = { zIndex: 1040 }

	override isActive(): boolean {
		const editor = this.editor
		if (commentsHidden.get(editor)) {
			// The draft/pending boxes belong to the comment tool's placement flow, which operates
			// with pins hidden too.
			return regionDraft.get(editor) !== null || this._pendingRegion() !== null
		}
		return (
			commentPinDisplay.get(editor).pins.some((pin) => pin.anchor.type === 'region') ||
			regionDraft.get(editor) !== null ||
			this._pendingRegion() !== null
		)
	}

	override getOverlays(): TLCommentRegionOverlay[] {
		const editor = this.editor
		if (commentsHidden.get(editor)) return []
		const display = commentPinDisplay.get(editor)
		const options = getCommentingOptions(editor)
		const zoom = editor.getZoomLevel()

		const overlays: TLCommentRegionOverlay[] = []
		for (const pin of display.pins) {
			if (pin.anchor.type !== 'region') continue
			const state = this._regionState(pin)
			if (!state.revealed) continue
			const { bounds, editing, pinDragging } = state

			// Handles come before the body: within a util, the first overlay whose geometry
			// contains the point wins the hit test.
			const showHandles =
				!pinDragging && display.canComment && options.regionResize !== 'none' && !editing
			// Mid-resize the handles keep drawing (the DOM kept them mounted), but only the one
			// being dragged matters — the session owns the gesture, so instances are display+hit
			// for *starting* an edit.
			if (showHandles || editing) {
				for (const handle of this._handlesFor(pin)) {
					const hx = bounds.x + handle.x * bounds.w
					const hy = bounds.y + handle.y * bounds.h
					const half = HANDLE_HIT_HALF / zoom
					overlays.push({
						id: `comment_region:${pin.threadId}:handle:${handle.x}-${handle.y}`,
						type: 'comment_region',
						props: {
							kind: 'handle',
							threadId: pin.threadId,
							bounds,
							handle,
							hit: { x: hx - half, y: hy - half, w: half * 2, h: half * 2 },
						},
					})
				}
			}

			const bodyMovable =
				display.canComment && options.regionMove !== 'pin' && !pinDragging && !editing
			overlays.push({
				id: `comment_region:${pin.threadId}:body`,
				type: 'comment_region',
				props: {
					kind: 'body',
					threadId: pin.threadId,
					bounds,
					handle: undefined,
					// A non-movable body is display-only: an empty hit rect keeps canvas clicks
					// passing through to shapes beneath, like the DOM box's pointer-events: none.
					hit: bodyMovable
						? { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h }
						: { x: bounds.x, y: bounds.y, w: 0, h: 0 },
				},
			})
		}
		return overlays
	}

	override getGeometry(overlay: TLCommentRegionOverlay): Geometry2d | null {
		const { hit } = overlay.props
		if (hit.w === 0 || hit.h === 0) return null
		return new Rectangle2d({ x: hit.x, y: hit.y, width: hit.w, height: hit.h, isFilled: true })
	}

	override getCursor(overlay: TLCommentRegionOverlay): TLCursorType {
		return overlay.props.kind === 'handle' ? overlay.props.handle!.cursor : 'move'
	}

	override onPointerDown(overlay: TLCommentRegionOverlay, info: TLPointerEventInfo): boolean {
		if (info.button !== 0) return false
		if (overlay.props.kind === 'handle') {
			this._startResizeSession(overlay.props.threadId, overlay.props.bounds, overlay.props.handle!)
		} else {
			this._startMoveSession(overlay.props.threadId, overlay.props.bounds, info)
		}
		return true
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLCommentRegionOverlay[]): void {
		const editor = this.editor
		const zoom = editor.getZoomLevel()
		const theme = getPinTheme(editor)

		// Region thread boxes — one per body instance (handles share its bounds).
		for (const overlay of overlays) {
			if (overlay.props.kind !== 'body') continue
			this._drawBox(ctx, overlay.props.bounds, zoom, theme.defaultFill)
		}
		for (const overlay of overlays) {
			if (overlay.props.kind !== 'handle') continue
			this._drawHandle(ctx, overlay.props, zoom, theme)
		}

		// The comment tool's drag-out draft and a pending (composing) region, display-only.
		const draft = regionDraft.get(editor)
		if (draft) this._drawBox(ctx, draft, zoom, theme.defaultFill)
		const pending = this._pendingRegion()
		if (pending) this._drawBox(ctx, pending, zoom, theme.defaultFill)
	}

	private _drawBox(ctx: CanvasRenderingContext2D, bounds: BoxModel, zoom: number, color: string) {
		ctx.save()
		ctx.beginPath()
		ctx.roundRect(bounds.x, bounds.y, bounds.w, bounds.h, BORDER_RADIUS / zoom)
		ctx.globalAlpha = 0.1
		ctx.fillStyle = color
		ctx.fill()
		ctx.globalAlpha = 1
		ctx.strokeStyle = color
		ctx.lineWidth = BORDER_WIDTH / zoom
		ctx.setLineDash([BORDER_DASH / zoom, BORDER_DASH / zoom])
		ctx.stroke()
		ctx.restore()
	}

	private _drawHandle(
		ctx: CanvasRenderingContext2D,
		props: TLCommentRegionOverlay['props'],
		zoom: number,
		theme: ReturnType<typeof getPinTheme>
	) {
		const { bounds, handle } = props
		const x = bounds.x + handle!.x * bounds.w
		const y = bounds.y + handle!.y * bounds.h
		const half = HANDLE_SIZE / 2 / zoom
		ctx.save()
		ctx.beginPath()
		ctx.roundRect(x - half, y - half, half * 2, half * 2, 2 / zoom)
		ctx.fillStyle = theme.panel
		ctx.fill()
		ctx.strokeStyle = theme.defaultFill
		ctx.lineWidth = 1.5 / zoom
		ctx.stroke()
		ctx.restore()
	}

	/** The live bounds and edit state for a region pin: an edit preview wins, then a pin-drag
	 *  translation (the pin corner tracks the cursor), then the stored anchor. */
	private _regionState(pin: CommentPinDisplayPin) {
		const editor = this.editor
		const anchor = pin.anchor as Extract<CommentPinDisplayPin['anchor'], { type: 'region' }>
		const edit = commentRegionEdit.get(editor)
		const drag = commentPinDrag.get(editor)
		const editing = edit !== null && edit.threadId === pin.threadId
		const pinDragging = drag !== null && drag.threadId === pin.threadId

		let bounds: BoxModel = anchor
		if (editing) {
			bounds = edit.bounds
		} else if (pinDragging) {
			const corner = regionAnchorPinCorner(editor, anchor)
			bounds = {
				...anchor,
				x: drag.pagePoint.x - corner.x * anchor.w,
				y: drag.pagePoint.y - corner.y * anchor.h,
			}
		}

		const revealed = editing || pinDragging || this._isRevealed(pin, bounds)
		return { bounds, editing, pinDragging, revealed }
	}

	/** The `regionReveal` modes: open always reveals; 'pointer' adds pointer-within-bounds (plus
	 *  the handle margin); 'pin-hover' adds the marker's canvas hover. */
	private _isRevealed(pin: CommentPinDisplayPin, bounds: BoxModel): boolean {
		const editor = this.editor
		if (openThreadId.get(editor) === pin.threadId) return true
		const reveal = getCommentingOptions(editor).regionReveal
		if (reveal === 'pointer') {
			const margin = REGION_HANDLE_MARGIN_PX / editor.getZoomLevel()
			const point = editor.inputs.getCurrentPagePoint()
			return (
				point.x >= bounds.x - margin &&
				point.x <= bounds.x + bounds.w + margin &&
				point.y >= bounds.y - margin &&
				point.y <= bounds.y + bounds.h + margin
			)
		}
		if (reveal === 'pin-hover') {
			return editor.overlays.getHoveredOverlayId() === `comment_pin:${pin.threadId}`
		}
		return false
	}

	private _handlesFor(pin: CommentPinDisplayPin): readonly RegionHandle[] {
		const editor = this.editor
		const anchor = pin.anchor as Extract<CommentPinDisplayPin['anchor'], { type: 'region' }>
		if (getCommentingOptions(editor).regionResize === 'edges') return REGION_EDGES
		// Corners, minus the pin's own corner — the pin marker sits there.
		const corner = regionAnchorPinCorner(editor, anchor)
		return REGION_CORNERS.filter((c) => c.x !== corner.x || c.y !== corner.y)
	}

	private _pendingRegion(): BoxModel | null {
		const pending = pendingComment.get(this.editor)
		return pending && pending.anchor.type === 'region' ? pending.anchor : null
	}

	/** Dragging the body translates the region by the cursor's page delta; previews through
	 *  `commentRegionEdit`, commits on release. A press that never moves is a no-op, like the DOM
	 *  body (clicks toggle nothing — that's the pin's job). */
	private _startMoveSession(threadId: string, startBounds: BoxModel, info: TLPointerEventInfo) {
		const editor = this.editor
		const grabPage = editor.screenToPage(info.point)
		this._runEditSession(threadId, (e) => {
			const cursor = editor.screenToPage({ x: e.clientX, y: e.clientY })
			return {
				...startBounds,
				x: startBounds.x + (cursor.x - grabPage.x),
				y: startBounds.y + (cursor.y - grabPage.y),
			}
		})
		editor.setCursor({ type: 'move', rotation: 0 })
	}

	/** Dragging a handle resizes from the captured start bounds, so the fixed edges can't drift
	 *  under the live preview. */
	private _startResizeSession(threadId: string, startBounds: BoxModel, handle: RegionHandle) {
		const editor = this.editor
		this._runEditSession(threadId, (e) =>
			resizeRegion(startBounds, handle, editor.screenToPage({ x: e.clientX, y: e.clientY }))
		)
		editor.setCursor({ type: handle.cursor, rotation: 0 })
	}

	private _runEditSession(threadId: string, boundsAt: (e: PointerEvent) => BoxModel) {
		const editor = this.editor
		const win = editor.getContainerWindow()
		let moved = false

		const cleanup = () => {
			win.removeEventListener('pointermove', onMove)
			win.removeEventListener('pointerup', onUp)
			win.removeEventListener('pointercancel', onCancel)
			commentRegionEdit.set(editor, null)
			editor.setCursor({ type: 'default', rotation: 0 })
		}
		const onMove = (e: PointerEvent) => {
			moved = true
			commentRegionEdit.set(editor, { threadId, bounds: boundsAt(e) })
		}
		const onUp = (e: PointerEvent) => {
			const bounds = moved ? boundsAt(e) : null
			cleanup()
			if (!bounds) return
			const record = getCommentRecord(editor, threadId)
			if (!record || record.typeName !== 'comment-thread') return
			if (record.anchor.type !== 'region') return
			editor.run(
				// Spread the existing anchor first so the region's pin corner survives the edit.
				() => putCommentRecords(editor, [{ ...record, anchor: { ...record.anchor, ...bounds } }]),
				{ history: 'ignore' }
			)
		}
		const onCancel = () => cleanup()

		win.addEventListener('pointermove', onMove)
		win.addEventListener('pointerup', onUp)
		win.addEventListener('pointercancel', onCancel)
	}
}
