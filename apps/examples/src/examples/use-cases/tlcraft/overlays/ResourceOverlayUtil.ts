import {
	Circle2d,
	Geometry2d,
	OverlayUtil,
	TLCursorType,
	TLOverlay,
	TLPointerEventInfo,
} from 'tldraw'
import { commandSelectedUnits } from '../command'
import { isExploredByHuman } from '../fog'
import { ResourceKind, fogVersion$, resources$ } from '../game-state'

interface TLResourceOverlay extends TLOverlay {
	props: {
		resourceId: number
		kind: ResourceKind
		x: number
		y: number
		radius: number
		remaining: number
		startingAmount: number
	}
}

// Trees and gold mines. Right-click these via the global input handler — this
// overlay is purely visual (no onPointerDown). The starting amount is hard-
// coded mirror of the seed in map.ts so we can show a fill ring without
// threading state.
export class ResourceOverlayUtil extends OverlayUtil<TLResourceOverlay> {
	static override type = 'tlc-resource'
	override options = { zIndex: 30 }

	override isActive(): boolean {
		return resources$.get().length > 0
	}

	override getOverlays(): TLResourceOverlay[] {
		void fogVersion$.get()
		return resources$
			.get()
			.filter((r) => r.remaining > 0 && isExploredByHuman(r.x, r.y))
			.map((r) => ({
				id: `tlc-resource:${r.id}`,
				type: 'tlc-resource',
				props: {
					resourceId: r.id,
					kind: r.kind,
					x: r.x,
					y: r.y,
					radius: r.radius,
					remaining: r.remaining,
					startingAmount: r.kind === 'tree' ? 220 : r.kind === 'mine' ? 5000 : 4000,
				},
			}))
	}

	override getGeometry(overlay: TLResourceOverlay): Geometry2d {
		const { x, y, radius } = overlay.props
		return new Circle2d({ x: x - radius, y: y - radius, radius, isFilled: true })
	}

	override getCursor(): TLCursorType {
		return 'pointer'
	}

	override onPointerDown(overlay: TLResourceOverlay, info: TLPointerEventInfo): boolean {
		// Only left-click reaches us — right-clicks come through the contextmenu
		// listener. Left-click a resource = gather (shorthand for select+command).
		if (info.button !== 0) return false
		const { x, y } = overlay.props
		commandSelectedUnits(this.editor, { x, y })
		return true
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLResourceOverlay[]): void {
		const zoom = this.editor.getZoomLevel()
		for (const o of overlays) {
			const { kind, x, y, radius, remaining, startingAmount } = o.props
			if (remaining <= 0) continue
			ctx.save()
			if (kind === 'tree') {
				// Trunk.
				ctx.fillStyle = '#5a3a1c'
				ctx.fillRect(x - 3, y + radius * 0.4, 6, radius * 0.6)
				// Foliage.
				ctx.beginPath()
				ctx.arc(x, y, radius, 0, Math.PI * 2)
				ctx.fillStyle = '#2d6a31'
				ctx.fill()
				ctx.lineWidth = 2 / zoom
				ctx.strokeStyle = '#1c3f1f'
				ctx.stroke()
				// Inner highlight scales with how much wood is left.
				const t = Math.max(0, Math.min(1, remaining / startingAmount))
				ctx.beginPath()
				ctx.arc(x - radius * 0.25, y - radius * 0.25, radius * 0.4 * t, 0, Math.PI * 2)
				ctx.fillStyle = 'rgba(120, 180, 110, 0.7)'
				ctx.fill()
			} else if (kind === 'mine') {
				// Gold mine: cluster of yellow nuggets.
				ctx.beginPath()
				ctx.arc(x, y, radius, 0, Math.PI * 2)
				ctx.fillStyle = '#7a6a40'
				ctx.fill()
				ctx.lineWidth = 2 / zoom
				ctx.strokeStyle = '#3a2f10'
				ctx.stroke()
				const nuggets = [
					{ ox: -8, oy: -6, r: 6 },
					{ ox: 8, oy: -2, r: 7 },
					{ ox: -2, oy: 10, r: 8 },
					{ ox: 12, oy: 8, r: 5 },
				]
				const t = Math.max(0, Math.min(1, remaining / startingAmount))
				for (const n of nuggets) {
					ctx.beginPath()
					ctx.arc(x + n.ox, y + n.oy, n.r, 0, Math.PI * 2)
					ctx.fillStyle = `rgba(255, 207, 64, ${0.4 + 0.6 * t})`
					ctx.fill()
					ctx.lineWidth = 1 / zoom
					ctx.strokeStyle = '#664a10'
					ctx.stroke()
				}
			} else {
				// Stone quarry: cluster of grey rocks.
				ctx.beginPath()
				ctx.arc(x, y, radius, 0, Math.PI * 2)
				ctx.fillStyle = '#5a5e66'
				ctx.fill()
				ctx.lineWidth = 2 / zoom
				ctx.strokeStyle = '#1f242b'
				ctx.stroke()
				const rocks = [
					{ ox: -10, oy: -4, r: 7 },
					{ ox: 6, oy: -8, r: 6 },
					{ ox: 0, oy: 8, r: 8 },
					{ ox: 12, oy: 4, r: 5 },
				]
				const t = Math.max(0, Math.min(1, remaining / startingAmount))
				for (const n of rocks) {
					ctx.beginPath()
					ctx.arc(x + n.ox, y + n.oy, n.r, 0, Math.PI * 2)
					ctx.fillStyle = `rgba(180, 184, 192, ${0.45 + 0.55 * t})`
					ctx.fill()
					ctx.lineWidth = 1 / zoom
					ctx.strokeStyle = '#2a2e36'
					ctx.stroke()
				}
			}

			// Remaining label below.
			const fontPx = 11 / zoom
			ctx.font = `600 ${fontPx}px sans-serif`
			ctx.textAlign = 'center'
			ctx.textBaseline = 'top'
			ctx.fillStyle = '#fff'
			ctx.strokeStyle = '#000'
			ctx.lineWidth = 3 / zoom
			const icon = kind === 'tree' ? '🌲' : kind === 'mine' ? '⛏' : '🪨'
			const text = `${icon} ${Math.max(0, Math.ceil(remaining))}`
			const ty = y + radius + 4 / zoom
			ctx.strokeText(text, x, ty)
			ctx.fillText(text, x, ty)
			ctx.restore()
		}
	}

	override renderMinimap(ctx: CanvasRenderingContext2D, overlays: TLResourceOverlay[]): void {
		// Trees / mines as faint dots so the player sees economy hot-spots from
		// the minimap without them dominating the view.
		for (const o of overlays) {
			const { kind, x, y } = o.props
			ctx.beginPath()
			ctx.arc(x, y, 6, 0, Math.PI * 2)
			ctx.fillStyle =
				kind === 'tree'
					? 'rgba(45, 106, 49, 0.6)'
					: kind === 'mine'
						? 'rgba(255, 207, 64, 0.7)'
						: 'rgba(180, 184, 192, 0.7)'
			ctx.fill()
		}
	}
}
