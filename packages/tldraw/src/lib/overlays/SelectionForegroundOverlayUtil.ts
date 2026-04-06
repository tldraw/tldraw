import {
	Box,
	Circle2d,
	Edge2d,
	Geometry2d,
	HALF_PI,
	Mat,
	OverlayUtil,
	Polygon2d,
	RotateCorner,
	SelectionCorner,
	SelectionEdge,
	TLCursorType,
	TLOverlay,
	TLSelectionHandle,
	Vec,
} from '@tldraw/editor'

const SQUARE_ROOT_PI = Math.sqrt(Math.PI)

/** @public */
export interface TLSelectionForegroundOverlay extends TLOverlay {
	props: {
		overlayType: 'resize_handle' | 'rotate_handle' | 'mobile_rotate'
		handle: TLSelectionHandle | RotateCorner
	}
}

/**
 * Overlay util for selection foreground handles (resize corners/edges, rotate corners, mobile rotate).
 * Each interactive element of the selection foreground becomes its own overlay instance.
 *
 * @public
 */
export class SelectionForegroundOverlayUtil extends OverlayUtil<TLSelectionForegroundOverlay> {
	static override type = 'selection_foreground'

	override isActive(): boolean {
		if (!this.editor.getSelectionRotatedPageBounds()) return false

		// Active whenever the selection box or controls should be visible
		return this.editor.isInAny(
			'select.idle',
			'select.brushing',
			'select.scribble_brushing',
			'select.pointing_canvas',
			'select.pointing_selection',
			'select.pointing_shape',
			'select.pointing_resize_handle',
			'select.resizing',
			'select.crop.idle',
			'select.crop.pointing_crop',
			'select.crop.pointing_crop_handle'
		)
	}

	override getOverlays(): TLSelectionForegroundOverlay[] {
		const editor = this.editor
		const bounds = editor.getSelectionRotatedPageBounds()
		if (!bounds) return []

		const onlyShape = editor.getOnlySelectedShape()
		const isLockedShape = onlyShape && editor.isShapeOrAncestorLocked(onlyShape)
		if (isLockedShape) return []

		const isCoarsePointer = editor.getInstanceState().isCoarsePointer
		const zoom = editor.getEfficientZoomLevel()

		const expandOutlineBy = onlyShape
			? editor.getShapeUtil(onlyShape).expandSelectionOutlinePx(onlyShape)
			: 0

		const expandedBounds =
			expandOutlineBy instanceof Box
				? bounds.clone().expand(expandOutlineBy).zeroFix()
				: bounds.clone().expandBy(expandOutlineBy).zeroFix()

		const width = expandedBounds.width
		const height = expandedBounds.height
		const size = 8 / zoom
		const isTinyX = width < size * 2
		const isTinyY = height < size * 2
		const isSmallX = width < size * 4
		const isSmallY = height < size * 4

		const showCropHandles =
			editor.isInAny(
				'select.crop.idle',
				'select.crop.pointing_crop',
				'select.crop.pointing_crop_handle'
			) && !editor.getIsReadonly()

		const showResizeHandles =
			!showCropHandles &&
			(onlyShape
				? editor.getShapeUtil(onlyShape).canResize(onlyShape) &&
					!editor.getShapeUtil(onlyShape).hideResizeHandles(onlyShape)
				: true)

		const showCornerRotateHandles =
			!isCoarsePointer &&
			!(isTinyX || isTinyY) &&
			(onlyShape ? !editor.getShapeUtil(onlyShape).hideRotateHandle(onlyShape) : true)

		const showMobileRotateHandle =
			isCoarsePointer &&
			(!isSmallX || !isSmallY) &&
			(onlyShape ? !editor.getShapeUtil(onlyShape).hideRotateHandle(onlyShape) : true)

		const hideAlternateCornerHandles = isTinyX || isTinyY
		const showOnlyOneHandle = isTinyX && isTinyY

		const showHandles = showResizeHandles || showCropHandles

		const overlays: TLSelectionForegroundOverlay[] = []

		// Resize corner handles
		if (showHandles) {
			// top_left — always shown when handles are shown
			overlays.push(this._makeOverlay('resize_handle', 'top_left'))
			if (!hideAlternateCornerHandles) {
				overlays.push(this._makeOverlay('resize_handle', 'top_right'))
				overlays.push(this._makeOverlay('resize_handle', 'bottom_left'))
			}
			if (!showOnlyOneHandle || showCropHandles) {
				overlays.push(this._makeOverlay('resize_handle', 'bottom_right'))
			}
		}

		// Resize edge handles
		if (showHandles) {
			const hideVerticalEdgeTargets = showCropHandles
				? isSmallX || isSmallY
				: hideAlternateCornerHandles || showOnlyOneHandle || isCoarsePointer
			const isMobileAndTextShape = isCoarsePointer && onlyShape && onlyShape.type === 'text'
			const hideHorizontalEdgeTargets = showCropHandles
				? isSmallX || isSmallY
				: hideVerticalEdgeTargets && !isMobileAndTextShape

			if (!hideVerticalEdgeTargets) {
				overlays.push(this._makeOverlay('resize_handle', 'top'))
				overlays.push(this._makeOverlay('resize_handle', 'bottom'))
			}
			if (!hideHorizontalEdgeTargets) {
				overlays.push(this._makeOverlay('resize_handle', 'right'))
				overlays.push(this._makeOverlay('resize_handle', 'left'))
			}
		}

		// Rotate corner handles
		if (showCornerRotateHandles) {
			overlays.push(this._makeOverlay('rotate_handle', 'top_left_rotate'))
			overlays.push(this._makeOverlay('rotate_handle', 'top_right_rotate'))
			overlays.push(this._makeOverlay('rotate_handle', 'bottom_left_rotate'))
			overlays.push(this._makeOverlay('rotate_handle', 'bottom_right_rotate'))
		}

		// Mobile rotate handle
		if (showMobileRotateHandle) {
			overlays.push(this._makeOverlay('mobile_rotate', 'mobile_rotate'))
		}

		return overlays
	}

