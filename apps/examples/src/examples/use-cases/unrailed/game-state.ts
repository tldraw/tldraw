import { atom } from 'tldraw'
import {
	ObstacleKind,
	START_BUDGET,
	START_IRON,
	START_LEN_TILES,
	START_TRAIN_S,
	START_WOOD,
	TILE,
	TRACK_ROW,
} from './constants'
import { makePath, Path } from './path'

export interface Obstacle {
	col: number
	row: number
	kind: ObstacleKind
	hp: number
	maxHp: number
}

export type ToolMode = 'draw' | 'bridge'

/**
 * The whole simulation lives in this one mutable object — it is the source of
 * truth. The game loop mutates it in place every tick; overlays and the HUD read
 * a published snapshot through the atoms below.
 */
export interface World {
	// The track the player has drawn, as a freeform polyline. The train rides it.
	path: Path
	// Arc-length position of the train front along the path.
	trainS: number
	// Remaining drawable track length, in tiles. Crafting replenishes it.
	budget: number

	// Grid obstacles keyed by "col,row".
	obstacles: Map<string, Obstacle>
	// Water tiles (need a bridge to draw track across) and which are bridged.
	water: Map<string, { col: number; row: number }>
	bridged: Set<string>
	generatedToCol: number

	wood: number
	iron: number
	craftT: number

	// Brief red flash when a stroke is rejected: world position + ms remaining.
	flash: { x: number; y: number; until: number } | null
	// Set true on pointer-up; the loop then processes any new drawn shapes.
	pendingScan: boolean
	// True while a pointer is down, so the camera holds still mid-stroke.
	pointerDown: boolean
	tool: ToolMode

	elapsedMs: number
	gameOver: boolean
}

export function tileKey(col: number, row: number) {
	return `${col},${row}`
}

function starterPath() {
	const y = (TRACK_ROW + 0.5) * TILE
	return makePath([
		{ x: 0, y },
		{ x: START_LEN_TILES * TILE, y },
	])
}

function makeWorld(): World {
	return {
		path: starterPath(),
		trainS: START_TRAIN_S,
		budget: START_BUDGET,
		obstacles: new Map(),
		water: new Map(),
		bridged: new Set(),
		generatedToCol: START_LEN_TILES - 1,
		wood: START_WOOD,
		iron: START_IRON,
		craftT: 0,
		flash: null,
		pendingScan: false,
		pointerDown: false,
		tool: 'draw',
		elapsedMs: 0,
		gameOver: false,
	}
}

export const world: World = makeWorld()

export function resetWorld() {
	Object.assign(world, makeWorld())
	publish()
}

export function obstacleMaxHp(kind: ObstacleKind) {
	return kind === 'tree' ? 1 : 1 // cleared in a single chop stroke; kept for tuning
}

// --- Reactive snapshot --------------------------------------------------------

export const frame$ = atom('unrailed_frame', 0)
export const wood$ = atom('unrailed_wood', START_WOOD)
export const iron$ = atom('unrailed_iron', START_IRON)
export const budget$ = atom('unrailed_budget', START_BUDGET)
export const distance$ = atom('unrailed_distance', 0)
export const tool$ = atom<ToolMode>('unrailed_tool', 'draw')
export const gameOver$ = atom('unrailed_gameover', false)

export function publish() {
	frame$.update((n) => n + 1)
	wood$.set(world.wood)
	iron$.set(world.iron)
	budget$.set(Math.max(0, Math.floor(world.budget)))
	distance$.set(Math.max(0, Math.floor(world.trainS / TILE)))
	tool$.set(world.tool)
	gameOver$.set(world.gameOver)
}
