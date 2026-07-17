import {
	Box,
	Geometry2d,
	HALF_PI,
	Mat,
	OverlayUtil,
	Polygon2d,
	Rectangle2d,
	RotateCorner,
	SelectionCorner,
	SelectionEdge,
	TLCursorType,
	TLOverlay,
	TLSelectionHandle,
	TLShape,
	Vec,
} from '@tldraw/editor'

const SQUARE_ROOT_PI = Math.sqrt(Math.PI)

const ROTATE_CURSORS: Partial<Record<RotateCorner, TLCursorType>> = {
	top_left_rotate: 'nwse-rotate',
	top_right_rotate: 'nesw-rotate',
	bottom_left_rotate: 'swne-rotate',
	bottom_right_rotate: 'senw-rotate',
}

const RESIZE_CURSORS: Partial<Record<TLSelectionHandle, TLCursorType>> = {
	top_left: 'nwse-resize',
	top_right: 'nesw-resize',
	bottom_right: 'nwse-resize',
	bottom_left: 'nesw-resize',
	top: 'ns-resize',
	bottom: 'ns-resize',
	left: 'ew-resize',
	right: 'ew-resize',
}

/** @public */
export interface TLSelectionForegroundOverlay extends TLOverlay {
	props: {
		overlayType: 'resize_handle' | 'rotate_handle' | 'mobile_rotate'
		handle: TLSelectionHandle | RotateCorner
	}
}

interface SelectionState {
	bounds: Box
	onlyShape: TLShape | null
	isCoarsePointer: boolean
	zoom: number
	rotation: number
	width: number
	height: number
	/** Visual side length of the rendered resize-handle squares. */
	handleSize: number
	/** Base half-extent of the interactive hit target for handles. */
	hitTargetSize: number
	/** Hit target half-extent along the x axis (narrower for small selections). */
	hitTargetSizeX: number
	/** Hit target half-extent along the y axis (narrower for small selections). */
	hitTargetSizeY: number
	/** Offset from the unexpanded bounds to the expanded selection outline. */
	expandOffsetX: number
	expandOffsetY: number
	isSmallX: boolean
	shouldDisplayControls: boolean
	shouldDisplayBox: boolean
	showCropHandles: boolean
	showResizeHandles: boolean
	showCornerRotateHandles: boolean
	showMobileRotateHandle: boolean
	showHandles: boolean
	hideAlternateCornerHandles: boolean
	hideAlternateCropHandles: boolean
	showOnlyOneHandle: boolean
}

interface SelectionForegroundColors {
	strokeColor: string
	bgColor: string
}

/**
 * Overlay util for selection foreground handles (resize corners/edges, rotate corners, mobile rotate).
 * Each interactive element of the selection foreground becomes its own overlay instance.
 *
 * @public
 */
export class SelectionForegroundOverlayUtil extends OverlayUtil<TLSelectionForegroundOverlay> {
	static override type = 'selection_foreground'
	override options = { zIndex: 100, lineWidth: 1.5 }

	override isActive(): boolean {
		if (!this.editor.getSelectionRotatedPageBounds()) return false

		return this.editor.isInAny(
			'select.idle',
			'select.brushing',
			'select.scribble_brushing',
			'select.pointing_canvas',
			'select.pointing_selection',
			'select.pointing_shape',
			'select.pointing_resize_handle',
			'select.pointing_rotate_handle',
			'select.resizing',
			'select.crop.idle',
			'select.crop.pointing_crop',
			'select.crop.pointing_crop_handle'
		)
	}

	override getOverlays(): TLSelectionForegroundOverlay[] {
		const state = this._computeSelectionState()
		if (!state) return []

		const overlays: TLSelectionForegroundOverlay[] = []
		this._collectResizeCornerOverlays(state, overlays)
		this._collectResizeEdgeOverlays(state, overlays)
		this._collectRotateOverlays(state, overlays)
		return overlays
	}

	override getGeometry(overlay: TLSelectionForegroundOverlay): Geometry2d | null {
		const state = this._computeSelectionState()
		if (!state) return null

		const transform = Mat.Compose(
			Mat.Translate(state.bounds.x, state.bounds.y),
			Mat.Rotate(state.rotation),
			Mat.Translate(state.expandOffsetX, state.expandOffsetY)
		)

		const { overlayType, handle } = overlay.props

		switch (overlayType) {
			case 'resize_handle':
				return this._getResizeHandleGeometry(handle as TLSelectionHandle, state, transform)
			case 'rotate_handle':
				return this._getRotateHandleGeometry(handle as RotateCorner, state, transform)
			case 'mobile_rotate':
				return this._getMobileRotateGeometry(state, transform)
			default:
				return null
		}
	}

