import {
	Geometry2d,
	OverlayUtil,
	Rectangle2d,
	TLCursorType,
	TLOverlay,
	TLPointerEventInfo,
} from 'tldraw'
import { PlaceBuildingOutcome, checkPlacement, placeBuilding } from '../building-actions'
import { BUILDING_CONFIG, BuildingKind } from '../building-config'
import { fogVersion$, placingBuilding$ } from '../game-state'
import { HUMAN_PLAYER_ID } from '../players'

interface TLPlacementPreviewOverlay extends TLOverlay {
	props: {
		kind: BuildingKind
		x: number
		y: number
		size: number
		outcome: PlaceBuildingOutcome
	}
}

export class PlacementPreviewOverlayUtil extends OverlayUtil<TLPlacementPreviewOverlay> {
	static override type = 'tlc-placement-preview'
	override options = { zIndex: 700 }

	override isActive(): boolean {
		return placingBuilding$.get() !== null
	}

	override getOverlays(): TLPlacementPreviewOverlay[] {
		const kind = placingBuilding$.get()
		if (!kind) return []
		const cfg = BUILDING_CONFIG[kind]
		const { x, y } = this.editor.inputs.getCurrentPagePoint()
		// Touch fogVersion so the preview re-evaluates as the territory grid
		// updates (e.g. you finish a building that extends your border).
		void fogVersion$.get()
		const outcome = checkPlacement(this.editor, kind, HUMAN_PLAYER_ID, x, y)
		return [
			{
				id: 'tlc-placement-preview:main',
				type: 'tlc-placement-preview',
				props: { kind, x, y, size: cfg.size, outcome },
			},
		]
	}

	override getGeometry(overlay: TLPlacementPreviewOverlay): Geometry2d {
		const { x, y, size } = overlay.props
		return new Rectangle2d({
			x: x - size / 2,
			y: y - size / 2,
			width: size,
			height: size,
			isFilled: true,
		})
	}

	override getCursor(): TLCursorType {
		return 'cross'
	}

	override onPointerDown(overlay: TLPlacementPreviewOverlay, info: TLPointerEventInfo): boolean {
		if (info.button !== 0) return false
		const { kind, x, y, outcome } = overlay.props
		if (outcome !== 'ok') return true
		const id = placeBuilding(this.editor, kind, HUMAN_PLAYER_ID, x, y)
		// Barriers (walls + gates) stay armed across pointer events so the
		// player can chain them by drag-to-extend (see WallDragListener) or
		// click many in a row. Other buildings disarm after one placement.
		if (id && kind !== 'wall' && kind !== 'gate') placingBuilding$.set(null)
		return true
	}

	override render(ctx: CanvasRenderingContext2D, overlays: TLPlacementPreviewOverlay[]): void {
		const o = overlays[0]
		if (!o) return
		const { x, y, size, outcome, kind } = o.props
		const cfg = BUILDING_CONFIG[kind]
		const half = size / 2
		const zoom = this.editor.getZoomLevel()
		const ok = outcome === 'ok'
		ctx.save()
		ctx.globalAlpha = 0.5
		if (cfg.geo === 'triangle') {
			ctx.beginPath()
			ctx.moveTo(x, y - half)
			ctx.lineTo(x + half, y + half)
			ctx.lineTo(x - half, y + half)
			ctx.closePath()
		} else {
			ctx.beginPath()
			ctx.rect(x - half, y - half, size, size)
		}
		ctx.fillStyle = ok ? '#3b82f6' : '#ef4444'
		ctx.fill()
		ctx.lineWidth = 2 / zoom
		ctx.strokeStyle = ok ? '#1e40af' : '#7f1d1d'
		ctx.stroke()
		ctx.globalAlpha = 1

		ctx.font = `600 ${12 / zoom}px sans-serif`
		ctx.textAlign = 'center'
		ctx.textBaseline = 'top'
		ctx.fillStyle = '#fff'
		ctx.strokeStyle = '#000'
		ctx.lineWidth = 3 / zoom
		const hint = hintFor(outcome, cfg.label.toLowerCase(), cfg.cost, kind)
		const ty = y + half + 8 / zoom
		ctx.strokeText(hint, x, ty)
		ctx.fillText(hint, x, ty)
		ctx.restore()
	}
}

function hintFor(
	outcome: PlaceBuildingOutcome,
	label: string,
	cost: { gold: number; wood: number },
	kind: BuildingKind
): string {
	switch (outcome) {
		case 'ok':
			if (kind === 'wall' || kind === 'gate') {
				return `Click or drag to place ${label}s — Esc / right-click to exit`
			}
			return `Click to place ${label}`
		case 'cant-afford':
			return `Need ${cost.gold}g · ${cost.wood}w`
		case 'overlap':
			return 'Too close to another building'
		case 'out-of-bounds':
			return 'Outside the map'
		case 'outside-territory':
			return 'Outside your territory'
		case 'outside-town':
			return 'Must be inside one of your towns'
		case 'requires-tech':
			return 'Locked — research at the Library first'
		case 'wrong-age':
			return 'Locked — advance to the next age first'
	}
}