	override getGeometry(overlay: TLSelectionForegroundOverlay): Geometry2d | null {
		const editor = this.editor
		const bounds = editor.getSelectionRotatedPageBounds()
		if (!bounds) return null

		const onlyShape = editor.getOnlySelectedShape()
		const expandOutlineBy = onlyShape
			? editor.getShapeUtil(onlyShape).expandSelectionOutlinePx(onlyShape)
			: 0
		const expandedBounds =
			expandOutlineBy instanceof Box
				? bounds.clone().expand(expandOutlineBy).zeroFix()
				: bounds.clone().expandBy(expandOutlineBy).zeroFix()

		const rotation = editor.getSelectionRotation()
		const zoom = editor.getEfficientZoomLevel()
		const isCoarsePointer = editor.getInstanceState().isCoarsePointer

		const width = expandedBounds.width
		const height = expandedBounds.height

		const mobileHandleMultiplier = isCoarsePointer ? 1.75 : 1
		const targetSize = (6 / zoom) * mobileHandleMultiplier

		const isSmallX = width < (8 / zoom) * 4
		const isSmallY = height < (8 / zoom) * 4

		const targetSizeX = (isSmallX ? targetSize / 2 : targetSize) * (mobileHandleMultiplier * 0.75)
		const targetSizeY = (isSmallY ? targetSize / 2 : targetSize) * (mobileHandleMultiplier * 0.75)

		// Build the same transform used in render():
		// translate(bounds.x, bounds.y) → rotate(rotation) → translate(expandDx, expandDy)
		const expandDx = expandedBounds.x - bounds.x
		const expandDy = expandedBounds.y - bounds.y

		const transform = Mat.Compose(
			Mat.Translate(bounds.x, bounds.y),
			Mat.Rotate(rotation),
			Mat.Translate(expandDx, expandDy)
		)

		const { overlayType, handle } = overlay.props

		// Edge handles → line segments along the selection edge
		if (
			overlayType === 'resize_handle' &&
			(handle === 'top' || handle === 'bottom' || handle === 'left' || handle === 'right')
		) {
			const edge = this._getEdgeLocalPoints(handle as SelectionEdge, width, height)
			return new Edge2d({
				start: Mat.applyToPoint(transform, edge.start),
				end: Mat.applyToPoint(transform, edge.end),
			})
		}

		// Corner resize handles → filled polygon matching the corner point
		if (overlayType === 'resize_handle') {
			const cp = this._getCornerLocalPoint(handle as SelectionCorner, width, height)
			const s = Math.max(targetSizeX, targetSizeY) * 1.5
			return new Polygon2d({
				points: this._localRectToPoints(cp.x - s, cp.y - s, s * 2, s * 2).map((p) =>
					Mat.applyToPoint(transform, p)
				),
				isFilled: true,
			})
		}

		// Rotate handles → circle centered on the outside corner of the resize handle
		if (overlayType === 'rotate_handle') {
			const cornerSize = Math.max(targetSizeX, targetSizeY) * 1.5
			const center = this._getRotateHandleLocalCenter(
				handle as RotateCorner,
				width,
				height,
				cornerSize
			)
			const radius = (targetSize * 3) / 2
			return new Circle2d({
				x: center.x - radius,
				y: center.y - radius,
				radius,
				isFilled: true,
			}).transform(transform)
		}

		// Mobile rotate → filled polygon around the handle circle
		if (overlayType === 'mobile_rotate') {
			const bgRadius = Math.max(14 * (1 / zoom), 20 / Math.max(1, zoom))
			const cx = isSmallX ? -targetSize * 1.5 : width / 2
			const isMediaShape =
				onlyShape &&
				(editor.isShapeOfType(onlyShape, 'image') || editor.isShapeOfType(onlyShape, 'video'))
			const cy = isSmallX
				? height / 2
				: isMediaShape
					? height + targetSize * 1.5
					: -targetSize * 1.5
			return new Polygon2d({
				points: this._localRectToPoints(
					cx - bgRadius,
					cy - bgRadius,
					bgRadius * 2,
					bgRadius * 2
				).map((p) => Mat.applyToPoint(transform, p)),
				isFilled: true,
			})
		}

		return null
	}

