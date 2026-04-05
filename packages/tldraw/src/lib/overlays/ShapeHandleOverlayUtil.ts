import {
	Circle2d,
	Geometry2d,
	Mat,
	OverlayUtil,
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

/** @public */
export interface ShapeHandleOverlayOptions {
	fgColor: string
	strokeColor: string
}

/**
 * Overlay util for shape handles (arrow endpoints, line vertices, etc.).
 *
 * @public
 */
export class ShapeHandleOverlayUtil extends OverlayUtil<TLShapeHandleOverlay> {
	static override type = 'shape_handle'

	override options: ShapeHandleOverlayOptions = {
		fgColor: 'var(--tl-color-selected-contrast)',
		strokeColor: 'var(--tl-color-selection-stroke)',
	}

	override isActive(): boolean {
		const editor = this.editor
		const { isReadonly, isChangingStyle } = editor.getInstanceState()
		if (isReadonly || isChangingStyle) return false

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

		const zoom = editor.getEfficientZoomLevel()
		const isCoarse = editor.getInstanceState().isCoarsePointer
		const minDist =
			((isCoarse ? editor.options.coarseHandleRadius : editor.options.handleRadius) / zoom) * 2

		const filtered = handles
			.filter(
				(handle) =>
					handle.type !== 'virtual' ||
					!handles.some((h) => h !== handle && h.type === 'vertex' && Vec.Dist(handle, h) < minDist)
			)
			.sort((a) => (a.type === 'vertex' ? 1 : -1))

		return filtered.map((handle) => ({
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

		const zoom = editor.getEfficientZoomLevel()
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

		const zoom = editor.getEfficientZoomLevel()
		const isCoarse = editor.getInstanceState().isCoarsePointer
		const fgColor = this._resolveColor(this.options.fgColor)
		const strokeColor = this._resolveColor(this.options.strokeColor)

		ctx.save()
		// Apply shape's page transform
		ctx.transform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f)

		for (const overlay of overlays) {
			const { handle } = overlay.props
			const fr = (handle.type === 'create' && isCoarse ? 3 : 4) / Math.max(zoom, 0.25)

			// Foreground circle
			ctx.fillStyle = handle.type === 'clone' ? strokeColor : fgColor
			ctx.strokeStyle = handle.type === 'clone' ? 'none' : strokeColor
			ctx.lineWidth = 1.5 / zoom
			ctx.beginPath()
			ctx.arc(handle.x, handle.y, fr, 0, Math.PI * 2)
			ctx.fill()
			if (handle.type !== 'clone') {
				ctx.stroke()
			}
		}

		ctx.restore()
	}

	/** @internal */
	_resolveColor(value: string): string {
		if (!value.startsWith('var(')) return value
		const varName = value.slice(4, -1)
		const container = this.editor.getContainer()
		return getComputedStyle(container).getPropertyValue(varName) || value
	}
}
