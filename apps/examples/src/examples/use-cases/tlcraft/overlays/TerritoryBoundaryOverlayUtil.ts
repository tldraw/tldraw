import { OverlayUtil, TLOverlay } from 'tldraw'
import {
	BUILDING_CONFIG,
	getBuildingHp,
	getBuildingKind,
	getBuildingOwner,
	getBuildingUpgradeLevel,
	getEffectiveTerritoryRadius,
} from '../building-config'
import { CELL_SIZE, COLS, ROWS, territoryGrid } from '../fog'
import { fogVersion$ } from '../game-state'
import { MAP_BOUNDS } from '../map'
import { HUMAN_PLAYER_ID, getPlayer } from '../players'

interface TLTerritoryBoundaryOverlay extends TLOverlay {
	props: { version: number }
}

// Draws a soft boundary around the human player's territory so the player
// knows where they can build. The boundary is the set of cells inside the
// territory grid that have at least one neighbour outside the grid.
export class TerritoryBoundaryOverlayUtil extends OverlayUtil<TLTerritoryBoundaryOverlay> {
	// Above buildings/units (so the dashed line reads on top) but below fog,
	// so the line is hidden beyond explored areas.
	static override type = 'tlc-territory'
	override options = { zIndex: 280 }

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLTerritoryBoundaryOverlay[] {
		return [
			{
				id: 'tlc-territory:main',
				type: 'tlc-territory',
				props: { version: fogVersion$.get() },
			},
		]
	}

	override render(ctx: CanvasRenderingContext2D): void {
		const human = getPlayer(HUMAN_PLAYER_ID)
		const zoom = this.editor.getZoomLevel()
		ctx.save()
		// Faint fill across the territory.
		ctx.fillStyle = `${human.minimapColor}10`
		for (let row = 0; row < ROWS; row++) {
			const yPx = MAP_BOUNDS.minY + row * CELL_SIZE
			const rowOffset = row * COLS
			for (let col = 0; col < COLS; col++) {
				if (territoryGrid[rowOffset + col] !== 1) continue
				ctx.fillRect(MAP_BOUNDS.minX + col * CELL_SIZE, yPx, CELL_SIZE, CELL_SIZE)
			}
		}
		// Boundary stroke: walk territory cells, draw an edge for each side
		// whose neighbour is not in the territory.
		ctx.strokeStyle = human.minimapColor
		ctx.lineWidth = 1.5 / zoom
		ctx.setLineDash([6 / zoom, 4 / zoom])
		ctx.beginPath()
		for (let row = 0; row < ROWS; row++) {
			for (let col = 0; col < COLS; col++) {
				if (territoryGrid[row * COLS + col] !== 1) continue
				const x = MAP_BOUNDS.minX + col * CELL_SIZE
				const y = MAP_BOUNDS.minY + row * CELL_SIZE
				if (col === 0 || territoryGrid[row * COLS + col - 1] !== 1) {
					ctx.moveTo(x, y)
					ctx.lineTo(x, y + CELL_SIZE)
				}
				if (col === COLS - 1 || territoryGrid[row * COLS + col + 1] !== 1) {
					ctx.moveTo(x + CELL_SIZE, y)
					ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE)
				}
				if (row === 0 || territoryGrid[(row - 1) * COLS + col] !== 1) {
					ctx.moveTo(x, y)
					ctx.lineTo(x + CELL_SIZE, y)
				}
				if (row === ROWS - 1 || territoryGrid[(row + 1) * COLS + col] !== 1) {
					ctx.moveTo(x, y + CELL_SIZE)
					ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE)
				}
			}
		}
		ctx.stroke()
		ctx.setLineDash([])

		// Town rings: each of the human's town halls is the centre of a
		// "town" — barracks, libraries and farms must be placed within these
		// rings. Drawn as a soft dotted circle in the player's colour, lighter
		// than the territory boundary above.
		ctx.strokeStyle = `${human.minimapColor}80`
		ctx.lineWidth = 2 / zoom
		ctx.setLineDash([4 / zoom, 6 / zoom])
		for (const shape of this.editor.getCurrentPageShapes()) {
			if (getBuildingKind(shape) !== 'town-hall') continue
			if (getBuildingOwner(shape) !== HUMAN_PLAYER_ID) continue
			if (getBuildingHp(shape) <= 0) continue
			const bounds = this.editor.getShapePageBounds(shape.id)
			if (!bounds) continue
			const r = getEffectiveTerritoryRadius('town-hall', getBuildingUpgradeLevel(shape))
			ctx.beginPath()
			ctx.arc(bounds.center.x, bounds.center.y, r, 0, Math.PI * 2)
			ctx.stroke()
		}
		ctx.setLineDash([])
		ctx.restore()
	}

	override renderMinimap(ctx: CanvasRenderingContext2D): void {
		// Draw every player's territory on the minimap as a soft, semi-transparent
		// disk in the player's colour. The fog overlay (higher zIndex) is also
		// rendered on the minimap, so enemy territories beneath unexplored fog
		// stay hidden — the player can only "see" enemy territories where they
		// have explored. Disks overlap naturally; we just stamp one per
		// building.
		ctx.save()
		ctx.globalAlpha = 0.28
		for (const shape of this.editor.getCurrentPageShapes()) {
			const kind = getBuildingKind(shape)
			if (!kind) continue
			if (getBuildingHp(shape) <= 0) continue
			const owner = getBuildingOwner(shape)
			if (!owner) continue
			const bounds = this.editor.getShapePageBounds(shape.id)
			if (!bounds) continue
			const radius = BUILDING_CONFIG[kind].territoryRadius
			ctx.beginPath()
			ctx.arc(bounds.center.x, bounds.center.y, radius, 0, Math.PI * 2)
			ctx.fillStyle = getPlayer(owner).minimapColor
			ctx.fill()
		}
		ctx.restore()
	}
}
