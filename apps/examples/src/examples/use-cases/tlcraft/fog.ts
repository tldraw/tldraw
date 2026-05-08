// Fog of war + territory grids. Both are computed for the human player only —
// AI players use direct atom queries (omniscient by design). Each grid is a
// flat Uint8Array indexed by row*COLS + col. Cells are 64 page units; on the
// 4800x2800 map that's 75x44 = 3300 cells, well within budget for a per-tick
// recompute.

import { BUILDING_CONFIG, BuildingKind, getEffectiveTerritoryRadius } from './building-config'
import { MAP_BOUNDS } from './map'
import { PlayerId } from './players'
import { UNIT_CONFIG, UnitKind } from './unit-config'

export const CELL_SIZE = 64
export const COLS = Math.ceil((MAP_BOUNDS.maxX - MAP_BOUNDS.minX) / CELL_SIZE)
export const ROWS = Math.ceil((MAP_BOUNDS.maxY - MAP_BOUNDS.minY) / CELL_SIZE)
const TOTAL = COLS * ROWS

// 0 = unexplored (heavy fog), 1 = explored (faded fog), 2 = currently visible.
export const visGrid = new Uint8Array(TOTAL)
// 0 = outside human territory, 1 = inside.
export const territoryGrid = new Uint8Array(TOTAL)

// A version counter the FogOverlayUtil reads to force a re-render whenever
// the grids change. We bump it once per tick after recompute.
let _fogVersion = 0
export function getFogVersion(): number {
	return _fogVersion
}

interface BuildingForFog {
	kind: BuildingKind
	owner: PlayerId
	cx: number
	cy: number
	hp: number
	upgradeLevel: number
}

interface UnitForFog {
	kind: UnitKind
	owner: PlayerId
	x: number
	y: number
	hp: number
	gatherUntilMs: number
}

export function resetFog() {
	visGrid.fill(0)
	territoryGrid.fill(0)
	_fogVersion = 0
}

export function computeFog(humanId: PlayerId, units: UnitForFog[], buildings: BuildingForFog[]) {
	// Step 1: downgrade currently-visible to explored. Unexplored stays 0.
	for (let i = 0; i < TOTAL; i++) {
		if (visGrid[i] === 2) visGrid[i] = 1
	}
	territoryGrid.fill(0)

	// Step 2: territory from human buildings. Territory is the union of disks
	// around each alive building of the player.
	for (const b of buildings) {
		if (b.owner !== humanId || b.hp <= 0) continue
		const radius = getEffectiveTerritoryRadius(b.kind, b.upgradeLevel)
		markCircle(territoryGrid, b.cx, b.cy, radius, 1)
	}

	// Step 3: vision from human units (only those not currently inside a tree
	// or mine — workers in resources don't reveal anything).
	for (const u of units) {
		if (u.owner !== humanId || u.hp <= 0) continue
		if (u.gatherUntilMs > 0) continue
		const radius = UNIT_CONFIG[u.kind].visionRadius
		markCircle(visGrid, u.x, u.y, radius, 2)
	}

	// Step 4: vision from human buildings.
	for (const b of buildings) {
		if (b.owner !== humanId || b.hp <= 0) continue
		const radius = BUILDING_CONFIG[b.kind].visionRadius
		markCircle(visGrid, b.cx, b.cy, radius, 2)
	}

	// Step 5: territory cells are always visible. Walking the territory grid
	// once is cheap and avoids needing markCircle to know about both grids.
	for (let i = 0; i < TOTAL; i++) {
		if (territoryGrid[i] === 1 && visGrid[i] !== 2) visGrid[i] = 2
	}

	_fogVersion++
}

function markCircle(grid: Uint8Array, cx: number, cy: number, radius: number, value: number) {
	const minCol = Math.floor((cx - radius - MAP_BOUNDS.minX) / CELL_SIZE)
	const maxCol = Math.ceil((cx + radius - MAP_BOUNDS.minX) / CELL_SIZE)
	const minRow = Math.floor((cy - radius - MAP_BOUNDS.minY) / CELL_SIZE)
	const maxRow = Math.ceil((cy + radius - MAP_BOUNDS.minY) / CELL_SIZE)
	const rsq = radius * radius
	const c0 = Math.max(0, minCol)
	const c1 = Math.min(COLS, maxCol)
	const r0 = Math.max(0, minRow)
	const r1 = Math.min(ROWS, maxRow)
	for (let row = r0; row < r1; row++) {
		const ry = MAP_BOUNDS.minY + (row + 0.5) * CELL_SIZE - cy
		const rySq = ry * ry
		const rowOffset = row * COLS
		for (let col = c0; col < c1; col++) {
			const rx = MAP_BOUNDS.minX + (col + 0.5) * CELL_SIZE - cx
			if (rx * rx + rySq <= rsq) {
				const i = rowOffset + col
				// Only upgrade — never overwrite a "more visible" value with
				// "less visible". For territoryGrid (binary), this is moot;
				// for visGrid we always pass 2 here so a write is always an
				// upgrade.
				if (grid[i] < value) grid[i] = value
			}
		}
	}
}

function gridIndex(x: number, y: number): number {
	const col = Math.floor((x - MAP_BOUNDS.minX) / CELL_SIZE)
	const row = Math.floor((y - MAP_BOUNDS.minY) / CELL_SIZE)
	if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return -1
	return row * COLS + col
}

// True if the cell containing (x, y) is currently in the human's vision.
export function isVisibleToHuman(x: number, y: number): boolean {
	const i = gridIndex(x, y)
	return i >= 0 && visGrid[i] === 2
}

// True if the cell has ever been explored (visible or remembered).
export function isExploredByHuman(x: number, y: number): boolean {
	const i = gridIndex(x, y)
	return i >= 0 && visGrid[i] >= 1
}

// True if the cell is inside the human's current territory.
export function isInHumanTerritory(x: number, y: number): boolean {
	const i = gridIndex(x, y)
	return i >= 0 && territoryGrid[i] === 1
}

// Per-player territory check used by placeBuilding for both human and AI.
// Computed on demand — only the human's grid is precomputed each tick. We
// fall back to scanning that player's buildings here.
export function isInTerritoryOf(
	playerId: PlayerId,
	humanId: PlayerId,
	buildings: BuildingForFog[],
	x: number,
	y: number
): boolean {
	if (playerId === humanId) return isInHumanTerritory(x, y)
	for (const b of buildings) {
		if (b.owner !== playerId || b.hp <= 0) continue
		const radius = getEffectiveTerritoryRadius(b.kind, b.upgradeLevel)
		const dx = b.cx - x
		const dy = b.cy - y
		if (dx * dx + dy * dy <= radius * radius) return true
	}
	return false
}

export function hasAnyBuilding(playerId: PlayerId, buildings: BuildingForFog[]): boolean {
	for (const b of buildings) {
		if (b.owner === playerId && b.hp > 0) return true
	}
	return false
}
