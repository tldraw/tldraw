import {
	GapsSnapIndicator,
	OverlayUtil,
	PointsSnapIndicator,
	SnapIndicator,
	TLOverlay,
	rangeIntersection,
} from '@tldraw/editor'

/** @public */
export interface TLSnapIndicatorOverlay extends TLOverlay {
	props: {
		line: SnapIndicator
	}
}

/**
 * Overlay util for snap alignment indicators (point snap lines and gap indicators).
 *
 * @public
 */
export class SnapIndicatorOverlayUtil extends OverlayUtil<TLSnapIndicatorOverlay> {
	static override type = 'snap_indicator'
	override options = { zIndex: 500, lineWidth: 1 }

	override isActive(): boolean {
		return this.editor.snaps.getIndicators().length > 0
	}

	override getOverlays(): TLSnapIndicatorOverlay[] {
		return this.editor.snaps.getIndicators().map((line) => ({
			id: `snap:${line.id}`,
			type: 'snap_indicator',
			props: { line },
		}))
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLSnapIndicatorOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		const snapColor = this.editor.getCurrentTheme().colors[this.editor.getColorMode()].snap

		for (const overlay of overlays) {
			const { line } = overlay.props
			if (line.type === 'points') {
				this._renderPoints(ctx, line, zoom, snapColor)
			} else if (line.type === 'gaps') {
				this._renderGaps(ctx, line, zoom, snapColor)
			}
		}
	}

	private _renderPoints(
		ctx: CanvasRenderingContext2D,
		indicator: PointsSnapIndicator,
		zoom: number,
		color: string
	): void {
		const { points } = indicator
		if (points.length === 0) return

		const l = 2.5 / zoom

		let minX = Infinity
		let maxX = -Infinity
		let minY = Infinity
		let maxY = -Infinity
		for (const point of points) {
			if (point.x < minX) minX = point.x
			if (point.x > maxX) maxX = point.x
			if (point.y < minY) minY = point.y
			if (point.y > maxY) maxY = point.y
		}

		let useNWtoSEdirection = false
		for (const point of points) {
			if (point.x === minX && point.y === minY) {
				useNWtoSEdirection = true
				break
			}
		}
		let firstX: number, firstY: number, secondX: number, secondY: number
		if (useNWtoSEdirection) {
			firstX = minX
			firstY = minY
			secondX = maxX
			secondY = maxY
		} else {
			firstX = minX
			firstY = maxY
			secondX = maxX
			secondY = minY
		}

		ctx.strokeStyle = color
		ctx.lineWidth = this.options.lineWidth / zoom

		// Main snap line
		ctx.beginPath()
		ctx.moveTo(firstX, firstY)
		ctx.lineTo(secondX, secondY)
		ctx.stroke()

		// Batch-draw crosses for all points in a single stroke
		ctx.beginPath()
		for (const p of points) {
			ctx.moveTo(p.x - l, p.y - l)
			ctx.lineTo(p.x + l, p.y + l)
			ctx.moveTo(p.x - l, p.y + l)
			ctx.lineTo(p.x + l, p.y - l)
		}
		ctx.stroke()
	}

	private _renderGaps(
		ctx: CanvasRenderingContext2D,
		indicator: GapsSnapIndicator,
		zoom: number,
		color: string
	): void {
		const { gaps, direction } = indicator
		if (gaps.length === 0) return

		const l = 3.5 / zoom
		const tickLength = 2 * l
		const horizontal = direction === 'horizontal'

		let edgeIntersection: number[] = [-Infinity, +Infinity]
		let nextEdgeIntersection: number[] | null = null

		for (const gap of gaps) {
			nextEdgeIntersection = rangeIntersection(
				edgeIntersection[0],
				edgeIntersection[1],
				horizontal ? gap.startEdge[0].y : gap.startEdge[0].x,
				horizontal ? gap.startEdge[1].y : gap.startEdge[1].x
			)
			if (nextEdgeIntersection) {
				edgeIntersection = nextEdgeIntersection
			} else {
				continue
			}
			nextEdgeIntersection = rangeIntersection(
				edgeIntersection[0],
				edgeIntersection[1],
				horizontal ? gap.endEdge[0].y : gap.endEdge[0].x,
				horizontal ? gap.endEdge[1].y : gap.endEdge[1].x
			)
			if (nextEdgeIntersection) {
				edgeIntersection = nextEdgeIntersection
			} else {
				continue
			}
		}

		const midPoint = (edgeIntersection[0] + edgeIntersection[1]) / 2

		ctx.strokeStyle = color
		ctx.lineWidth = this.options.lineWidth / zoom

		// Batch all gap ticks/lines into a single path, then stroke once
		ctx.beginPath()
		for (const { startEdge, endEdge } of gaps) {
			if (horizontal) {
				// Start edge tick
				ctx.moveTo(startEdge[0].x, midPoint - tickLength)
				ctx.lineTo(startEdge[1].x, midPoint + tickLength)
				// End edge tick
				ctx.moveTo(endEdge[0].x, midPoint - tickLength)
				ctx.lineTo(endEdge[1].x, midPoint + tickLength)
				// Joining line
				ctx.moveTo(startEdge[0].x, midPoint)
				ctx.lineTo(endEdge[0].x, midPoint)
				// Center tick
				const cx = (startEdge[0].x + endEdge[0].x) / 2
				ctx.moveTo(cx, midPoint - l)
				ctx.lineTo(cx, midPoint + l)
			} else {
				// Start edge tick
				ctx.moveTo(midPoint - tickLength, startEdge[0].y)
				ctx.lineTo(midPoint + tickLength, startEdge[1].y)
				// End edge tick
				ctx.moveTo(midPoint - tickLength, endEdge[0].y)
				ctx.lineTo(midPoint + tickLength, endEdge[1].y)
				// Joining line
				ctx.moveTo(midPoint, startEdge[0].y)
				ctx.lineTo(midPoint, endEdge[0].y)
				// Center tick
				const cy = (startEdge[0].y + endEdge[0].y) / 2
				ctx.moveTo(midPoint - l, cy)
				ctx.lineTo(midPoint + l, cy)
			}
		}
		ctx.stroke()
	}
}
