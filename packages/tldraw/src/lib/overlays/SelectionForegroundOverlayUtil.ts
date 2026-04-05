import {
	Box,
	Editor,
	Geometry2d,
	HALF_PI,
	OverlayUtil,
	Rectangle2d,
	RotateCorner,
	SelectionCorner,
	SelectionEdge,
	TLCursorType,
	TLOverlay,
	TLSelectionHandle,
	Vec,
	getCursor,
	tlenv,
} from '@tldraw/editor'

/** @public */
export interface TLSelectionForegroundOverlay extends TLOverlay {
	props: {
		overlayType: 'resize_handle' | 'rotate_handle' | 'mobile_rotate'
		handle: TLSelectionHandle | RotateCorner
	}
}

/** @public */
export interface SelectionForegroundOverlayOptions {
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

	override options: SelectionForegroundOverlayOptions = {
		strokeColor: 'var(--tl-color-selection-stroke)',
		bgColor: 'var(--tl-color-background)',
	}

	override isActive(): boolean {
		const bounds = this.editor.getSelectionRotatedPageBounds()
		if (!bounds) return false

		const shouldDisplayControls =
			this.editor.isInAny(
				'select.idle',
				'select.pointing_selection',
				'select.pointing_shape',
				'select.crop.idle'
			) &&
			!this.editor.getInstanceState().isChangingStyle &&
			!this.editor.getIsReadonly()

		return shouldDisplayControls
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
			if (true) {
				// top_left — always shown when handles are shown
				overlays.push(this._makeOverlay('resize_handle', 'top_left'))
			}
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

		const { overlayType, handle } = overlay.props

		// Compute the geometry in the local coordinate space of the selection bounds,
		// then rotate to page space.
		let localRect: { x: number; y: number; w: number; h: number } | null = null

		if (overlayType === 'resize_handle') {
			localRect = this._getResizeHandleLocalRect(
				handle as SelectionCorner | SelectionEdge,
				width,
				height,
				targetSizeX,
				targetSizeY,
				isSmallX,
				isSmallY
			)
		} else if (overlayType === 'rotate_handle') {
			localRect = this._getRotateHandleLocalRect(handle as RotateCorner, width, height, targetSize)
		} else if (overlayType === 'mobile_rotate') {
			const size = 8 / zoom
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
			localRect = {
				x: cx - bgRadius,
				y: cy - bgRadius,
				w: bgRadius * 2,
				h: bgRadius * 2,
			}
		}

		if (!localRect) return null

		// Transform local rect corners to page space using selection origin + rotation
		const origin = new Vec(
			expandedBounds.x + (bounds.x - expandedBounds.x),
			expandedBounds.y + (bounds.y - expandedBounds.y)
		)
		// The local rect is relative to the expandedBounds origin, offset by the expand delta
		const expandDx = expandedBounds.x - bounds.x
		const expandDy = expandedBounds.y - bounds.y

		const pageX = bounds.x + expandDx + localRect.x
		const pageY = bounds.y + expandDy + localRect.y

		if (rotation === 0) {
			return new Rectangle2d({
				x: pageX,
				y: pageY,
				width: localRect.w,
				height: localRect.h,
				isFilled: true,
			})
		}

		// For rotated selections, rotate the rect center around the selection center
		const rectCenter = new Vec(pageX + localRect.w / 2, pageY + localRect.h / 2)
		const selCenter = bounds.center
		const rotatedCenter = Vec.RotWith(rectCenter, selCenter, rotation)

		// Use a rectangle centered at the rotated position
		// Note: This is an approximation — for precise rotated hit testing we'd need
		// a rotated polygon geometry. For now, using an axis-aligned rect at the
		// rotated center is good enough since handles are small.
		return new Rectangle2d({
			x: rotatedCenter.x - localRect.w / 2,
			y: rotatedCenter.y - localRect.h / 2,
			width: localRect.w,
			height: localRect.h,
			isFilled: true,
		})
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

		const strokeColor = this._resolveColor(this.options.strokeColor)
		const bgColor = this._resolveColor(this.options.bgColor)

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

		// Mobile rotate handle
		if (showMobileRotateHandle) {
			const isSmallX = width < size * 4
			const isSmallY = height < size * 4
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

			const SQUARE_ROOT_PI = Math.sqrt(Math.PI)
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
		const editor = this.editor
		const rotation = editor.getSelectionRotation()
		const isDefaultCursor = editor.getInstanceState().cursor.type === 'default'
		if (!isDefaultCursor) return undefined

		const { overlayType, handle } = overlay.props

		if (overlayType === 'rotate_handle') {
			const cursorMap: Record<string, string> = {
				top_left_rotate: 'nwse-rotate',
				top_right_rotate: 'nesw-rotate',
				bottom_left_rotate: 'swne-rotate',
				bottom_right_rotate: 'senw-rotate',
			}
			const cursor = cursorMap[handle]
			if (cursor) return getCursor(cursor, rotation) as TLCursorType
		}

		if (overlayType === 'mobile_rotate') {
			return 'grab' as TLCursorType
		}

		if (overlayType === 'resize_handle') {
			const cursorMap: Record<string, string> = {
				top_left: 'nwse-resize',
				top_right: 'nesw-resize',
				bottom_right: 'nwse-resize',
				bottom_left: 'nesw-resize',
				top: 'ns-resize',
				bottom: 'ns-resize',
				left: 'ew-resize',
				right: 'ew-resize',
			}
			const cursor = cursorMap[handle]
			if (cursor) return getCursor(cursor, rotation) as TLCursorType
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

	private _getResizeHandleLocalRect(
		handle: SelectionCorner | SelectionEdge,
		width: number,
		height: number,
		targetSizeX: number,
		targetSizeY: number,
		isSmallX: boolean,
		isSmallY: boolean
	): { x: number; y: number; w: number; h: number } {
		// These match the positions from TldrawSelectionForeground's ResizeHandle components
		switch (handle) {
			case 'top':
				return {
					x: 0,
					y: 0 - (isSmallY ? targetSizeY * 2 : targetSizeY),
					w: width,
					h: Math.max(1, targetSizeY * 2),
				}
			case 'right':
				return {
					x: width - (isSmallX ? 0 : targetSizeX),
					y: 0,
					w: Math.max(1, targetSizeX * 2),
					h: height,
				}
			case 'bottom':
				return {
					x: 0,
					y: height - (isSmallY ? 0 : targetSizeY),
					w: width,
					h: Math.max(1, targetSizeY * 2),
				}
			case 'left':
				return {
					x: 0 - (isSmallX ? targetSizeX * 2 : targetSizeX),
					y: 0,
					w: Math.max(1, targetSizeX * 2),
					h: height,
				}
			case 'top_left':
				return {
					x: 0 - (isSmallX ? targetSizeX * 2 : targetSizeX * 1.5),
					y: 0 - (isSmallY ? targetSizeY * 2 : targetSizeY * 1.5),
					w: targetSizeX * 3,
					h: targetSizeY * 3,
				}
			case 'top_right':
				return {
					x: width - (isSmallX ? 0 : targetSizeX * 1.5),
					y: 0 - (isSmallY ? targetSizeY * 2 : targetSizeY * 1.5),
					w: targetSizeX * 3,
					h: targetSizeY * 3,
				}
			case 'bottom_right':
				return {
					x: width - (isSmallX ? targetSizeX : targetSizeX * 1.5),
					y: height - (isSmallY ? targetSizeY : targetSizeY * 1.5),
					w: targetSizeX * 3,
					h: targetSizeY * 3,
				}
			case 'bottom_left':
				return {
					x: 0 - (isSmallX ? targetSizeX * 3 : targetSizeX * 1.5),
					y: height - (isSmallY ? 0 : targetSizeY * 1.5),
					w: targetSizeX * 3,
					h: targetSizeY * 3,
				}
		}
	}

	/** @internal */
	_resolveColor(value: string): string {
		if (!value.startsWith('var(')) return value
		const varName = value.slice(4, -1)
		const container = this.editor.getContainer()
		return getComputedStyle(container).getPropertyValue(varName) || value
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

	private _getRotateHandleLocalRect(
		corner: RotateCorner,
		width: number,
		height: number,
		targetSize: number
	): { x: number; y: number; w: number; h: number } {
		// These match RotateCornerHandle positions from TldrawSelectionForeground
		const s = targetSize * 3
		switch (corner) {
			case 'top_left_rotate':
				return { x: 0 - s, y: 0 - s, w: s, h: s }
			case 'top_right_rotate':
				return { x: width, y: 0 - s, w: s, h: s }
			case 'bottom_left_rotate':
				return { x: 0 - s, y: height, w: s, h: s }
			case 'bottom_right_rotate':
				return { x: width, y: height, w: s, h: s }
			default:
				return { x: 0, y: 0, w: 0, h: 0 }
		}
	}
}
