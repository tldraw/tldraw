import { OverlayUtil, TLOverlay } from 'tldraw'
import { COLS, ROWS } from '../fog'
import { MAP_BOUNDS } from '../map'
import {
	CELL_SIZE,
	TERRAIN_DESERT,
	TERRAIN_FOREST,
	TERRAIN_HILLS,
	TERRAIN_MOUNTAIN,
	TERRAIN_WATER,
	TerrainType,
	getTerrainVersion,
	terrainGrid,
} from '../terrain'

interface TLTerrainOverlay extends TLOverlay {
	props: {
		// Bumped from terrain.ts on every grid mutation so the OverlayManager
		// cache invalidates and render() runs again.
		version: number
	}
}

// Per-terrain-type render colors. Alpha values are kept low enough that
// buildings + units painted "above" by tldraw remain visible against the tile
// tint — the overlay layer paints on top of shapes, so anything fully opaque
// would hide game state.
const COLORS: Record<TerrainType, string | null> = {
	0: null, // grass — not painted, relies on canvas background
	1: 'rgba(34, 90, 50, 0.40)', // forest
	2: 'rgba(140, 116, 80, 0.30)', // hills
	3: 'rgba(220, 195, 130, 0.32)', // desert
	4: 'rgba(60, 120, 200, 0.55)', // water
	5: 'rgba(110, 100, 105, 0.55)', // mountain
}

// Order tiles are painted in. Doesn't actually matter visually since each
// tile holds one type, but keeping it predictable helps debugging.
const PAINT_ORDER: TerrainType[] = [
	TERRAIN_DESERT,
	TERRAIN_HILLS,
	TERRAIN_FOREST,
	TERRAIN_WATER,
	TERRAIN_MOUNTAIN,
] as TerrainType[]

// Minimap colors are more opaque so they read at low resolution.
const MINIMAP_COLORS: Record<TerrainType, string | null> = {
	0: null,
	1: 'rgb(34, 90, 50)',
	2: 'rgb(155, 130, 90)',
	3: 'rgb(220, 195, 130)',
	4: 'rgb(60, 120, 200)',
	5: 'rgb(110, 100, 105)',
}

export class TerrainOverlayUtil extends OverlayUtil<TLTerrainOverlay> {
	// Just above MapOverlayUtil (grid lines + border at zIndex 0) so terrain
	// reads as a layer of the map itself, well below fog (500) and interactive
	// overlays.
	static override type = 'tlc-terrain'
	override options = { zIndex: 1 }

	override isActive(): boolean {
		return true
	}

	override getOverlays(): TLTerrainOverlay[] {
		return [
			{ id: 'tlc-terrain:main', type: 'tlc-terrain', props: { version: getTerrainVersion() } },
		]
	}

	override render(ctx: CanvasRenderingContext2D): void {
		const vp = this.editor.getViewportPageBounds()
		const c0 = Math.max(0, Math.floor((vp.minX - MAP_BOUNDS.minX) / CELL_SIZE))
		const c1 = Math.min(COLS, Math.ceil((vp.maxX - MAP_BOUNDS.minX) / CELL_SIZE))
		const r0 = Math.max(0, Math.floor((vp.minY - MAP_BOUNDS.minY) / CELL_SIZE))
		const r1 = Math.min(ROWS, Math.ceil((vp.maxY - MAP_BOUNDS.minY) / CELL_SIZE))
		ctx.save()
		// One pass per terrain type so we set fillStyle once per type instead of
		// per tile. The map is mostly grass, which we never paint, so the loop
		// body runs sparsely.
		for (const t of PAINT_ORDER) {
			const color = COLORS[t]
			if (!color) continue
			ctx.fillStyle = color
			for (let row = r0; row < r1; row++) {
				const yPx = MAP_BOUNDS.minY + row * CELL_SIZE
				const rowOffset = row * COLS
				for (let col = c0; col < c1; col++) {
					if (terrainGrid[rowOffset + col] !== t) continue
					ctx.fillRect(MAP_BOUNDS.minX + col * CELL_SIZE, yPx, CELL_SIZE, CELL_SIZE)
				}
			}
		}
		ctx.restore()
	}

	override renderMinimap(ctx: CanvasRenderingContext2D): void {
		ctx.save()
		for (const t of PAINT_ORDER) {
			const color = MINIMAP_COLORS[t]
			if (!color) continue
			ctx.fillStyle = color
			for (let row = 0; row < ROWS; row++) {
				const yPx = MAP_BOUNDS.minY + row * CELL_SIZE
				const rowOffset = row * COLS
				for (let col = 0; col < COLS; col++) {
					if (terrainGrid[rowOffset + col] !== t) continue
					ctx.fillRect(MAP_BOUNDS.minX + col * CELL_SIZE, yPx, CELL_SIZE, CELL_SIZE)
				}
			}
		}
		ctx.restore()
	}
}
