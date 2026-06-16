import {
	getPerfectDashProps,
	OverlayUtil,
	PI2,
	TLArrowShape,
	TLOverlay,
	TLShapeId,
	Vec,
} from '@tldraw/editor'
import { TLArrowInfo } from '../shapes/arrow/arrow-types'
import { getArrowInfo } from '../shapes/arrow/getArrowInfo'
import { getArrowBindings } from '../shapes/arrow/shared'

/** @public */
export interface TLArrowBindingHintOverlay extends TLOverlay {
	props: {
		arrowId: TLShapeId
	}
}

/**
 * Overlay util for the dashed binding hint shown on bound arrows. Draws stubs
 * along the arrow's handle path, from each bound endpoint's snapped body
 * position to the user's intended (handle) position, with a precision marker
 * at the handle.
 *
 * @public
 */
export class ArrowBindingHintOverlayUtil extends OverlayUtil<TLArrowBindingHintOverlay> {
	static override type = 'arrow_binding_hint'
	override options = {
		zIndex: 150,
		strokeWidth: 2,
		opacity: 0.16,
		dashLengthRatio: 2.5,
		dotRadius: 4,
		crossSize: 6,
		dashedMinZoom: 0.2,
	}

	override isActive(): boolean {
		const editor = this.editor
		if (editor.getIsReadonly()) return false
		const id = editor.getOnlySelectedShapeId()
		if (!id) return false
		const shape = editor.getShape(id)
		if (!shape || shape.type !== 'arrow') return false
		if (
			!editor.isInAny(
				'select.idle',
				'select.pointing_handle',
				'select.dragging_handle',
				'select.translating',
				'arrow.dragging'
			)
		) {
			return false
		}
		const bindings = getArrowBindings(editor, shape as TLArrowShape)
		return Boolean(bindings.start || bindings.end)
	}

	override getOverlays(): TLArrowBindingHintOverlay[] {
		const id = this.editor.getOnlySelectedShapeId()
		if (!id) return []
		return [
			{
				id: 'arrow_binding_hint',
				type: 'arrow_binding_hint',
				props: { arrowId: id },
			},
		]
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLArrowBindingHintOverlay[]): void {
		const overlay = overlays[0]
		if (!overlay) return

		const editor = this.editor
		const shape = editor.getShape(overlay.props.arrowId) as TLArrowShape | undefined
		if (!shape) return

		const info = getArrowInfo(editor, shape)
		if (!info?.isValid) return

		const bindings = getArrowBindings(editor, shape)
		if (!bindings.start && !bindings.end) return

		const pageTransform = editor.getShapePageTransform(shape)
		if (!pageTransform) return

		const zoom = editor.getZoomLevel()
		const colors = editor.getCurrentTheme().colors[editor.getColorMode()]
		const strokeWidth = this.options.strokeWidth / zoom

		ctx.save()
		ctx.transform(
			pageTransform.a,
			pageTransform.b,
			pageTransform.c,
			pageTransform.d,
			pageTransform.e,
			pageTransform.f
		)

		ctx.strokeStyle = colors.text
		ctx.fillStyle = colors.text
		ctx.lineWidth = strokeWidth
		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'
		ctx.globalAlpha = this.options.opacity

		if (bindings.start) {
			this.drawEndpoint(
				ctx,
				info,
				'start',
				bindings.start.props.isExact,
				bindings.start.props.isPrecise,
				strokeWidth,
				zoom
			)
		}
		if (bindings.end) {
			this.drawEndpoint(
				ctx,
				info,
				'end',
				bindings.end.props.isExact,
				bindings.end.props.isPrecise,
				strokeWidth,
				zoom
			)
		}

		ctx.restore()
	}