	override render(ctx: CanvasRenderingContext2D, _overlays: TLSelectionForegroundOverlay[]): void {
		const editor = this.editor
		const bounds = editor.getSelectionRotatedPageBounds()
		if (!bounds) return

		const onlyShape = editor.getOnlySelectedShape()
		if (onlyShape && editor.isShapeHidden(onlyShape)) return

		const expandOutlineBy = onlyShape
			? editor.getShapeUtil(onlyShape).expandSelectionOutlinePx(onlyShape)
			: 0
		const expandedBounds =
			expandOutlineBy instanceof Box
				? bounds.clone().expand(expandOutlineBy).zeroFix()
				: bounds.clone().expandBy(expandOutlineBy).zeroFix()

		const rotation = editor.getSelectionRotation()
		const zoom = editor.getEfficientZoomLevel()
		const isCoarsePointer = editor.getInstanceState().isCoarsePointer
		const isChangingStyle = editor.getInstanceState().isChangingStyle
		const isLockedShape = onlyShape && editor.isShapeOrAncestorLocked(onlyShape)

		const width = expandedBounds.width
		const height = expandedBounds.height
		const size = 8 / zoom

		const isTinyX = width < size * 2
		const isTinyY = height < size * 2

		const showSelectionBounds =
			(onlyShape ? !editor.getShapeUtil(onlyShape).hideSelectionBoundsFg(onlyShape) : true) &&
			!isChangingStyle

		const shouldDisplayBox =
			showSelectionBounds &&
			editor.isInAny(
				'select.idle',
				'select.brushing',
				'select.scribble_brushing',
				'select.pointing_canvas',
				'select.pointing_selection',
				'select.pointing_shape',
				'select.crop.idle',
				'select.crop.pointing_crop',
				'select.crop.pointing_crop_handle',
				'select.pointing_resize_handle'
			)

		const shouldDisplayControls =
			editor.isInAny(
				'select.idle',
				'select.pointing_selection',
				'select.pointing_shape',
				'select.crop.idle'
			) &&
			!isChangingStyle &&
			!editor.getIsReadonly()

		const showResizeHandles =
			shouldDisplayControls &&
			!isLockedShape &&
			(onlyShape
				? editor.getShapeUtil(onlyShape).canResize(onlyShape) &&
					!editor.getShapeUtil(onlyShape).hideResizeHandles(onlyShape)
				: true)

		const showCropHandles =
			editor.isInAny(
				'select.crop.idle',
				'select.crop.pointing_crop',
				'select.crop.pointing_crop_handle'
			) && !editor.getIsReadonly()

		const hideAlternateCornerHandles = isTinyX || isTinyY
		const showOnlyOneHandle = isTinyX && isTinyY

		const showMobileRotateHandle =
			isCoarsePointer &&
			shouldDisplayControls &&
			!isLockedShape &&
			(onlyShape ? !editor.getShapeUtil(onlyShape).hideRotateHandle(onlyShape) : true)

		const themeColors = editor.getCurrentTheme().colors[editor.getColorMode()]
		const strokeColor = themeColors.selectionStroke
		const bgColor = themeColors.background

		// Transform to local selection space
		const expandDx = expandedBounds.x - bounds.x
		const expandDy = expandedBounds.y - bounds.y

		ctx.save()
		ctx.translate(bounds.x, bounds.y)
		ctx.rotate(rotation)
		ctx.translate(expandDx, expandDy)

		// Selection outline
		if (shouldDisplayBox) {
			ctx.strokeStyle = strokeColor
			ctx.lineWidth = 1.5 / zoom
			ctx.strokeRect(0, 0, width, height)
		}

		// Corner resize handle squares (visual only)
		if (showResizeHandles && !showCropHandles) {
			ctx.fillStyle = bgColor
			ctx.strokeStyle = strokeColor
			ctx.lineWidth = 1.5 / zoom

			const drawCorner = (x: number, y: number, hidden: boolean) => {
				if (hidden) return
				ctx.fillRect(x - size / 2, y - size / 2, size, size)
				ctx.strokeRect(x - size / 2, y - size / 2, size, size)
			}

			drawCorner(0, 0, false) // top-left always shown
			drawCorner(width, 0, hideAlternateCornerHandles) // top-right
			drawCorner(width, height, showOnlyOneHandle) // bottom-right
			drawCorner(0, height, hideAlternateCornerHandles) // bottom-left
		}

		// Crop handles
		if (showCropHandles) {
			const cropStrokeWidth = size / 3
			const offset = cropStrokeWidth / 2
			const hideAlternate = isTinyX || isTinyY

			ctx.beginPath()
			ctx.strokeStyle = strokeColor
			ctx.lineWidth = cropStrokeWidth
			ctx.lineCap = 'butt'
			ctx.lineJoin = 'miter'

			// top_left corner (always shown)
			ctx.moveTo(-offset, size)
			ctx.lineTo(-offset, -offset)
			ctx.lineTo(size, -offset)

			// bottom_right corner (always shown)
			ctx.moveTo(width + offset, height - size)
			ctx.lineTo(width + offset, height + offset)
			ctx.lineTo(width - size, height + offset)

			if (!hideAlternate) {
				// top_right corner
				ctx.moveTo(width - size, -offset)
				ctx.lineTo(width + offset, -offset)
				ctx.lineTo(width + offset, size)

				// bottom_left corner
				ctx.moveTo(size, height + offset)
				ctx.lineTo(-offset, height + offset)
				ctx.lineTo(-offset, height - size)

				// Edge handles
				// top
				ctx.moveTo(width / 2 - size, -offset)
				ctx.lineTo(width / 2 + size, -offset)

				// right
				ctx.moveTo(width + offset, height / 2 - size)
				ctx.lineTo(width + offset, height / 2 + size)

				// bottom
				ctx.moveTo(width / 2 - size, height + offset)
				ctx.lineTo(width / 2 + size, height + offset)

				// left
				ctx.moveTo(-offset, height / 2 - size)
				ctx.lineTo(-offset, height / 2 + size)
			}
			ctx.stroke()
		}

		// Mobile rotate handle
		if (showMobileRotateHandle) {
			const isSmallX = width < size * 4
			// const isSmallY = height < size * 4 // ?
			const mobileHandleMultiplier = 1.75
			const targetSize = (6 / zoom) * mobileHandleMultiplier

			const isMediaShape =
				onlyShape &&
				(editor.isShapeOfType(onlyShape, 'image') || editor.isShapeOfType(onlyShape, 'video'))
			const selectionRotation = editor.getSelectionRotation()
			const isShapeTooCloseToContextualToolbar =
				selectionRotation / HALF_PI > 1.6 && selectionRotation / HALF_PI < 2.4

			const cx = isSmallX ? -targetSize * 1.5 : width / 2
			const cy = isSmallX
				? height / 2
				: isMediaShape && !isShapeTooCloseToContextualToolbar
					? height + targetSize * 1.5
					: -targetSize * 1.5

			const fgRadius = size / SQUARE_ROOT_PI

			// Foreground circle
			ctx.fillStyle = bgColor
			ctx.strokeStyle = strokeColor
			ctx.lineWidth = 1.5 / zoom
			ctx.beginPath()
			ctx.arc(cx, cy, fgRadius, 0, Math.PI * 2)
			ctx.fill()
			ctx.stroke()
		}

		// Text resize handles
		if (shouldDisplayControls && isCoarsePointer && onlyShape && onlyShape.type === 'text') {
			const isSmallY = height < size * 4
			const mobileHandleMultiplier = 1.75
			const targetSize = (6 / zoom) * mobileHandleMultiplier
			const targetSizeY = (isSmallY ? targetSize / 2 : targetSize) * (mobileHandleMultiplier * 0.75)
			const textHandleHeight = Math.min(24 / zoom, height - targetSizeY * 3)
			if (textHandleHeight * zoom >= 4) {
				ctx.fillStyle = strokeColor
				const hw = size / 2
				const r = size / 4
				// Left handle
				this._roundRect(ctx, 0 - hw / 2, height / 2 - textHandleHeight / 2, hw, textHandleHeight, r)
				ctx.fill()
				// Right handle
				this._roundRect(
					ctx,
					width - hw / 2,
					height / 2 - textHandleHeight / 2,
					hw,
					textHandleHeight,
					r
				)
				ctx.fill()
			}
		}

		ctx.restore()
	}

