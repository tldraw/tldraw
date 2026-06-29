import {
	Box,
	Circle2d,
	Geometry2d,
	OverlayUtil,
	TLCursorType,
	TLGeoShape,
	TLOverlay,
	TLShapeId,
	computed,
} from 'tldraw'
import { gold$ } from '../game-state'
import { playUpgradeSound } from '../sounds'
import {
	MAX_TOWER_LEVEL,
	getTowerLevel,
	getTowerStats,
	getUpgradeCost,
	levelColor,
} from '../tower-config'

interface TLUpgradeBtnOverlay extends TLOverlay {
	props: {
		shapeId: TLShapeId
		x: number
		y: number
		radius: number
		level: number
		upgradeCost: number
		canAfford: boolean
	}
}

const BTN_RADIUS = 14

interface UpgradeCandidate {
	shapeId: TLShapeId
	cx: number
	cy: number
	bounds: Box
	level: number
	upgradeCost: number
}

export class UpgradeButtonOverlayUtil extends OverlayUtil<TLUpgradeBtnOverlay> {
	static override type = 'td-upgrade-btn'
	override options = { zIndex: 260 }

	// Walk the page shapes once per shape/bounds change. Filtering by pointer
	// happens in getOverlays(), so a mousemove storm only re-runs the cheap
	// pointer filter — not the full shape scan and bounds resolution.
	private _candidates = computed('td-upgrade-btn:candidates', (): UpgradeCandidate[] => {
		const result: UpgradeCandidate[] = []
		for (const shape of this.editor.getCurrentPageShapes()) {
			if (shape.type !== 'geo' || !shape.isLocked) continue
			const stats = getTowerStats((shape as TLGeoShape).props.geo)
			if (!stats) continue
			const level = getTowerLevel(shape)
			if (level >= MAX_TOWER_LEVEL) continue
			const bounds = this.editor.getShapePageBounds(shape.id)
			if (!bounds) continue
			result.push({
				shapeId: shape.id,
				cx: bounds.center.x,
				cy: bounds.center.y,
				bounds,
				level,
				upgradeCost: getUpgradeCost(stats.cost, level),
			})
		}
		return result
	})

	override isActive(): boolean {
		return this._candidates.get().length > 0
	}

	override getOverlays(): TLUpgradeBtnOverlay[] {
		const candidates = this._candidates.get()
		if (candidates.length === 0) return []
		const gold = gold$.get()
		const point = this.editor.inputs.getCurrentPagePoint()
		const result: TLUpgradeBtnOverlay[] = []
		for (const c of candidates) {
			// Show only while the pointer is over the tower or the button itself —
			// the button stays accessible after the cursor moves up onto it.
			const overShape = c.bounds.containsPoint(point)
			const dx = point.x - c.cx
			const dy = point.y - c.cy
			const overButton = dx * dx + dy * dy <= BTN_RADIUS * BTN_RADIUS
			if (!overShape && !overButton) continue
			result.push({
				id: `td-upgrade-btn:${c.shapeId}`,
				type: 'td-upgrade-btn',
				props: {
					shapeId: c.shapeId,
					x: c.cx,
					y: c.cy,
					radius: BTN_RADIUS,
					level: c.level,
					upgradeCost: c.upgradeCost,
					canAfford: gold >= c.upgradeCost,
				},
			})
		}
		return result
	}

	override getGeometry(overlay: TLUpgradeBtnOverlay): Geometry2d {
		const { x, y, radius } = overlay.props
		return new Circle2d({ x: x - radius, y: y - radius, radius, isFilled: true })
	}

	override getCursor(): TLCursorType {
		return 'pointer'
	}

	override onPointerDown(overlay: TLUpgradeBtnOverlay): boolean {
		const { shapeId, upgradeCost, level, canAfford } = overlay.props
		if (!canAfford) return true
		const shape = this.editor.getShape(shapeId)
		if (!shape) return true
		const nextLevel = level + 1
		gold$.update((g) => g - upgradeCost)
		// updateShape silently skips locked shapes unless run with ignoreShapeLock;
		// without this the meta + props don't persist on placed (locked) towers.
		this.editor.run(
			() => {
				this.editor.updateShape({
					id: shapeId,
					type: 'geo',
					meta: { ...shape.meta, towerLevel: nextLevel },
					props: { fill: 'solid', color: levelColor(nextLevel) },
				})
			},
			{ ignoreShapeLock: true }
		)
		playUpgradeSound()
		return true
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLUpgradeBtnOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		const isDark = this.editor.getColorMode() === 'dark'
		for (const overlay of overlays) {
			const { x, y, radius, level, upgradeCost, canAfford } = overlay.props
			ctx.save()
			ctx.beginPath()
			ctx.arc(x, y, radius, 0, Math.PI * 2)
			ctx.fillStyle = canAfford ? '#3aa56a' : isDark ? '#444' : '#aaa'
			ctx.fill()
			ctx.lineWidth = 2 / zoom
			ctx.strokeStyle = isDark ? '#000' : '#222'
			ctx.stroke()

			// Plus sign.
			ctx.lineWidth = 3 / zoom
			ctx.lineCap = 'round'
			ctx.strokeStyle = '#fff'
			const arm = radius * 0.5
			ctx.beginPath()
			ctx.moveTo(x - arm, y)
			ctx.lineTo(x + arm, y)
			ctx.moveTo(x, y - arm)
			ctx.lineTo(x, y + arm)
			ctx.stroke()

			// Cost + level chip below the button.
			const fontPx = 11 / zoom
			ctx.font = `600 ${fontPx}px sans-serif`
			ctx.textAlign = 'center'
			ctx.textBaseline = 'top'
			const text = `L${level}→${level + 1} · ${upgradeCost}g`
			const metrics = ctx.measureText(text)
			const padX = 5 / zoom
			const padY = 2 / zoom
			const boxW = metrics.width + padX * 2
			const boxH = fontPx + padY * 2
			const boxX = x - boxW / 2
			const boxY = y + radius + 3 / zoom
			ctx.fillStyle = isDark ? 'rgba(20,20,28,0.92)' : 'rgba(255,255,255,0.95)'
			ctx.fillRect(boxX, boxY, boxW, boxH)
			ctx.lineWidth = 1 / zoom
			ctx.strokeStyle = isDark ? '#fff' : '#000'
			ctx.strokeRect(boxX, boxY, boxW, boxH)
			ctx.fillStyle = canAfford ? (isDark ? '#fff' : '#000') : isDark ? '#888' : '#888'
			ctx.fillText(text, x, boxY + padY)

			ctx.restore()
		}
	}
}