	override render(ctx: CanvasRenderingContext2D, _overlays: TLSelectionForegroundOverlay[]): void {
		const state = this._computeSelectionState()
		if (!state) return

		// Transform to local selection space; each render helper assumes this is active.
		ctx.save()
		ctx.translate(state.bounds.x, state.bounds.y)
		ctx.rotate(state.rotation)
		ctx.translate(state.expandOffsetX, state.expandOffsetY)

		const colors = this._getThemeColors()
		this._renderSelectionBox(ctx, state, colors)
		this._renderResizeCorners(ctx, state, colors)
		this._renderCropHandles(ctx, state, colors)
		this._renderMobileRotateHandle(ctx, state, colors)
		this._renderTextResizeHandles(ctx, state, colors)

		ctx.restore()
	}

	override getCursor(overlay: TLSelectionForegroundOverlay): TLCursorType | undefined {
		const { overlayType, handle } = overlay.props
		switch (overlayType) {
			case 'rotate_handle':
				return ROTATE_CURSORS[handle as RotateCorner]
			case 'mobile_rotate':
				return 'grab'
			case 'resize_handle':
				return RESIZE_CURSORS[handle as TLSelectionHandle]
			default:
				return undefined
		}
	}

	// --- Overlay collection ---

	private _collectResizeCornerOverlays(
		state: SelectionState,
		overlays: TLSelectionForegroundOverlay[]
	) {
		if (!state.showHandles) return

		overlays.push(this._makeOverlay('resize_handle', 'top_left'))
		if (!state.hideAlternateCornerHandles) {
			overlays.push(this._makeOverlay('resize_handle', 'top_right'))
			overlays.push(this._makeOverlay('resize_handle', 'bottom_left'))
		}
		if (!state.showOnlyOneHandle || state.showCropHandles) {
			overlays.push(this._makeOverlay('resize_handle', 'bottom_right'))
		}
	}

	private _collectResizeEdgeOverlays(
		state: SelectionState,
		overlays: TLSelectionForegroundOverlay[]
	) {
		if (!state.showHandles) return

		const {
			showCropHandles,
			hideAlternateCropHandles,
			hideAlternateCornerHandles,
			showOnlyOneHandle,
			isCoarsePointer,
			onlyShape,
		} = state

		const hideVerticalEdgeTargets = showCropHandles
			? hideAlternateCropHandles
			: hideAlternateCornerHandles || showOnlyOneHandle || isCoarsePointer
		const isMobileAndTextShape = isCoarsePointer && !!onlyShape && onlyShape.type === 'text'
		const hideHorizontalEdgeTargets = showCropHandles
			? hideAlternateCropHandles
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

	private _collectRotateOverlays(state: SelectionState, overlays: TLSelectionForegroundOverlay[]) {
		if (state.showCornerRotateHandles) {
			overlays.push(this._makeOverlay('rotate_handle', 'top_left_rotate'))
			overlays.push(this._makeOverlay('rotate_handle', 'top_right_rotate'))
			overlays.push(this._makeOverlay('rotate_handle', 'bottom_left_rotate'))
			overlays.push(this._makeOverlay('rotate_handle', 'bottom_right_rotate'))
		}
		if (state.showMobileRotateHandle) {
			overlays.push(this._makeOverlay('mobile_rotate', 'mobile_rotate'))
		}
	}

	// --- Geometry builders ---

	private _getResizeHandleGeometry(
		handle: TLSelectionHandle,
		state: SelectionState,
		transform: Mat
	): Geometry2d {
		if (handle === 'top' || handle === 'bottom' || handle === 'left' || handle === 'right') {
			const rect = this._getEdgeLocalRect(handle, state)
			return new Polygon2d({
				points: this._localRectToPoints(rect.x, rect.y, rect.w, rect.h).map((p) =>
					Mat.applyToPoint(transform, p)
				),
				isFilled: true,
			})
		}

		const cornerPoint = this._getCornerLocalPoint(
			handle as SelectionCorner,
			state.width,
			state.height
		)
		const cornerHitHalfSize = Math.max(state.hitTargetSizeX, state.hitTargetSizeY) * 1.5
		return new Polygon2d({
			points: this._localRectToPoints(
				cornerPoint.x - cornerHitHalfSize,
				cornerPoint.y - cornerHitHalfSize,
				cornerHitHalfSize * 2,
				cornerHitHalfSize * 2
			).map((p) => Mat.applyToPoint(transform, p)),
			isFilled: true,
		})
	}

	private _getRotateHandleGeometry(
		handle: RotateCorner,
		state: SelectionState,
		transform: Mat
	): Geometry2d {
		const cornerSize = Math.max(state.hitTargetSizeX, state.hitTargetSizeY) * 1.62
		const center = this._getRotateHandleLocalCenter(handle, state.width, state.height, cornerSize)
		const radius = cornerSize
		return new Rectangle2d({
			x: center.x - radius,
			y: center.y - radius,
			width: radius * 2,
			height: radius * 2,
			isFilled: true,
		}).transform(transform)
	}

	private _getMobileRotateGeometry(state: SelectionState, transform: Mat): Geometry2d {
		const bgRadius = Math.max(14 * (1 / state.zoom), 20 / Math.max(1, state.zoom))
		const { cx, cy } = this._getMobileRotateCenter(state)
		return new Polygon2d({
			points: this._localRectToPoints(cx - bgRadius, cy - bgRadius, bgRadius * 2, bgRadius * 2).map(
				(p) => Mat.applyToPoint(transform, p)
			),
			isFilled: true,
		})
	}

	// --- Rendering (all helpers assume ctx is in local selection space) ---

	private _renderSelectionBox(
		ctx: CanvasRenderingContext2D,
		state: SelectionState,
		colors: SelectionForegroundColors
	) {
		if (!state.shouldDisplayBox) return
		ctx.strokeStyle = colors.strokeColor
		ctx.lineWidth = this.options.lineWidth / state.zoom
		ctx.strokeRect(0, 0, state.width, state.height)
	}

	private _renderResizeCorners(
		ctx: CanvasRenderingContext2D,
		state: SelectionState,
		colors: SelectionForegroundColors
	) {
		if (!state.showResizeHandles) return

		const { handleSize, width, height, hideAlternateCornerHandles, showOnlyOneHandle, zoom } = state

		ctx.fillStyle = colors.bgColor
		ctx.strokeStyle = colors.strokeColor
		ctx.lineWidth = this.options.lineWidth / zoom

		const drawCorner = (x: number, y: number, hidden: boolean) => {
			if (hidden) return
			ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize)
			ctx.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize)
		}

