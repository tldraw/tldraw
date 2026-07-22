import { computed, OverlayUtil, Polygon2d, TLOverlay, Vec } from 'tldraw'
import { buildClusterModel, ClusterEdge, ClusterModel, ClusterNode } from './clustering'
import { clusterSettings } from './settings'

interface TLClusterOverlay extends TLOverlay {
	props: { clusterId: number }
}

const OVERLAY_ID_PREFIX = 'cluster-graph:'

/** Deterministic distinct color per cluster (golden-angle hue walk). */
function clusterColor(id: number, alpha: number): string {
	return `hsl(${(id * 137.508) % 360}deg 65% 42% / ${alpha})`
}

/**
 * Draws the cluster model on the canvas overlay layer: puffy convex hulls per
 * cluster, dashed subcluster hulls, spatial graph edges between centroids,
 * dashed binding ("semantic") edges, numbered centroid nodes, and keyword
 * label pills.
 *
 * Hulls expose hit-test geometry, so hovering one highlights the cluster and
 * its graph neighbors — a live preview of "an agent queried this node and got
 * hints about adjacent nodes".
 */
export class ClusterGraphOverlayUtil extends OverlayUtil<TLClusterOverlay> {
	static override type = 'cluster-graph'
	override options = { zIndex: 300 }

	// The whole model derives reactively from the store + the settings atom,
	// so it recomputes only when shapes or settings actually change.
	private model = computed<ClusterModel>('cluster graph model', () =>
		buildClusterModel(this.editor, clusterSettings.get())
	)

	getModel(): ClusterModel {
		return this.model.get()
	}

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLClusterOverlay[] {
		return this.model.get().clusters.map((cluster) => ({
			id: `${OVERLAY_ID_PREFIX}${cluster.id}`,
			type: 'cluster-graph',
			props: { clusterId: cluster.id },
		}))
	}

	// Filled hull geometry makes clusters hoverable. No onPointerDown is
	// defined, so clicks fall through to normal canvas behavior.
	override getGeometry(overlay: TLClusterOverlay): Polygon2d | null {
		const cluster = this.model.get().clusters[overlay.props.clusterId]
		if (!cluster || cluster.hull.length < 3) return null
		return new Polygon2d({ points: cluster.hull.map(Vec.From), isFilled: true })
	}

	getHoveredClusterId(): number | null {
		const hoveredId = this.editor.overlays.getHoveredOverlayId()
		if (!hoveredId?.startsWith(OVERLAY_ID_PREFIX)) return null
		return Number(hoveredId.slice(OVERLAY_ID_PREFIX.length))
	}

	/** Clusters adjacent to the given cluster in the current graph. */
	getAdjacency(clusterId: number): { neighbor: number; kind: ClusterEdge['kind'] }[] {
		const { spatialEdges, bindingEdges } = this.model.get()
		const result: { neighbor: number; kind: ClusterEdge['kind'] }[] = []
		const seen = new Set<number>()
		// Binding edges first: an explicit arrow is a stronger signal than proximity
		for (const edge of [...bindingEdges, ...spatialEdges]) {
			const neighbor = edge.a === clusterId ? edge.b : edge.b === clusterId ? edge.a : null
			if (neighbor === null || seen.has(neighbor)) continue
			seen.add(neighbor)
			result.push({ neighbor, kind: edge.kind })
		}
		return result
	}

