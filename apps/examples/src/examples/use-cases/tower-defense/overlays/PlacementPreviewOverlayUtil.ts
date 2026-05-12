import { Circle2d, Geometry2d, OverlayUtil, TLCursorType, TLOverlay, createShapeId } from 'tldraw'
import { gold$, placingTower$ } from '../game-state'
import { TOWER_PLACEMENT_SIZE, TOWER_STATS_BY_GEO, TowerGeo, getTowerStats } from '../tower-config'

interface TLPlacementPreviewOverlay extends TLOverlay {
	props: {
		geo: TowerGeo
		x: number
		y: number
		range: number
	}
}

export class PlacementPreviewOverlayUtil extends OverlayUtil<TLPlacementPreviewOverlay> {
	static override type = 'td-placement-preview'
	override options = { zIndex: 150 }

	override isActive(): boolean {
		const placing = placingTower$.get()
		if (!placing) return false
		const stats = TOWER_STATS_BY_GEO[placing]
		return gold$.get() >= stats.cost
	}

	override getOverlays(): TLPlacementPreviewOverlay[] {
		const geo = placingTower$.get()
		if (!geo) return []
		const stats = getTowerStats(geo)
		if (!stats) return []
		const { x, y } = this.editor.inputs.getCurrentPagePoint()
		return [
			{
				id: 'td-placement-preview:main',
				type: 'td-placement-preview',
				props: { geo, x, y, range: stats.range },
			},
		]
	}

	// The preview tracks the cursor, so a click at the cursor always lands inside
	// this circle — that's how we route placement through the overlay system
	// instead of bolting on a capture-phase canvas listener.
	override getGeometry(overlay: TLPlacementPreviewOverlay): Geometry2d {
		const { x, y } = overlay.props
		const r = TOWER_PLACEMENT_SIZE / 2
		return new Circle2d({ x: x - r, y: y - r, radius: r, isFilled: true })
	}

	override getCursor(): TLCursorType {
		return 'cross'
	}

	override onPointerDown(overlay: TLPlacementPreviewOverlay): boolean {
		const { geo, x, y } = overlay.props
		const stats = TOWER_STATS_BY_GEO[geo]
		if (gold$.get() < stats.cost) return true
		this.editor.createShape({
			id: createShapeId(),
			type: 'geo',
			x: x - TOWER_PLACEMENT_SIZE / 2,
			y: y - TOWER_PLACEMENT_SIZE / 2,
			isLocked: true,
			props: { geo, w: TOWER_PLACEMENT_SIZE, h: TOWER_PLACEMENT_SIZE },
		})
		gold$.update((g) => g - stats.cost)
		placingTower$.set(null)
		return true
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLPlacementPreviewOverlay[]): void {
		const overlay = overlays[0]
		if (!overlay) return
		const { geo, x, y, range } = overlay.props
		const zoom = this.editor.getZoomLevel()
		const colors = this.editor.getCurrentTheme().colors[this.editor.getColorMode()]

		ctx.save()

		// Range ring + soft fill.
		ctx.lineWidth = 2 / zoom
		ctx.setLineDash([8 / zoom, 6 / zoom])
		ctx.strokeStyle = colors.selectionStroke
		ctx.fillStyle = colors.selectionFill
		ctx.globalAlpha = 0.35
		ctx.beginPath()
		ctx.arc(x, y, range, 0, Math.PI * 2)
		ctx.fill()
		ctx.globalAlpha = 1
		ctx.stroke()
		ctx.setLineDash([])

		// Ghost shape silhouette at the would-be placement.
		const half = TOWER_PLACEMENT_SIZE / 2
		ctx.globalAlpha = 0.55
		ctx.lineWidth = 2 / zoom
		ctx.strokeStyle = colors.selectionStroke
		ctx.fillStyle = colors.selectionFill

		ctx.beginPath()
		if (geo === 'rectangle') {
			ctx.rect(x - half, y - half, TOWER_PLACEMENT_SIZE, TOWER_PLACEMENT_SIZE)
		} else if (geo === 'ellipse') {
			ctx.ellipse(x, y, half, half, 0, 0, Math.PI * 2)
		} else {
			// Triangle — match how the geo shape renders: top-center, bottom-left, bottom-right.
			ctx.moveTo(x, y - half)
			ctx.lineTo(x + half, y + half)
			ctx.lineTo(x - half, y + half)
			ctx.closePath()
		}
		ctx.fill()
		ctx.stroke()

		ctx.restore()
	}
}
