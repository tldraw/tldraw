// Terrain grid. Mirrors the fog grid in fog.ts — same 64-page-unit tiles
// indexed as `row * COLS + col`. Each cell stores one TerrainType.
//
// Effects:
//   - water and mountain: block building placement and unit movement
//     (units with canTraverseWater bypass water — reserved for future ships).
//   - forest: unit speed 0.75x. Does not block.
//   - hills: unit speed 0.9x. Does not block.
//   - desert: visual only. (Future: could affect gather rates.)
//
// Off-map tiles are treated as water for collision purposes so units don't
// slide off the edge.

import { COLS, ROWS } from './fog'
import { MAP_BOUNDS } from './map'

export const CELL_SIZE = 64

export type TerrainType = 0 | 1 | 2 | 3 | 4 | 5

export const TERRAIN_GRASS: TerrainType = 0
export const TERRAIN_FOREST: TerrainType = 1
export const TERRAIN_HILLS: TerrainType = 2
export const TERRAIN_DESERT: TerrainType = 3
export const TERRAIN_WATER: TerrainType = 4
export const TERRAIN_MOUNTAIN: TerrainType = 5

export const TERRAIN_NAMES: Record<TerrainType, string> = {
	0: 'Grass',
	1: 'Forest',
	2: 'Hills',
	3: 'Desert',
	4: 'Water',
	5: 'Mountain',
}

export let terrainGrid = new Uint8Array(COLS * ROWS)

/** Reallocate the grid to match the current fog grid dimensions. Call after
 * resizeFogGrids() so the two stay in lockstep. */
export function resizeTerrainGrid() {
	terrainGrid = new Uint8Array(COLS * ROWS)
}

export function resetTerrain() {
	terrainGrid.fill(TERRAIN_GRASS)
}

let _terrainVersion = 0
export function getTerrainVersion(): number {
	return _terrainVersion
}
export function bumpTerrainVersion() {
	_terrainVersion++
}

/** Direct grid index for a page-space point. Returns -1 if outside the map. */
export function tileIndex(x: number, y: number): number {
	if (x < MAP_BOUNDS.minX || x >= MAP_BOUNDS.maxX) return -1
	if (y < MAP_BOUNDS.minY || y >= MAP_BOUNDS.maxY) return -1
	const col = Math.floor((x - MAP_BOUNDS.minX) / CELL_SIZE)
	const row = Math.floor((y - MAP_BOUNDS.minY) / CELL_SIZE)
	return row * COLS + col
}

/** Terrain type at a page-space point. Off-map → water (so unit-collision
 * naturally walls off the map edge). */
export function terrainAt(x: number, y: number): TerrainType {
	const i = tileIndex(x, y)
	if (i < 0) return TERRAIN_WATER
	return terrainGrid[i] as TerrainType
}

export function setTerrainAt(col: number, row: number, t: TerrainType) {
	if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return
	terrainGrid[row * COLS + col] = t
}

export function isBlocking(t: TerrainType): boolean {
	return t === TERRAIN_WATER || t === TERRAIN_MOUNTAIN
}

/** Movement speed multiplier for crossing this terrain. */
export function speedMultiplier(t: TerrainType): number {
	if (t === TERRAIN_FOREST) return 0.75
	if (t === TERRAIN_HILLS) return 0.9
	return 1
}

/** True if a unit can stand on this terrain. canTraverseWater (future ships)
 * lets a unit ignore the water block but not mountains. */
export function isPassable(t: TerrainType, canTraverseWater: boolean): boolean {
	if (t === TERRAIN_MOUNTAIN) return false
	if (t === TERRAIN_WATER) return canTraverseWater
	return true
}

// ---------------------------------------------------------------------------
// Painting

/** Fill a disk of tiles with a terrain type. Used by generators to lay down
 * lakes, forests, mountain ranges. */
export function paintDisk(cx: number, cy: number, radius: number, t: TerrainType) {
	const r2 = radius * radius
	const minCol = Math.max(0, Math.floor((cx - radius - MAP_BOUNDS.minX) / CELL_SIZE))
	const maxCol = Math.min(COLS, Math.ceil((cx + radius - MAP_BOUNDS.minX) / CELL_SIZE))
	const minRow = Math.max(0, Math.floor((cy - radius - MAP_BOUNDS.minY) / CELL_SIZE))
	const maxRow = Math.min(ROWS, Math.ceil((cy + radius - MAP_BOUNDS.minY) / CELL_SIZE))
	for (let row = minRow; row < maxRow; row++) {
		const ty = MAP_BOUNDS.minY + row * CELL_SIZE + CELL_SIZE / 2
		const dy = ty - cy
		for (let col = minCol; col < maxCol; col++) {
			const tx = MAP_BOUNDS.minX + col * CELL_SIZE + CELL_SIZE / 2
			const dx = tx - cx
			if (dx * dx + dy * dy <= r2) {
				terrainGrid[row * COLS + col] = t
			}
		}
	}
}

/** Paint an axis-aligned rect of tiles. Used for straits / belts. */
export function paintRect(minX: number, minY: number, maxX: number, maxY: number, t: TerrainType) {
	const c0 = Math.max(0, Math.floor((minX - MAP_BOUNDS.minX) / CELL_SIZE))
	const c1 = Math.min(COLS, Math.ceil((maxX - MAP_BOUNDS.minX) / CELL_SIZE))
	const r0 = Math.max(0, Math.floor((minY - MAP_BOUNDS.minY) / CELL_SIZE))
	const r1 = Math.min(ROWS, Math.ceil((maxY - MAP_BOUNDS.minY) / CELL_SIZE))
	for (let row = r0; row < r1; row++) {
		for (let col = c0; col < c1; col++) {
			terrainGrid[row * COLS + col] = t
		}
	}
}

// ---------------------------------------------------------------------------
// Footprint queries

/** True if any tile in an axis-aligned box is blocking (water or mountain).
 * Used by checkPlacement to refuse buildings on water/mountain. */
export function boxOverlapsBlocking(
	minX: number,
	minY: number,
	maxX: number,
	maxY: number
): boolean {
	const c0 = Math.max(0, Math.floor((minX - MAP_BOUNDS.minX) / CELL_SIZE))
	const c1 = Math.min(COLS, Math.ceil((maxX - MAP_BOUNDS.minX) / CELL_SIZE))
	const r0 = Math.max(0, Math.floor((minY - MAP_BOUNDS.minY) / CELL_SIZE))
	const r1 = Math.min(ROWS, Math.ceil((maxY - MAP_BOUNDS.minY) / CELL_SIZE))
	for (let row = r0; row < r1; row++) {
		for (let col = c0; col < c1; col++) {
			const t = terrainGrid[row * COLS + col]
			if (t === TERRAIN_WATER || t === TERRAIN_MOUNTAIN) return true
		}
	}
	return false
}

// ---------------------------------------------------------------------------
// Save/load
//
// terrainGrid is a Uint8Array, persisted via a length-prefixed base64 string
// so the save JSON stays compact (no per-cell array entries) and decoding is
// trivial via atob/btoa.

export function serializeTerrain(): string {
	let bin = ''
	for (let i = 0; i < terrainGrid.length; i++) bin += String.fromCharCode(terrainGrid[i])
	return btoa(bin)
}

export function deserializeTerrain(encoded: string): boolean {
	try {
		const bin = atob(encoded)
		if (bin.length !== terrainGrid.length) return false
		for (let i = 0; i < bin.length; i++) terrainGrid[i] = bin.charCodeAt(i)
		bumpTerrainVersion()
		return true
	} catch {
		return false
	}
}
