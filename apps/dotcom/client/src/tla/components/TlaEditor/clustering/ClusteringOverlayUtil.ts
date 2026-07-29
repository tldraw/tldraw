import { ClusterBounds, getShapeClusters } from '@tldraw/dotcom-shared'
import { Box, OverlayUtil, TLOverlay, atom, compact } from 'tldraw'

export const clusteringOverlayVisible = atom('clustering overlay visible', false)

interface TLClusteringOverlay extends TLOverlay {
	props: {
		hull: { x: number; y: number }[]
		centerX: number
		centerY: number
		label: string
		index: number
	}
}

// Golden-angle hue stepping, so adjacent clusters never land on similar colours.
function clusterColor(index: number, alpha: number) {
	return `hsl(${(index * 137.508) % 360}deg 65% 42% / ${alpha})`
}

/** Andrew's monotone chain convex hull. */
function convexHull(points: { x: number; y: number }[]): { x: number; y: number }[] {
	const pts = [...points].sort((p, q) => p.x - q.x || p.y - q.y)
	if (pts.length < 3) return pts
	const cross = (
		o: { x: number; y: number },
		a: { x: number; y: number },
		b: { x: number; y: number }
	) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

	const lower: { x: number; y: number }[] = []
	for (const p of pts) {
		while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
			lower.pop()
		}
		lower.push(p)
	}
	const upper: { x: number; y: number }[] = []
	for (let i = pts.length - 1; i >= 0; i--) {
		const p = pts[i]
		while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
			upper.pop()
		}
		upper.push(p)
	}
	return lower.slice(0, -1).concat(upper.slice(0, -1))
}

export class ClusteringOverlayUtil extends OverlayUtil<TLClusteringOverlay> {
	static override type = 'mcp-clustering'
	override options = { zIndex: 900 }

	override isActive() {
		return clusteringOverlayVisible.get()
	}

	override getOverlays(): TLClusteringOverlay[] {
		const shapes = this.editor.getCurrentPageShapes()

		// The editor is the only place real geometry exists, so it supplies it — that is what lets the
		// shared clustering merge shapes that merely sit near each other, rather than stopping at the
		// hierarchy. A shape the editor cannot measure is left out and stays its own cluster.
		const bounds: Record<string, ClusterBounds> = {}
		for (const shape of shapes) {
			const box = this.editor.getShapePageBounds(shape)
			if (box) {
				bounds[shape.id] = { minX: box.minX, minY: box.minY, maxX: box.maxX, maxY: box.maxY }
			}
		}

		const clusters = getShapeClusters(shapes, this.editor.getCurrentPageId(), bounds)

		return compact(
			clusters.map((cluster, index) => {
				const shapeBounds = compact(
					cluster.shapes.map((shape) => this.editor.getShapePageBounds(shape))
				)
				if (shapeBounds.length === 0) return null

				// Hull over every member's corners, so the outline hugs the cluster's silhouette rather
				// than the bounding box of it — two shapes on a diagonal enclose far less area this way,
				// which is what keeps neighbouring clusters visually distinct.
				const corners = shapeBounds.flatMap((b) => [
					{ x: b.minX, y: b.minY },
					{ x: b.maxX, y: b.minY },
					{ x: b.maxX, y: b.maxY },
					{ x: b.minX, y: b.maxY },
				])
				const common = Box.Common(shapeBounds)
				let hull = convexHull(corners)
				if (hull.length < 3) {
					// Degenerate (zero-area) cluster: fall back to its rectangle so there is still a path.
					const padded = common.clone().expandBy(1)
					hull = [
						{ x: padded.minX, y: padded.minY },
						{ x: padded.maxX, y: padded.minY },
						{ x: padded.maxX, y: padded.maxY },
						{ x: padded.minX, y: padded.maxY },
					]
				}

				return {
					id: `mcp-clustering:${cluster.id}`,
					type: 'mcp-clustering',
					props: {
						hull,
						centerX: common.center.x,
						centerY: common.center.y,
						// The keyword label when the cluster has any text to derive one from; otherwise the
						// shape count, which is all there is to say about a cluster of blank boxes.
						label:
							cluster.label ||
							`${cluster.numberOfShapes} shape${cluster.numberOfShapes === 1 ? '' : 's'}`,
						index,
					},
				}
			})
		)
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLClusteringOverlay[]) {
		const zoom = this.editor.getZoomLevel()
		const px = (n: number) => n / zoom

		for (const overlay of overlays) {
			const { hull, centerX, centerY, label, index } = overlay.props

			ctx.save()
			ctx.beginPath()
			ctx.moveTo(hull[0].x, hull[0].y)
			for (let i = 1; i < hull.length; i++) ctx.lineTo(hull[i].x, hull[i].y)
			ctx.closePath()
			// A fat, round-joined stroke inflates the hull into a soft blob, so it reads as one region
			// rather than a polygon drawn around some shapes.
			ctx.lineJoin = 'round'
			ctx.lineWidth = Math.max(14, px(10)) * 2
			ctx.strokeStyle = clusterColor(index, 0.28)
			ctx.stroke()
			ctx.fillStyle = clusterColor(index, 0.09)
			ctx.fill()
			ctx.restore()

			// Numbered centroid node, so a cluster on screen can be matched to one in a tool result.
			ctx.save()
			ctx.beginPath()
			ctx.arc(centerX, centerY, px(11), 0, Math.PI * 2)
			ctx.fillStyle = clusterColor(index, 1)
			ctx.fill()
			ctx.lineWidth = px(2)
			ctx.strokeStyle = 'white'
			ctx.stroke()
			ctx.fillStyle = 'white'
			ctx.font = `700 ${px(11)}px sans-serif`
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText(String(index + 1), centerX, centerY)
			ctx.restore()

			// Label pill above the blob
			ctx.save()
			ctx.font = `600 ${px(12)}px sans-serif`
			ctx.textAlign = 'left'
			ctx.textBaseline = 'bottom'
			ctx.fillStyle = clusterColor(index, 1)
			ctx.fillText(
				label,
				Math.min(...hull.map((p) => p.x)),
				Math.min(...hull.map((p) => p.y)) - px(18)
			)
			ctx.restore()
		}
	}
}