	override getCursor(overlay: TLSelectionForegroundOverlay): TLCursorType | undefined {
		const { overlayType, handle } = overlay.props

		if (overlayType === 'rotate_handle') {
			const cursorMap: Record<string, TLCursorType> = {
				top_left_rotate: 'nwse-rotate',
				top_right_rotate: 'nesw-rotate',
				bottom_left_rotate: 'swne-rotate',
				bottom_right_rotate: 'senw-rotate',
			}
			return cursorMap[handle]
		}

		if (overlayType === 'mobile_rotate') {
			return 'grab'
		}

		if (overlayType === 'resize_handle') {
			const cursorMap: Record<string, TLCursorType> = {
				top_left: 'nwse-resize',
				top_right: 'nesw-resize',
				bottom_right: 'nwse-resize',
				bottom_left: 'nesw-resize',
				top: 'ns-resize',
				bottom: 'ns-resize',
				left: 'ew-resize',
				right: 'ew-resize',
			}
			return cursorMap[handle]
		}

		return undefined
	}

	// --- Private helpers ---

	private _makeOverlay(
		overlayType: TLSelectionForegroundOverlay['props']['overlayType'],
		handle: TLSelectionHandle | RotateCorner
	): TLSelectionForegroundOverlay {
		return {
			id: `selection_fg:${handle}`,
			type: 'selection_foreground',
			props: { overlayType, handle },
		}
	}