	override render(ctx: CanvasRenderingContext2D): void {
		const model = this.model.get()
		const settings = clusterSettings.get()
		if (model.clusters.length === 0) return

		const zoom = this.editor.getZoomLevel()
		const px = (v: number) => v / zoom // constant on-screen size in page units

		const hovered = this.getHoveredClusterId()
		const neighborsOfHovered = new Set<number>()
		if (hovered !== null) {
			for (const { neighbor } of this.getAdjacency(hovered)) neighborsOfHovered.add(neighbor)
		}

		const drawEdges = (edges: ClusterEdge[], dashed: boolean, color: string) => {
			for (const edge of edges) {
				const a = model.clusters[edge.a]
				const b = model.clusters[edge.b]
				if (!a || !b) continue
				const active = hovered !== null && (edge.a === hovered || edge.b === hovered)
				const dimmed = hovered !== null && !active
				ctx.save()
				ctx.strokeStyle = color
				ctx.globalAlpha = dimmed ? 0.15 : active ? 1 : 0.55
				ctx.lineWidth = px(active ? 3 : 1.75)
				ctx.setLineDash(dashed ? [px(7), px(5)] : [])
				ctx.beginPath()
				ctx.moveTo(a.center.x, a.center.y)
				ctx.lineTo(b.center.x, b.center.y)
				ctx.stroke()
				ctx.restore()
			}
		}

		// -- Edges below hulls -------------------------------------------------
		if (settings.edgeMode !== 'none') drawEdges(model.spatialEdges, false, '#8a8f98')
		if (settings.showBindingEdges) drawEdges(model.bindingEdges, true, '#e6832c')

		// -- Cluster hulls -------------------------------------------------------
		const hullPadding = Math.max(14, px(10))
		for (const cluster of model.clusters) {
			const isHovered = cluster.id === hovered
			const isNeighbor = neighborsOfHovered.has(cluster.id)
			const dimmed = hovered !== null && !isHovered && !isNeighbor
			const fillAlpha = dimmed ? 0.04 : isHovered ? 0.22 : isNeighbor ? 0.15 : 0.09
			const strokeAlpha = dimmed ? 0.1 : isHovered ? 0.6 : isNeighbor ? 0.45 : 0.28

			ctx.save()
			ctx.beginPath()
			this.tracePath(ctx, cluster.hull)
			// A fat, round-joined stroke inflates the hull into a soft blob
			ctx.lineJoin = 'round'
			ctx.lineWidth = hullPadding * 2
			ctx.strokeStyle = clusterColor(cluster.id, strokeAlpha)
			ctx.stroke()
			ctx.fillStyle = clusterColor(cluster.id, fillAlpha)
			ctx.fill()
			ctx.restore()

			// Subcluster hulls: thin dashed outlines inside the parent blob
			if (!dimmed) {
				for (const sub of cluster.subclusters) {
					ctx.save()
					ctx.beginPath()
					this.tracePath(ctx, sub.hull)
					ctx.setLineDash([px(4), px(4)])
					ctx.lineWidth = px(1.25)
					ctx.strokeStyle = clusterColor(cluster.id, 0.8)
					ctx.stroke()
					ctx.restore()
				}
			}
		}

		// -- Centroid nodes ------------------------------------------------------
		for (const cluster of model.clusters) {
			const dimmed =
				hovered !== null && cluster.id !== hovered && !neighborsOfHovered.has(cluster.id)
			const radius = px(11)
			ctx.save()
			ctx.globalAlpha = dimmed ? 0.25 : 1
			ctx.beginPath()
			ctx.arc(cluster.center.x, cluster.center.y, radius, 0, Math.PI * 2)
			ctx.fillStyle = clusterColor(cluster.id, 1)
			ctx.fill()
			ctx.lineWidth = px(2)
			ctx.strokeStyle = 'white'
			ctx.stroke()
			ctx.fillStyle = 'white'
			ctx.font = `700 ${px(11)}px sans-serif`
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText(String(cluster.id), cluster.center.x, cluster.center.y)
			ctx.restore()
		}

		// -- Label pills -----------------------------------------------------------
		if (settings.showLabels) {
			for (const cluster of model.clusters) {
				const dimmed =
					hovered !== null && cluster.id !== hovered && !neighborsOfHovered.has(cluster.id)
				if (dimmed) continue
				this.drawLabelPill(ctx, cluster, hullPadding, zoom)
			}
		}
	}

	override renderMinimap(ctx: CanvasRenderingContext2D, _overlays: TLClusterOverlay[]): void {
		for (const cluster of this.model.get().clusters) {
			ctx.beginPath()
			this.tracePath(ctx, cluster.hull)
			ctx.fillStyle = clusterColor(cluster.id, 0.25)
			ctx.fill()
		}
	}

	private tracePath(ctx: CanvasRenderingContext2D, points: Vec[]) {
		if (points.length === 0) return
		ctx.moveTo(points[0].x, points[0].y)
		for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
		ctx.closePath()
	}

	private drawLabelPill(
		ctx: CanvasRenderingContext2D,
		cluster: ClusterNode,
		hullPadding: number,
		zoom: number
	) {
		const px = (v: number) => v / zoom
		const text = `${cluster.info.label}  ·  ${cluster.info.shapeCount} shapes`
		const fontSize = px(12)
		const padX = px(7)
		const padY = px(4.5)

		ctx.save()
		ctx.font = `600 ${fontSize}px sans-serif`
		const width = ctx.measureText(text).width + padX * 2
		const height = fontSize + padY * 2
		const x = cluster.bounds.minX - hullPadding
		const y = cluster.bounds.minY - hullPadding - height - px(6)

		ctx.beginPath()
		ctx.roundRect(x, y, width, height, height / 2)
		ctx.fillStyle = 'rgb(255 255 255 / 0.92)'
		ctx.fill()
		ctx.lineWidth = px(1.25)
		ctx.strokeStyle = clusterColor(cluster.id, 0.9)
		ctx.stroke()
		ctx.fillStyle = clusterColor(cluster.id, 1)
		ctx.textAlign = 'left'
		ctx.textBaseline = 'middle'
		ctx.fillText(text, x + padX, y + height / 2 + px(0.5))
		ctx.restore()
	}
}
