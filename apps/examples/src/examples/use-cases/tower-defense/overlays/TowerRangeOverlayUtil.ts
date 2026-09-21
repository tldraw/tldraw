import { computed, OverlayUtil, TLGeoShape, TLOverlay } from 'tldraw'
import { getScaledStats, getTowerLevel, getTowerStats } from '../tower-config'

interface TLTowerRangeOverlay extends TLOverlay {
	props: {
		shapeId: string
		cx: number
		cy: number
		range: number
	}
}

export class TowerRangeOverlayUtil extends OverlayUtil<TLTowerRangeOverlay> {
	static override type = 'td-tower-range'
	override options = { zIndex: 100 }

	// Not `editor.getHoveredShape()`: unfilled geo shapes are hollow to hit-testing, so hovering
	// their interior wouldn't count. Checking bounds directly also lets the range show for
	// locked shapes. Memoised so isActive() and getOverlays() share one walk per tick.
	private _hoveredTowers = computed('td-tower-range:hovered', (): TLTowerRangeOverlay[] => {
		const point = this.editor.inputs.getCurrentPagePoint()
		const result: TLTowerRangeOverlay[] = []
		for (const shape of this.editor.getCurrentPageShapes()) {
			if (shape.type !== 'geo') continue
			const baseStats = getTowerStats((shape as TLGeoShape).props.geo)
			if (!baseStats) continue
			const stats = getScaledStats(baseStats, getTowerLevel(shape))
			const bounds = this.editor.getShapePageBounds(shape.id)
			if (!bounds) continue
			// Placed towers are locked and only show range on hover; an unlocked tower shape
			// (e.g. one being drawn by hand) always shows it
			const isPlacing = !shape.isLocked
			if (!isPlacing && !bounds.containsPoint(point)) continue
			result.push({
				id: `td-tower-range:${shape.id}`,
				type: 'td-tower-range',
				props: {
					shapeId: shape.id,
					cx: bounds.center.x,
					cy: bounds.center.y,
					range: stats.range,
				},
			})
		}
		return result
	})

	override isActive(): boolean {
		return this._hoveredTowers.get().length > 0
	}

	override getOverlays(): TLTowerRangeOverlay[] {
		return this._hoveredTowers.get()
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLTowerRangeOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		const colors = this.editor.getCurrentTheme().colors[this.editor.getColorMode()]

		ctx.save()
		ctx.lineWidth = 2 / zoom
		ctx.setLineDash([8 / zoom, 6 / zoom])
		ctx.strokeStyle = colors.selectionStroke
		ctx.fillStyle = colors.selectionFill
		for (const overlay of overlays) {
			const { cx, cy, range } = overlay.props
			ctx.globalAlpha = 0.4
			ctx.beginPath()
			ctx.arc(cx, cy, range, 0, Math.PI * 2)
			ctx.fill()
			ctx.globalAlpha = 1
			ctx.stroke()
		}
		ctx.restore()
	}
}