	private _getEdgeLocalPoints(
		edge: SelectionEdge,
		width: number,
		height: number
	): { start: Vec; end: Vec } {
		switch (edge) {
			case 'top':
				return { start: new Vec(0, 0), end: new Vec(width, 0) }
			case 'right':
				return { start: new Vec(width, 0), end: new Vec(width, height) }
			case 'bottom':
				return { start: new Vec(0, height), end: new Vec(width, height) }
			case 'left':
				return { start: new Vec(0, 0), end: new Vec(0, height) }
		}
	}

	private _getRotateHandleLocalCenter(
		corner: RotateCorner,
		width: number,
		height: number,
		cornerSize: number
	): Vec {
		// Centered on the outside corner of the resize handle square
		// (the corner furthest from the selection interior)
		switch (corner) {
			case 'top_left_rotate':
				return new Vec(-cornerSize, -cornerSize)
			case 'top_right_rotate':
				return new Vec(width + cornerSize, -cornerSize)
			case 'bottom_left_rotate':
				return new Vec(-cornerSize, height + cornerSize)
			case 'bottom_right_rotate':
				return new Vec(width + cornerSize, height + cornerSize)
			default:
				return new Vec(0, 0)
		}
	}

	private _getCornerLocalPoint(corner: SelectionCorner, width: number, height: number): Vec {
		switch (corner) {
			case 'top_left':
				return new Vec(0, 0)
			case 'top_right':
				return new Vec(width, 0)
			case 'bottom_right':
				return new Vec(width, height)
			case 'bottom_left':
				return new Vec(0, height)
		}
	}

	private _localRectToPoints(x: number, y: number, w: number, h: number): Vec[] {
		return [new Vec(x, y), new Vec(x + w, y), new Vec(x + w, y + h), new Vec(x, y + h)]
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
