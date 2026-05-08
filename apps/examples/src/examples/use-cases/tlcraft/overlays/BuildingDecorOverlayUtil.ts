import {
	Geometry2d,
	OverlayUtil,
	Rectangle2d,
	TLCursorType,
	TLOverlay,
	TLPointerEventInfo,
	TLShapeId,
	computed,
} from 'tldraw'
import {
	BUILDING_CONFIG,
	BuildingKind,
	getBuildingHp,
	getBuildingKind,
	getBuildingMaxHp,
	getBuildingOwner,
	getBuildingTownName,
	getBuildingUpgradeLevel,
	getEffectiveLabel,
} from '../building-config'

function roundRectPath(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number
) {
	const radius = Math.min(r, w / 2, h / 2)
	ctx.beginPath()
	ctx.moveTo(x + radius, y)
	ctx.lineTo(x + w - radius, y)
	ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
	ctx.lineTo(x + w, y + h - radius)
	ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
	ctx.lineTo(x + radius, y + h)
	ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
	ctx.lineTo(x, y + radius)
	ctx.quadraticCurveTo(x, y, x + radius, y)
	ctx.closePath()
}
import { clearUnitSelection } from '../command'
import { isExploredByHuman } from '../fog'
import {
	elapsedMs$,
	fogVersion$,
	researchQueuesAtom$,
	selectedBuildingId$,
	trainQueuesAtom$,
	upgradeQueuesAtom$,
} from '../game-state'
import { HUMAN_PLAYER_ID, PlayerId, getPlayer } from '../players'
import { TECH_CONFIG, TechId } from '../tech-config'

interface TLBuildingDecorOverlay extends TLOverlay {
	props: {
		shapeId: TLShapeId
		cx: number
		cy: number
		halfSize: number
		kind: BuildingKind
		owner: PlayerId
		level: number
		hp: number
		maxHp: number
		townName: string | null
		queueProgress: number
		queueLength: number
		researchProgress: number
		researchLabel: string | null
		upgradeProgress: number
		upgradeLabel: string | null
	}
}

export class BuildingDecorOverlayUtil extends OverlayUtil<TLBuildingDecorOverlay> {
	static override type = 'tlc-building-decor'
	override options = { zIndex: 100 }

	private _candidates = computed('tlc-building-decor:candidates', () => {
		const out: Array<{
			shapeId: TLShapeId
			cx: number
			cy: number
			halfSize: number
			kind: BuildingKind
			owner: PlayerId
			level: number
			hp: number
			maxHp: number
			townName: string | null
		}> = []
		for (const shape of this.editor.getCurrentPageShapes()) {
			const kind = getBuildingKind(shape)
			if (!kind) continue
			const owner = getBuildingOwner(shape)
			if (!owner) continue
			const cfg = BUILDING_CONFIG[kind]
			const bounds = this.editor.getShapePageBounds(shape.id)
			if (!bounds) continue
			const maxHp = getBuildingMaxHp(shape) || cfg.maxHp
			out.push({
				shapeId: shape.id,
				cx: bounds.center.x,
				cy: bounds.center.y,
				halfSize: cfg.size / 2,
				kind,
				owner,
				level: getBuildingUpgradeLevel(shape),
				hp: getBuildingHp(shape),
				maxHp,
				townName: kind === 'town-hall' ? getBuildingTownName(shape) : null,
			})
		}
		return out
	})

	override isActive(): boolean {
		return this._candidates.get().length > 0
	}

	override getGeometry(overlay: TLBuildingDecorOverlay): Geometry2d {
		const { cx, cy, halfSize } = overlay.props
		return new Rectangle2d({
			x: cx - halfSize,
			y: cy - halfSize,
			width: halfSize * 2,
			height: halfSize * 2,
			isFilled: true,
		})
	}

	override getCursor(): TLCursorType {
		return 'pointer'
	}

	override onPointerDown(overlay: TLBuildingDecorOverlay, info: TLPointerEventInfo): boolean {
		if (info.button !== 0) return false
		const { shapeId, owner } = overlay.props
		// Only the human's own buildings are selectable for the train UI;
		// clicking an enemy building does nothing (right-click attacks).
		if (owner !== HUMAN_PLAYER_ID) return true
		clearUnitSelection()
		selectedBuildingId$.set(shapeId)
		return true
	}

