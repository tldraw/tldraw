import { Circle2d, Geometry2d, OverlayUtil, TLCursorType, TLOverlay } from 'tldraw'
import { ENEMY_CONFIG, EnemyType } from '../enemy-config'
import { applyDamage, elapsedMs$, enemies$ } from '../game-state'
import { getPositionAtDistance } from '../path'

interface TLEnemyOverlay extends TLOverlay {
	props: {
		enemyId: number
		type: EnemyType
		x: number
		y: number
		hp: number
		maxHp: number
		radius: number
		slowed: boolean
	}
}

const CLICK_DAMAGE = 5

export class EnemyOverlayUtil extends OverlayUtil<TLEnemyOverlay> {
	static override type = 'td-enemy'
	override options = { zIndex: 200 }

	override isActive(): boolean {
		return enemies$.get().length > 0
	}

	override getOverlays(): TLEnemyOverlay[] {
		const now = elapsedMs$.get()
		return enemies$.get().map((e) => {
			const pos = getPositionAtDistance(e.distance)
			return {
				id: `td-enemy:${e.id}`,
				type: 'td-enemy',
				props: {
					enemyId: e.id,
					type: e.type,
					x: pos.x,
					y: pos.y,
					hp: e.hp,
					maxHp: e.maxHp,
					radius: e.radius,
					slowed: e.slowedUntilMs > now,
				},
			}
		})
	}

	override getGeometry(overlay: TLEnemyOverlay): Geometry2d {
		const { x, y, radius } = overlay.props
		// Circle2d's x/y is the bounding-box top-left, so center = (x+radius, y+radius).
		return new Circle2d({ x: x - radius, y: y - radius, radius, isFilled: true })
	}

	override getCursor(): TLCursorType {
		return 'cross'
	}

	override onPointerDown(overlay: TLEnemyOverlay): boolean {
		applyDamage(overlay.props.enemyId, CLICK_DAMAGE)
		// Returning truthy keeps the editor from starting a brush/select drag on
		// what is effectively a game click.
		return true
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLEnemyOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		const isDark = this.editor.getColorMode() === 'dark'
		const hoveredId = this.editor.overlays.getHoveredOverlayId()
		for (const overlay of overlays) {
			const { x, y, hp, maxHp, radius, type, slowed } = overlay.props
			const cfg = ENEMY_CONFIG[type]
			const t = Math.max(0, Math.min(1, hp / maxHp))

			ctx.save()
			ctx.beginPath()
			ctx.arc(x, y, radius, 0, Math.PI * 2)
			ctx.fillStyle = cfg.bodyColor
			ctx.fill()
			ctx.lineWidth = 2 / zoom
			ctx.strokeStyle = cfg.ringColor
			ctx.stroke()
			// Inner ring shrinks/dims with HP so wounded enemies read at a glance.
			ctx.beginPath()
			ctx.arc(x, y, radius * 0.55, 0, Math.PI * 2)
			ctx.fillStyle = `rgba(0, 0, 0, ${0.15 + 0.45 * (1 - t)})`
			ctx.fill()

			// Frosty halo when slowed by Magic.
			if (slowed) {
				ctx.beginPath()
				ctx.arc(x, y, radius + 4 / zoom, 0, Math.PI * 2)
				ctx.fillStyle = 'rgba(140, 200, 255, 0.35)'
				ctx.fill()
				ctx.lineWidth = 1.5 / zoom
				ctx.strokeStyle = 'rgba(180, 220, 255, 0.9)'
				ctx.setLineDash([4 / zoom, 3 / zoom])
				ctx.stroke()
				ctx.setLineDash([])
			}

			// HP bar above the enemy.
			const barW = radius * 2
			const barH = 5 / zoom
			const barX = x - radius
			const barY = y - radius - barH - 4 / zoom
			ctx.fillStyle = isDark ? 'rgba(60,60,80,0.85)' : 'rgba(220,220,230,0.9)'
			ctx.fillRect(barX, barY, barW, barH)
			ctx.fillStyle = '#3bce5a'
			ctx.fillRect(barX, barY, barW * t, barH)
			ctx.lineWidth = 1 / zoom
			ctx.strokeStyle = isDark ? '#000' : '#444'
			ctx.strokeRect(barX, barY, barW, barH)

			// HP readout above the bar when this enemy is hovered.
			if (overlay.id === hoveredId) {
				const text = `${cfg.label} · ${Math.max(0, Math.ceil(hp))} / ${maxHp}`
				const fontPx = 12 / zoom
				ctx.font = `600 ${fontPx}px sans-serif`
				ctx.textAlign = 'center'
				ctx.textBaseline = 'bottom'
				const textY = barY - 4 / zoom
				const metrics = ctx.measureText(text)
				const padX = 6 / zoom
				const padY = 3 / zoom
				const boxW = metrics.width + padX * 2
				const boxH = fontPx + padY * 2
				const boxX = x - boxW / 2
				const boxY = textY - boxH + padY
				ctx.fillStyle = isDark ? 'rgba(20,20,28,0.92)' : 'rgba(255,255,255,0.95)'
				ctx.fillRect(boxX, boxY, boxW, boxH)
				ctx.lineWidth = 1 / zoom
				ctx.strokeStyle = isDark ? '#fff' : '#000'
				ctx.strokeRect(boxX, boxY, boxW, boxH)
				ctx.fillStyle = isDark ? '#fff' : '#000'
				ctx.fillText(text, x, textY)
			}

			ctx.restore()
		}
	}
}
