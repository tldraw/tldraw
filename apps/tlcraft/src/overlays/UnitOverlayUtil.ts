import {
	Circle2d,
	Geometry2d,
	OverlayUtil,
	TLCursorType,
	TLOverlay,
	TLPointerEventInfo,
} from 'tldraw'
import { commandSelectedUnits, selectSingleUnit } from '../command'
import { isVisibleToHuman } from '../fog'
import { elapsedMs$, fogVersion$, selectedUnitIds$, units$ } from '../game-state'
import { HUMAN_PLAYER_ID, PlayerId, getPlayer } from '../players'
import { UNIT_CONFIG, UnitKind } from '../unit-config'

interface TLUnitOverlay extends TLOverlay {
	props: {
		unitId: number
		kind: UnitKind
		owner: PlayerId
		x: number
		y: number
		hp: number
		maxHp: number
		flashing: boolean
		selected: boolean
		carryingResource: 'wood' | 'gold' | 'stone' | null
		// True while the worker is "inside" a resource node mid-gather. We still
		// render them (low opacity) so the player can see they exist (and watch
		// HP bars when wounded), but we skip geometry so they're not clickable
		// through the resource sprite.
		inResource: boolean
	}
}

export class UnitOverlayUtil extends OverlayUtil<TLUnitOverlay> {
	static override type = 'tlc-unit'
	override options = { zIndex: 200 }

	override isActive(): boolean {
		return units$.get().length > 0
	}

	override getOverlays(): TLUnitOverlay[] {
		const now = elapsedMs$.get()
		const selectedIds = selectedUnitIds$.get()
		// Touch fogVersion so this overlay re-evaluates whenever fog changes
		// (enemies stepping into / out of vision should appear / disappear).
		void fogVersion$.get()
		const out: TLUnitOverlay[] = []
		for (const u of units$.get()) {
			const inResource = u.gatherUntilMs > now
			// Hide enemy units in fogged cells. Friendly units always render.
			if (u.owner !== HUMAN_PLAYER_ID && !isVisibleToHuman(u.x, u.y)) continue
			out.push({
				id: `tlc-unit:${u.id}`,
				type: 'tlc-unit',
				props: {
					unitId: u.id,
					kind: u.kind,
					owner: u.owner,
					x: u.x,
					y: u.y,
					hp: u.hp,
					// Use the unit's stored maxHp so Heavy Armor units render
					// the right HP bar fullness.
					maxHp: u.maxHp,
					flashing: u.hitFlashUntilMs > now,
					selected: selectedIds.has(u.id),
					carryingResource: u.carrying?.resource ?? null,
					inResource,
				},
			})
		}
		return out
	}

	override getGeometry(overlay: TLUnitOverlay): Geometry2d | null {
		// Workers mid-gather render visually but aren't clickable — clicks should
		// pass through to the underlying resource node so right-click-to-gather
		// keeps working.
		if (overlay.props.inResource) return null
		const { kind, x, y } = overlay.props
		const r = UNIT_CONFIG[kind].radius
		return new Circle2d({ x: x - r, y: y - r, radius: r, isFilled: true })
	}

	override getCursor(overlay: TLUnitOverlay): TLCursorType {
		return overlay.props.owner === HUMAN_PLAYER_ID ? 'pointer' : 'cross'
	}

	override onPointerDown(overlay: TLUnitOverlay, info: TLPointerEventInfo): boolean {
		// Only left-click reaches overlay onPointerDown — right-clicks come
		// through the contextmenu listener. Left-click on a friendly unit selects
		// it; left-click on an enemy unit attacks if any human units are selected.
		if (info.button !== 0) return false
		const { unitId, owner, x, y } = overlay.props
		if (owner === HUMAN_PLAYER_ID) {
			selectSingleUnit(unitId, info.shiftKey)
		} else if (selectedUnitIds$.get().size > 0) {
			commandSelectedUnits(this.editor, { x, y })
		}
		return true
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLUnitOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		for (const o of overlays) {
			const { kind, x, y, hp, maxHp, flashing, selected, carryingResource, owner, inResource } =
				o.props
			const cfg = UNIT_CONFIG[kind]
			const player = getPlayer(owner)
			const t = Math.max(0, Math.min(1, hp / maxHp))

			ctx.save()
			// Gathering workers render dimmed at the resource centre so the
			// player can see them being attacked instead of vanishing into the
			// tree/mine. Reduces a visual gap that made workers feel invincible.
			if (inResource) ctx.globalAlpha = 0.45
			if (selected) {
				ctx.beginPath()
				ctx.arc(x, y + cfg.radius * 0.5, cfg.radius + 4 / zoom, 0, Math.PI)
				ctx.strokeStyle = '#22c55e'
				ctx.lineWidth = 3 / zoom
				ctx.stroke()
			}

			// Body.
			ctx.beginPath()
			ctx.arc(x, y, cfg.radius, 0, Math.PI * 2)
			ctx.fillStyle = flashing ? '#fff' : player.bodyColor
			ctx.fill()
			ctx.lineWidth = 2 / zoom
			ctx.strokeStyle = player.ringColor
			ctx.stroke()

			// Kind glyph: simple letter on body.
			ctx.fillStyle = '#fff'
			ctx.font = `700 ${cfg.radius}px sans-serif`
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText(glyphFor(kind), x, y + cfg.radius * 0.18)

			// Carrying icon to the side.
			if (carryingResource) {
				ctx.font = `600 ${cfg.radius * 1.1}px sans-serif`
				ctx.textAlign = 'center'
				ctx.textBaseline = 'middle'
				ctx.fillText(
					carryingResource === 'wood' ? '🪵' : carryingResource === 'gold' ? '🪙' : '🪨',
					x + cfg.radius + 4 / zoom,
					y - cfg.radius
				)
			}

			// HP bar above. Workers always show theirs so it's obvious when they
			// take damage (gathering workers were previously invisible — the bar
			// is the strongest "they're being attacked" cue we have). Other units
			// only show theirs when wounded to reduce visual noise.
			const showBar = hp < maxHp || kind === 'worker'
			if (showBar) {
				const barW = cfg.radius * 2
				const barH = 4 / zoom
				const barX = x - cfg.radius
				const barY = y - cfg.radius - barH - 3 / zoom
				ctx.fillStyle = 'rgba(0,0,0,0.5)'
				ctx.fillRect(barX, barY, barW, barH)
				ctx.fillStyle = owner === HUMAN_PLAYER_ID ? '#22c55e' : '#ef4444'
				ctx.fillRect(barX, barY, barW * t, barH)
				ctx.lineWidth = 1 / zoom
				ctx.strokeStyle = '#000'
				ctx.strokeRect(barX, barY, barW, barH)
			}

			ctx.restore()
		}
	}

	override renderMinimap(
		ctx: CanvasRenderingContext2D,
		overlays: TLUnitOverlay[],
		zoom: number
	): void {
		// Each unit becomes a small filled dot at its page position. zoom is
		// minimap pixels-per-page-unit; the multiplier on the dot keeps a unit
		// readable across map sizes.
		const dotRadius = Math.max(2 / zoom, 1.5)
		for (const o of overlays) {
			const { x, y, owner } = o.props
			const player = getPlayer(owner)
			ctx.beginPath()
			ctx.arc(x, y, dotRadius * 2, 0, Math.PI * 2)
			ctx.fillStyle = player.minimapColor
			ctx.fill()
		}
	}
}

function glyphFor(kind: UnitKind): string {
	return UNIT_CONFIG[kind].glyph
}