	override getOverlays(): TLBuildingDecorOverlay[] {
		const queues = trainQueuesAtom$.get()
		const research = researchQueuesAtom$.get()
		const upgrades = upgradeQueuesAtom$.get()
		const now = elapsedMs$.get()
		void fogVersion$.get()
		return this._candidates
			.get()
			.filter((c) => {
				if (c.owner === HUMAN_PLAYER_ID) return true
				return isExploredByHuman(c.cx, c.cy)
			})
			.map((c) => {
				const queue = queues[c.shapeId as unknown as string] ?? []
				const head = queue[0]
				const queueProgress = head ? Math.min(1, (now - head.startedAtMs) / head.durationMs) : 0
				const rQueue = research[c.shapeId as unknown as string] ?? []
				const rHead = rQueue[0]
				const researchProgress = rHead
					? Math.min(1, (now - rHead.startedAtMs) / rHead.durationMs)
					: 0
				const researchLabel = rHead ? TECH_CONFIG[rHead.techId as TechId].label : null
				const upgradeItem = upgrades[c.shapeId as unknown as string] ?? null
				const upgradeProgress = upgradeItem
					? Math.min(1, (now - upgradeItem.startedAtMs) / upgradeItem.durationMs)
					: 0
				const upgradeCfg = BUILDING_CONFIG[c.kind].upgrade
				const upgradeLabel = upgradeItem && upgradeCfg ? upgradeCfg.label : null
				return {
					id: `tlc-building-decor:${c.shapeId}`,
					type: 'tlc-building-decor',
					props: {
						...c,
						queueProgress,
						queueLength: queue.length,
						researchProgress,
						researchLabel,
						upgradeProgress,
						upgradeLabel,
					},
				}
			})
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLBuildingDecorOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		const isDark = this.editor.getColorMode() === 'dark'
		for (const o of overlays) {
			const {
				cx,
				cy,
				halfSize,
				kind,
				owner,
				level,
				hp,
				maxHp,
				townName,
				queueProgress,
				queueLength,
				researchProgress,
				researchLabel,
				upgradeProgress,
				upgradeLabel,
			} = o.props
			const player = getPlayer(owner)
			ctx.save()
			// HP bar above the building (only when wounded).
			if (hp > 0 && hp < maxHp) {
				const barW = halfSize * 2
				const barH = 6 / zoom
				const barX = cx - halfSize
				const barY = cy - halfSize - barH - 6 / zoom
				const t = Math.max(0, Math.min(1, hp / maxHp))
				ctx.fillStyle = isDark ? 'rgba(60,60,80,0.85)' : 'rgba(220,220,230,0.95)'
				ctx.fillRect(barX, barY, barW, barH)
				ctx.fillStyle = owner === HUMAN_PLAYER_ID ? '#22c55e' : '#ef4444'
				ctx.fillRect(barX, barY, barW * t, barH)
				ctx.lineWidth = 1 / zoom
				ctx.strokeStyle = isDark ? '#000' : '#444'
				ctx.strokeRect(barX, barY, barW, barH)
			}

			// Building label rendered as a solid rounded chip below the
			// building. Stroked text smudges at small sizes and was reading
			// as two overlapping labels for compound names like
			// "Glacierford · Town hall"; a chip is unambiguous.
			const fontPx = 11 / zoom
			ctx.font = `700 ${fontPx}px sans-serif`
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			const baseLabel = getEffectiveLabel(kind, level)
			let label: string
			if (kind === 'town-hall' && townName) {
				label =
					owner === HUMAN_PLAYER_ID ? `${townName} · ${baseLabel}` : `${player.label}: ${townName}`
			} else if (owner === HUMAN_PLAYER_ID) {
				label = baseLabel
			} else {
				label = `${player.label} · ${baseLabel}`
			}
			const metrics = ctx.measureText(label)
			const padX = 6 / zoom
			const padY = 3 / zoom
			const chipW = metrics.width + padX * 2
			const chipH = fontPx + padY * 2
			const chipX = cx - chipW / 2
			const chipY = cy + halfSize + 8 / zoom
			roundRectPath(ctx, chipX, chipY, chipW, chipH, 4 / zoom)
			ctx.fillStyle = isDark ? 'rgba(20,22,28,0.9)' : 'rgba(255,255,255,0.92)'
			ctx.fill()
			ctx.lineWidth = 1 / zoom
			ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'
			ctx.stroke()
			ctx.fillStyle = isDark ? '#fff' : '#111'
			ctx.fillText(label, cx, chipY + chipH / 2)
			// Level badge in the top-left corner of the building footprint.
			if (level > 0) {
				const badgeR = 9 / zoom
				const bx = cx - halfSize + badgeR + 2 / zoom
				const by = cy - halfSize + badgeR + 2 / zoom
				ctx.beginPath()
				ctx.arc(bx, by, badgeR, 0, Math.PI * 2)
				ctx.fillStyle = '#facc15'
				ctx.fill()
				ctx.lineWidth = 1.5 / zoom
				ctx.strokeStyle = '#000'
				ctx.stroke()
				ctx.fillStyle = '#000'
				ctx.font = `800 ${11 / zoom}px sans-serif`
				ctx.textAlign = 'center'
				ctx.textBaseline = 'middle'
				ctx.fillText('II', bx, by)
			}

			// Upgrade progress: an orange arc one ring out from the training arc
			// + the upgrade label above the building.
			if (upgradeLabel) {
				const radius = halfSize + 22 / zoom
				ctx.beginPath()
				ctx.arc(cx, cy, radius, 0, Math.PI * 2)
				ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'
				ctx.lineWidth = 4 / zoom
				ctx.stroke()
				ctx.beginPath()
				ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * upgradeProgress)
				ctx.strokeStyle = '#f97316'
				ctx.lineWidth = 4 / zoom
				ctx.stroke()
				const fp = 10 / zoom
				ctx.font = `600 ${fp}px sans-serif`
				ctx.textAlign = 'center'
				ctx.textBaseline = 'bottom'
				ctx.fillStyle = '#f97316'
				ctx.strokeStyle = '#000'
				ctx.lineWidth = 3 / zoom
				const ty = cy - halfSize - 38 / zoom
				ctx.strokeText(`▲ ${upgradeLabel}`, cx, ty)
				ctx.fillText(`▲ ${upgradeLabel}`, cx, ty)
			}

			// Research progress: a second arc just inside the training arc, plus
			// the tech name above the building when something's underway.
			if (researchLabel) {
				const radius = halfSize + 8 / zoom
				ctx.beginPath()
				ctx.arc(cx, cy, radius, 0, Math.PI * 2)
				ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'
				ctx.lineWidth = 3 / zoom
				ctx.stroke()
				ctx.beginPath()
				ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * researchProgress)
				ctx.strokeStyle = '#facc15'
				ctx.lineWidth = 3 / zoom
				ctx.stroke()
				const fp = 10 / zoom
				ctx.font = `600 ${fp}px sans-serif`
				ctx.textAlign = 'center'
				ctx.textBaseline = 'bottom'
				ctx.fillStyle = '#facc15'
				ctx.strokeStyle = '#000'
				ctx.lineWidth = 3 / zoom
				const ty = cy - halfSize - 24 / zoom
				ctx.strokeText(`⚒ ${researchLabel}`, cx, ty)
				ctx.fillText(`⚒ ${researchLabel}`, cx, ty)
			}

