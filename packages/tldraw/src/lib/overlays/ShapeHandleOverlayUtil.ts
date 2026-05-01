import {
	Circle2d,
	Geometry2d,
	Mat,
	OverlayUtil,
	SIDES,
	TLCursorType,
	TLHandle,
	TLOverlay,
	TLShapeId,
	Vec,
} from '@tldraw/editor'

/** @public */
export interface TLShapeHandleOverlay extends TLOverlay {
	props: {
		shapeId: TLShapeId
		handle: TLHandle
	}
}

/**
 * Overlay util for shape handles (arrow endpoints, line vertices, etc.).
 *
 * @public
 */
export class ShapeHandleOverlayUtil extends OverlayUtil<TLShapeHandleOverlay> {
	static override type = 'shape_handle'
	override options = { zIndex: 200, lineWidth: 1.5 }

	override isActive(): boolean {
		const editor = this.editor
		if (editor.getIsReadonly() || editor.getInstanceState().isChangingStyle) return false

		const onlySelectedShape = editor.getOnlySelectedShape()
		if (!onlySelectedShape) return false

		const handles = editor.getShapeHandles(onlySelectedShape)
		if (!handles) return false

		if (editor.isInAny('select.idle', 'select.pointing_handle', 'select.pointing_shape')) {
			return true
		}

		if (editor.isIn('select.editing_shape')) {
			return editor.isShapeOfType(onlySelectedShape, 'note')
		}

		return false
	}

	override getOverlays(): TLShapeHandleOverlay[] {
		const editor = this.editor
		const onlySelectedShape = editor.getOnlySelectedShape()
		if (!onlySelectedShape) return []

		const handles = editor.getShapeHandles(onlySelectedShape)
		if (!handles) return []

		if (editor.isShapeHidden(onlySelectedShape)) return []

		const zoom = editor.getZoomLevel()
		const isCoarse = editor.getInstanceState().isCoarsePointer
		const minDist =
			((isCoarse ? editor.options.coarseHandleRadius : editor.options.handleRadius) / zoom) * 2

		const vertexHandles = handles.filter((handle) => handle.type === 'vertex')
		const vertexHandlesForHitTest: TLHandle[] = []
		const otherHandlesForHitTest: TLHandle[] = []

		// Vertex handles come first so they win hit-testing against overlapping
		// virtual/create handles (e.g., a line's midpoint create handle that
		// coincides with its endpoint vertices when a segment is very short).
		// `render` iterates this array in reverse so the painted order puts
		// vertex handles on top visually, matching the main branch's paint
		// order where vertex handles were sorted last.
		for (const handle of handles) {
			if (
				handle.type === 'virtual' &&
				vertexHandles.some((vertexHandle) => Vec.Dist(handle, vertexHandle) < minDist)
			) {
				continue
			}

			if (handle.type === 'vertex') {
				vertexHandlesForHitTest.push(handle)
			} else {
				otherHandlesForHitTest.push(handle)
			}
		}

		return vertexHandlesForHitTest.concat(otherHandlesForHitTest).map((handle) => ({
			id: `handle:${onlySelectedShape.id}:${handle.id}`,
			type: 'shape_handle',
			props: {
				shapeId: onlySelectedShape.id,
				handle,
			},
		}))
	}

	override getGeometry(overlay: TLShapeHandleOverlay): Geometry2d | null {
		const editor = this.editor
		const { shapeId, handle } = overlay.props
		const transform = editor.getShapePageTransform(shapeId)
		if (!transform) return null

		const zoom = editor.getZoomLevel()
		const isCoarse = editor.getInstanceState().isCoarsePointer
		const radius =
			(isCoarse ? editor.options.coarseHandleRadius : editor.options.handleRadius) / zoom

		// Transform handle position to page space
		const pagePoint = Mat.applyToPoint(transform, { x: handle.x, y: handle.y })

		return new Circle2d({
			x: pagePoint.x - radius,
			y: pagePoint.y - radius,
			radius,
			isFilled: true,
		})
	}

	override getCursor(_overlay: TLShapeHandleOverlay): TLCursorType | undefined {
		return 'grab' as TLCursorType
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLShapeHandleOverlay[]): void {
		if (overlays.length === 0) return

		const editor = this.editor
		const shapeId = overlays[0].props.shapeId
		const transform = editor.getShapePageTransform(shapeId)
		if (!transform) return

		const zoom = editor.getZoomLevel()
		const isCoarse = editor.getInstanceState().isCoarsePointer
		const themeColors = editor.getCurrentTheme().colors[editor.getColorMode()]
		const fgColor = themeColors.selectedContrast
		const strokeColor = themeColors.selectionStroke
		const bgFill = themeColors.selectionFill
		const hoveredOverlayId = editor.overlays.getHoveredOverlayId()
		const bgRadius =
			(isCoarse ? editor.options.coarseHandleRadius : editor.options.handleRadius) / zoom

		ctx.save()
		ctx.transform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f)

		ctx.strokeStyle = strokeColor
		ctx.lineWidth = this.options.lineWidth / zoom

		// Iterate in reverse: vertex handles come first in the array (for hit-
		// test priority) but should paint last so they visually sit on top of
		// overlapping virtual/create handles.
		for (let i = overlays.length - 1; i >= 0; i--) {
			const overlay = overlays[i]
			const { handle } = overlay.props
			const isHovered = overlay.id === hoveredOverlayId

			// 'create' handles are invisible on fine pointers and revealed on
			// hover (matches the old .tl-handle__create opacity rules).
			if (handle.type === 'create' && !isCoarse && !isHovered) continue

			// Hover halo — matches the old .tl-handle__bg:hover fill rule.
			if (isHovered) {
				ctx.fillStyle = bgFill
				ctx.beginPath()
				ctx.arc(handle.x, handle.y, bgRadius, 0, Math.PI * 2)
				ctx.fill()
			}

			if (handle.type === 'clone') {
				// Note clone handles render as a side-facing half circle.
				const fr = 3 / zoom
				const sideIndex = SIDES.indexOf(handle.id as (typeof SIDES)[number])
				const rotation = (-Math.PI / 2) * (1 - sideIndex)

				ctx.save()
				ctx.translate(handle.x, handle.y)
				ctx.rotate(rotation)
				ctx.fillStyle = strokeColor
				ctx.beginPath()
				ctx.moveTo(0, -fr)
				ctx.arc(0, 0, fr, -Math.PI / 2, Math.PI / 2)
				ctx.closePath()
				ctx.fill()
				ctx.restore()
				continue
			}

			// Match the old DefaultHandle sizing: create handles on coarse
			// pointers are slightly smaller (3px) since they're always visible;
			// on fine pointers they render at 4px when revealed by hover so
			// they match the vertex handles. Clamp the zoom divisor at 0.25 so
			// the visible circle stops growing past 25% zoom and visually
			// shrinks as the user zooms further out — the hit-area halo above
			// still tracks the full zoom so handles remain grabbable.
			const fr = (handle.type === 'create' && isCoarse ? 3 : 4) / Math.max(zoom, 0.25)

			ctx.fillStyle = fgColor
			ctx.beginPath()
			ctx.arc(handle.x, handle.y, fr, 0, Math.PI * 2)
			ctx.fill()
			ctx.stroke()
		}

		ctx.restore()
	}
}