	private drawEndpoint(
		ctx: CanvasRenderingContext2D,
		info: TLArrowInfo,
		side: 'start' | 'end',
		isExact: boolean,
		isPrecise: boolean,
		strokeWidth: number,
		zoom: number
	) {
		const handle = info[side].handle
		const point = info[side].point
		const dist = Vec.Dist(handle, point)

		// Stop the dashed stub at the marker's outer edge so it doesn't pass
		// through the dot/cross. The cross's corners (leg endpoints) sit at
		// half the diagonal of its bounding square, not half its side.
		const markerRadius =
			(isPrecise ? (this.options.crossSize / 2) * Math.SQRT2 : this.options.dotRadius) / zoom

		if (dist > markerRadius + 0.5) {
			ctx.save()
			ctx.beginPath()

			let pathLength: number

			if (info.type === 'arc') {
				// Render along the body arc so the stub sits on the same circle as
				// the visible arrow body; project handle radially onto that circle.
				const { center, radius, sweepFlag } = info.bodyArc
				const pointAngle = Math.atan2(point.y - center.y, point.x - center.x)
				const handleAngle = Math.atan2(handle.y - center.y, handle.x - center.x)
				const anticlockwise = !sweepFlag
				const sign = (sweepFlag ? 1 : -1) * (side === 'start' ? 1 : -1)
				const trimmedHandleAngle = handleAngle + sign * (markerRadius / radius)

				// Handle and point are close points on the same circle, so the
				// stub follows the short arc between them. Use the shortest signed
				// angular distance to get the arc length, then trim the marker.
				let handleToPointSweep = pointAngle - handleAngle
				if (handleToPointSweep > Math.PI) handleToPointSweep -= PI2
				else if (handleToPointSweep < -Math.PI) handleToPointSweep += PI2
				pathLength = Math.max(0, radius * Math.abs(handleToPointSweep) - markerRadius)

				if (side === 'start') {
					ctx.arc(center.x, center.y, radius, trimmedHandleAngle, pointAngle, anticlockwise)
				} else {
					ctx.arc(center.x, center.y, radius, pointAngle, trimmedHandleAngle, anticlockwise)
				}
			} else {
				pathLength = dist - markerRadius
				const t = markerRadius / dist
				const trimmedHandle = {
					x: handle.x + (point.x - handle.x) * t,
					y: handle.y + (point.y - handle.y) * t,
				}
				ctx.moveTo(trimmedHandle.x, trimmedHandle.y)
				ctx.lineTo(point.x, point.y)
			}

			// Below the dash threshold the dashes get too small to read, so
			// fall back to a solid stub.
			if (zoom >= this.options.dashedMinZoom) {
				const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(pathLength, strokeWidth, {
					style: 'dashed',
					end: 'skip',
					start: 'skip',
				})

				if (strokeDasharray !== 'none') {
					const [dashLength, gapLength] = strokeDasharray.split(' ').map(Number)
					ctx.setLineDash([dashLength, gapLength])
					ctx.lineDashOffset = Number(strokeDashoffset)
				}
			}

			ctx.stroke()
			ctx.restore()
		}

		if (isExact) return

		const markerAngle = dist > 0.5 ? this.getMarkerAngle(info, side, handle, point) : 0

		if (isPrecise) {
			const half = this.options.crossSize / zoom / 2
			ctx.save()
			ctx.translate(handle.x, handle.y)
			ctx.rotate(markerAngle)
			ctx.beginPath()
			ctx.moveTo(-half, -half)
			ctx.lineTo(half, half)
			ctx.moveTo(-half, half)
			ctx.lineTo(half, -half)
			ctx.stroke()
			ctx.restore()
		} else {
			const radius = this.options.dotRadius / zoom
			ctx.beginPath()
			ctx.arc(handle.x, handle.y, radius, 0, PI2)
			ctx.stroke()
		}
	}

	/** Tangent direction at the handle, oriented toward the body. */
	private getMarkerAngle(
		info: TLArrowInfo,
		side: 'start' | 'end',
		handle: { x: number; y: number },
		point: { x: number; y: number }
	): number {
		if (info.type === 'arc') {
			const { center, sweepFlag } = info.bodyArc
			const radial = Math.atan2(handle.y - center.y, handle.x - center.x)
			// tangent perpendicular to radial; sign chosen to point toward the body
			const sign = (sweepFlag ? 1 : -1) * (side === 'start' ? 1 : -1)
			return radial + (sign * Math.PI) / 2
		}
		return Math.atan2(point.y - handle.y, point.x - handle.x)
	}
}