			// Training queue progress arc.
			if (queueLength > 0) {
				const radius = halfSize + 14 / zoom
				ctx.beginPath()
				ctx.arc(cx, cy, radius, 0, Math.PI * 2)
				ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'
				ctx.lineWidth = 4 / zoom
				ctx.stroke()
				ctx.beginPath()
				ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * queueProgress)
				ctx.strokeStyle = player.minimapColor
				ctx.lineWidth = 4 / zoom
				ctx.stroke()
				if (queueLength > 1) {
					const chipFont = 10 / zoom
					ctx.font = `700 ${chipFont}px sans-serif`
					ctx.fillStyle = '#fff'
					ctx.strokeStyle = player.ringColor
					ctx.lineWidth = 3 / zoom
					const chipText = `+${queueLength - 1}`
					const chipX = cx + radius + 6 / zoom
					const chipY = cy - radius - 2 / zoom
					ctx.strokeText(chipText, chipX, chipY)
					ctx.fillText(chipText, chipX, chipY)
				}
			}
			ctx.restore()
		}
	}

	override renderMinimap(ctx: CanvasRenderingContext2D, overlays: TLBuildingDecorOverlay[]): void {
		// Buildings draw as filled squares of their owner's colour, sized by
		// the building's footprint so town halls feel weightier than towers.
		for (const o of overlays) {
			const { cx, cy, halfSize, owner } = o.props
			const player = getPlayer(owner)
			ctx.fillStyle = player.minimapColor
			ctx.fillRect(cx - halfSize, cy - halfSize, halfSize * 2, halfSize * 2)
		}
	}
}