		drawCorner(0, 0, false) // top-left always shown
		drawCorner(width, 0, hideAlternateCornerHandles) // top-right
		drawCorner(width, height, showOnlyOneHandle) // bottom-right
		drawCorner(0, height, hideAlternateCornerHandles) // bottom-left
	}

	private _renderCropHandles(
		ctx: CanvasRenderingContext2D,
		state: SelectionState,
		colors: SelectionForegroundColors
	) {
		if (!state.showCropHandles) return

		const { handleSize, width, height, hideAlternateCropHandles } = state
		const cropStrokeWidth = handleSize / 3
		const offset = cropStrokeWidth / 2

		ctx.beginPath()
		ctx.strokeStyle = colors.strokeColor
		ctx.lineWidth = cropStrokeWidth
		ctx.lineCap = 'butt'
		ctx.lineJoin = 'miter'

		// top_left corner (always shown)
		ctx.moveTo(-offset, handleSize)
		ctx.lineTo(-offset, -offset)
		ctx.lineTo(handleSize, -offset)

		// bottom_right corner (always shown)
		ctx.moveTo(width + offset, height - handleSize)
		ctx.lineTo(width + offset, height + offset)
		ctx.lineTo(width - handleSize, height + offset)

		if (!hideAlternateCropHandles) {
			// top_right corner
			ctx.moveTo(width - handleSize, -offset)
			ctx.lineTo(width + offset, -offset)
			ctx.lineTo(width + offset, handleSize)

			// bottom_left corner
			ctx.moveTo(handleSize, height + offset)
			ctx.lineTo(-offset, height + offset)
			ctx.lineTo(-offset, height - handleSize)

			// top edge
			ctx.moveTo(width / 2 - handleSize, -offset)
			ctx.lineTo(width / 2 + handleSize, -offset)

			// right edge
			ctx.moveTo(width + offset, height / 2 - handleSize)
			ctx.lineTo(width + offset, height / 2 + handleSize)

			// bottom edge
			ctx.moveTo(width / 2 - handleSize, height + offset)
			ctx.lineTo(width / 2 + handleSize, height + offset)

			// left edge
			ctx.moveTo(-offset, height / 2 - handleSize)
			ctx.lineTo(-offset, height / 2 + handleSize)
		}

		ctx.stroke()
	}

	private _renderMobileRotateHandle(
		ctx: CanvasRenderingContext2D,
		state: SelectionState,
		colors: SelectionForegroundColors
	) {
		if (!state.showMobileRotateHandle) return

		const { cx, cy } = this._getMobileRotateCenter(state)
		const fgRadius = state.handleSize / SQUARE_ROOT_PI

		ctx.fillStyle = colors.bgColor
		ctx.strokeStyle = colors.strokeColor
		ctx.lineWidth = this.options.lineWidth / state.zoom
		ctx.beginPath()
		ctx.arc(cx, cy, fgRadius, 0, Math.PI * 2)
		ctx.fill()
		ctx.stroke()
	}

	private _renderTextResizeHandles(
		ctx: CanvasRenderingContext2D,
		state: SelectionState,
		colors: SelectionForegroundColors
	) {
		const {
			shouldDisplayControls,
			isCoarsePointer,
			onlyShape,
			zoom,
			width,
			height,
			handleSize,
			hitTargetSizeY,
		} = state
		if (!shouldDisplayControls || !isCoarsePointer || !onlyShape || onlyShape.type !== 'text') {
			return
		}

		const textHandleHeight = Math.min(24 / zoom, height - hitTargetSizeY * 3)
		if (textHandleHeight * zoom < 4) return

		const hw = handleSize / 2
		const r = handleSize / 4

		ctx.fillStyle = colors.strokeColor
		ctx.beginPath()
		ctx.roundRect(0 - hw / 2, height / 2 - textHandleHeight / 2, hw, textHandleHeight, r)
		ctx.fill()
		ctx.beginPath()
		ctx.roundRect(width - hw / 2, height / 2 - textHandleHeight / 2, hw, textHandleHeight, r)
		ctx.fill()
	}

	// --- Shared helpers ---

	/**
	 * Single source of truth for the derived state the selection foreground needs.
	 * Called from `getOverlays()`, `getGeometry()`, and `render()` so their visibility
	 * predicates can't drift. Returns `null` when no selection UI should appear at all
	 * (nothing selected, or the only selected shape is hidden).
	 */
	private _computeSelectionState(): SelectionState | null {
		const editor = this.editor
		const bounds = editor.getSelectionRotatedPageBounds()
		if (!bounds) return null

		const onlyShape = editor.getOnlySelectedShape()
		if (onlyShape && editor.isShapeHidden(onlyShape)) return null

		const onlyShapeUtil = onlyShape ? editor.getShapeUtil(onlyShape) : null
		const isLockedShape = !!(onlyShape && editor.isShapeOrAncestorLocked(onlyShape))

		const expandOutlineBy =
			onlyShape && onlyShapeUtil ? onlyShapeUtil.expandSelectionOutlinePx(onlyShape) : 0
		const expandedBounds =
			expandOutlineBy instanceof Box
				? bounds.clone().expand(expandOutlineBy).zeroFix()
				: bounds.clone().expandBy(expandOutlineBy).zeroFix()

		const instanceState = editor.getInstanceState()
		const isCoarsePointer = instanceState.isCoarsePointer
		const isChangingStyle = instanceState.isChangingStyle
		const isReadonly = editor.getIsReadonly()
		const zoom = editor.getZoomLevel()
		const rotation = editor.getSelectionRotation()

		const width = expandedBounds.width
		const height = expandedBounds.height
		const handleSize = 8 / zoom
		const isTinyX = width < handleSize * 2
		const isTinyY = height < handleSize * 2
		const isSmallX = width < handleSize * 4
		const isSmallY = height < handleSize * 4
		const isSmallCropX = width < handleSize * 5
		const isSmallCropY = height < handleSize * 5

		const mobileHandleMultiplier = isCoarsePointer ? 1.75 : 1
		const hitTargetSize = (6 / zoom) * mobileHandleMultiplier
		const hitTargetSizeX =
			(isSmallX ? hitTargetSize / 2 : hitTargetSize) * (mobileHandleMultiplier * 0.75)
		const hitTargetSizeY =
			(isSmallY ? hitTargetSize / 2 : hitTargetSize) * (mobileHandleMultiplier * 0.75)

		const expandOffsetX = expandedBounds.x - bounds.x
		const expandOffsetY = expandedBounds.y - bounds.y

		const shouldDisplayControls =
			editor.isInAny(
				'select.idle',
				'select.pointing_selection',
				'select.pointing_shape',
				'select.pointing_resize_handle',
				'select.pointing_rotate_handle',
				'select.crop.idle'
			) &&
			!isChangingStyle &&
			!isReadonly

		const showCropHandles =
			editor.isInAny(
				'select.crop.idle',
				'select.crop.pointing_crop',
				'select.crop.pointing_crop_handle'
			) && !isReadonly

		const canOnlyShapeResize =
			onlyShape && onlyShapeUtil
				? onlyShapeUtil.canResize(onlyShape) && !onlyShapeUtil.hideResizeHandles(onlyShape)
				: true
		const hideOnlyShapeRotateHandle =
			onlyShape && onlyShapeUtil ? onlyShapeUtil.hideRotateHandle(onlyShape) : false
		const hideOnlyShapeSelectionBounds =
			onlyShape && onlyShapeUtil ? onlyShapeUtil.hideSelectionBoundsFg(onlyShape) : false

		const showResizeHandles =
			shouldDisplayControls && !isLockedShape && !showCropHandles && canOnlyShapeResize

		const showCornerRotateHandles =
			shouldDisplayControls &&
			!isLockedShape &&
			!isCoarsePointer &&
			!(isTinyX || isTinyY) &&
			!hideOnlyShapeRotateHandle

		const showMobileRotateHandle =
			shouldDisplayControls &&
			!isLockedShape &&
			isCoarsePointer &&
			(!isSmallX || !isSmallY) &&
			!hideOnlyShapeRotateHandle

		const hideAlternateCornerHandles = isTinyX || isTinyY
		const hideAlternateCropHandles = isSmallCropX || isSmallCropY
		const showOnlyOneHandle = isTinyX && isTinyY
		const showHandles = showResizeHandles || showCropHandles

		const showSelectionBounds = !hideOnlyShapeSelectionBounds && !isChangingStyle

		const shouldDisplayBox =
			(showSelectionBounds &&
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
					'select.pointing_resize_handle',
					'select.pointing_rotate_handle'
				)) ||
			(showSelectionBounds &&
				editor.isIn('select.resizing') &&
				!!(onlyShape && editor.isShapeOfType(onlyShape, 'text')))

		return {
			bounds,
			onlyShape,
			isCoarsePointer,
			zoom,
			rotation,
			width,
			height,
			handleSize,
			hitTargetSize,
			hitTargetSizeX,
			hitTargetSizeY,
			expandOffsetX,
			expandOffsetY,
			isSmallX,
			shouldDisplayControls,
			shouldDisplayBox,
			showCropHandles,
			showResizeHandles,
			showCornerRotateHandles,
			showMobileRotateHandle,
			showHandles,
			hideAlternateCornerHandles,
			hideAlternateCropHandles,
			showOnlyOneHandle,
		}
	}

	private _getMobileRotateCenter(state: SelectionState): { cx: number; cy: number } {
		const { width, height, hitTargetSize, isSmallX, onlyShape, rotation } = state
		const editor = this.editor
		const isMediaShape =
			!!onlyShape &&
			(editor.isShapeOfType(onlyShape, 'image') || editor.isShapeOfType(onlyShape, 'video'))
		const isShapeTooCloseToContextualToolbar = rotation / HALF_PI > 1.6 && rotation / HALF_PI < 2.4

		const cx = isSmallX ? -hitTargetSize * 1.5 : width / 2
		const cy = isSmallX
			? height / 2
			: isMediaShape && !isShapeTooCloseToContextualToolbar
				? height + hitTargetSize * 1.5
				: -hitTargetSize * 1.5
		return { cx, cy }
	}

	private _getThemeColors(): SelectionForegroundColors {
		const editor = this.editor
		const themeColors = editor.getCurrentTheme().colors[editor.getColorMode()]
		return {
			strokeColor: themeColors.selectionStroke,
			bgColor: themeColors.background,
		}
	}

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

	private _getEdgeLocalRect(
		edge: SelectionEdge,
		state: SelectionState
	): { x: number; y: number; w: number; h: number } {
		const { width, height, hitTargetSizeX, hitTargetSizeY } = state
		switch (edge) {
			case 'top':
				return { x: 0, y: -hitTargetSizeY, w: width, h: hitTargetSizeY * 2 }
			case 'right':
				return { x: width - hitTargetSizeX, y: 0, w: hitTargetSizeX * 2, h: height }
			case 'bottom':
				return { x: 0, y: height - hitTargetSizeY, w: width, h: hitTargetSizeY * 2 }
			case 'left':
				return { x: -hitTargetSizeX, y: 0, w: hitTargetSizeX * 2, h: height }
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
}
