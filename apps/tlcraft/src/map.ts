// Static map data + procedural map-type generators. The playable area is
// shared by every map type; what differs is the resource layout (numbers,
// positions, mix of trees / gold mines / stone quarries) and the level of
// randomisation. Each map type is an idempotent generator that returns a
// fresh ResourceNode[] when called.
//
// MAP_BOUNDS is mutable so the player can pick a map size in the start menu.
// Whenever it changes, callers must:
//   - call `resizeFogGrids()` to reallocate the fog Uint8Arrays (fog.ts)
//   - call `editor.setCameraOptions({ constraints: { bounds, ... } })` so the
//     camera clamps to the new edges
//   - re-bootstrap players (town halls / workers spawn at scaled corners)
// `applyMapSize()` does all three.

import { ResourceKind, ResourceNode, nextResourceId } from './game-state'
import { nextInt, nextRandom } from './random'
import {
	TERRAIN_FOREST,
	TERRAIN_GRASS,
	TERRAIN_HILLS,
	TERRAIN_MOUNTAIN,
	TERRAIN_WATER,
	paintDisk,
	paintRect,
} from './terrain'

// Mutable so the map can be resized at game start. Treat as read-only outside
// of map.ts itself — call `applyMapSize` to change.
export const MAP_BOUNDS = { minX: 0, minY: 0, maxX: 10000, maxY: 5800 }

export const STARTING_WORKER_OFFSETS: Array<{ dx: number; dy: number }> = [
	{ dx: 220, dy: 50 },
	{ dx: 230, dy: 100 },
	{ dx: 250, dy: 0 },
]

export type MapTypeId = 'continents' | 'goldrush' | 'heavy-forest' | 'quarry-lands'

export interface MapType {
	id: MapTypeId
	label: string
	description: string
	generate(): ResourceNode[]
	// Optional terrain populator. Called before `generate()`; writes into the
	// shared terrainGrid in terrain.ts. Map types without one stay all-grass.
	generateTerrain?(): void
}

// ----------------------------- map sizes ---------------------------------

export type MapSizeId = 'small' | 'medium' | 'large' | 'huge'

export interface MapSize {
	id: MapSizeId
	label: string
	width: number
	height: number
	description: string
}

// Sizes were picked so that the smallest is still big enough to feel like an
// RTS map (you have to scout, not just walk over) and the largest is roughly
// 7x the area of the smallest — enough room for four towns each to expand
// without immediately bumping into a neighbour.
export const MAP_SIZES: MapSize[] = [
	{
		id: 'small',
		label: 'Small',
		width: 4800,
		height: 2800,
		description: 'Quick skirmish — towns share borders fast.',
	},
	{
		id: 'medium',
		label: 'Medium',
		width: 7200,
		height: 4200,
		description: 'Room to expand to two or three towns before contact.',
	},
	{
		id: 'large',
		label: 'Large',
		width: 10000,
		height: 5800,
		description: 'Settle, expand, then push out. Standard match.',
	},
	{
		id: 'huge',
		label: 'Huge',
		width: 13000,
		height: 7600,
		description: 'Marathon — colonies, walls, late-game castle pushes.',
	},
]

export const DEFAULT_MAP_SIZE_ID: MapSizeId = 'large'

const BY_SIZE = new Map(MAP_SIZES.map((s) => [s.id, s]))

export function getMapSize(id: MapSizeId): MapSize {
	return BY_SIZE.get(id) ?? MAP_SIZES[2]
}

// Per-match player spawns. Recomputed by `applyMapSize` (and `rerollSpawns`).
// Sampled with a max-min-distance rule so players are reasonably spread but
// don't always land in the four map corners — sometimes a player spawns
// along an edge or even toward the interior, which gives matches more
// variety. Resources cluster around these positions (see the generators).
// Order matches PLAYERS in players.ts so each colour keeps the same role.
export const PLAYER_SPAWNS: Array<{ x: number; y: number }> = []

const SPAWN_EDGE_PADDING = 360
const SPAWN_CANDIDATES_PER_PICK = 40

/** Sample `count` spawn positions inside the current MAP_BOUNDS such that
 * each one maximises the minimum distance to the spawns already chosen
 * (Mitchell's best-candidate). The first spawn is just a random point so
 * the rest can spread out around it — corners are reachable but not
 * mandatory. Uses the seeded PRNG. */
function pickPlayerSpawns(count: number): Array<{ x: number; y: number }> {
	const minX = MAP_BOUNDS.minX + SPAWN_EDGE_PADDING
	const minY = MAP_BOUNDS.minY + SPAWN_EDGE_PADDING
	const maxX = MAP_BOUNDS.maxX - SPAWN_EDGE_PADDING
	const maxY = MAP_BOUNDS.maxY - SPAWN_EDGE_PADDING
	const out: Array<{ x: number; y: number }> = []
	for (let i = 0; i < count; i++) {
		let best: { x: number; y: number } | null = null
		let bestMinDist = -Infinity
		for (let t = 0; t < SPAWN_CANDIDATES_PER_PICK; t++) {
			const x = minX + nextRandom() * (maxX - minX)
			const y = minY + nextRandom() * (maxY - minY)
			if (out.length === 0) {
				// First spawn: no constraint, take the first candidate so the
				// rest of the loop becomes max-min from a known point.
				best = { x, y }
				break
			}
			let minDist = Infinity
			for (const s of out) {
				const dx = s.x - x
				const dy = s.y - y
				const d = dx * dx + dy * dy
				if (d < minDist) minDist = d
			}
			if (minDist > bestMinDist) {
				bestMinDist = minDist
				best = { x, y }
			}
		}
		if (best) out.push(best)
	}
	return out
}

/** Re-roll spawn positions in place (mutates `PLAYER_SPAWNS`). Callers are
 * responsible for then calling players.updatePlayerStartBases. */
export function rerollSpawns(count: number = 4) {
	const next = pickPlayerSpawns(count)
	PLAYER_SPAWNS.length = 0
	for (const s of next) PLAYER_SPAWNS.push(s)
}

// Initial fill so the first onEditorMount bootstrap has something to read
// before the start menu runs. The start menu re-rolls after applying the
// chosen size.
rerollSpawns(4)

/** Switch the playable area. Mutates MAP_BOUNDS in place so existing
 * imports stay valid; callers are responsible for reallocating the fog
 * grid (fog.resizeFogGrids), updating player startBases
 * (players.updatePlayerStartBases) and notifying the editor camera. The
 * spawn positions are re-rolled here too — different size, different match. */
export function applyMapSize(size: MapSize) {
	MAP_BOUNDS.maxX = size.width
	MAP_BOUNDS.maxY = size.height
	rerollSpawns(4)
}

interface Seed {
	kind: ResourceKind
	x: number
	y: number
	remaining?: number
	radius?: number
}

// Helper: randomized cluster of `n` resource nodes around (cx, cy). Spread
// jitters both radius and angle so each match looks slightly different.
function cluster(kind: ResourceKind, cx: number, cy: number, n: number, spread = 60): Seed[] {
	const out: Seed[] = []
	for (let i = 0; i < n; i++) {
		const a = (i / n) * Math.PI * 2 + nextRandom() * 0.6 - 0.3
		const r = spread * (0.55 + nextRandom() * 0.9)
		const x = clampX(cx + Math.cos(a) * r)
		const y = clampY(cy + Math.sin(a) * r)
		out.push({ kind, x, y })
	}
	return out
}

function rand(min: number, max: number): number {
	return min + nextRandom() * (max - min)
}

function clampX(x: number): number {
	return Math.max(MAP_BOUNDS.minX + 60, Math.min(MAP_BOUNDS.maxX - 60, x))
}
function clampY(y: number): number {
	return Math.max(MAP_BOUNDS.minY + 60, Math.min(MAP_BOUNDS.maxY - 60, y))
}

function jitter(p: { x: number; y: number }, r: number) {
	return { x: clampX(p.x + rand(-r, r)), y: clampY(p.y + rand(-r, r)) }
}

// Per-node yield. Trees, mines and quarries each have a base "remaining"
// amount; raising these makes a single node feed a player longer without
// changing positions. Trees were the weak link — workers used to clear a
// home forest in a few minutes — so they got the biggest bump.
const TREE_YIELD = 360
const MINE_YIELD = 7500
const QUARRY_YIELD = 5500

function toNodes(seeds: Seed[]): ResourceNode[] {
	return seeds.map((s) => ({
		id: nextResourceId(),
		kind: s.kind,
		x: s.x,
		y: s.y,
		radius: s.radius ?? (s.kind === 'tree' ? 22 : 32),
		remaining:
			s.remaining ??
			(s.kind === 'tree' ? TREE_YIELD : s.kind === 'mine' ? MINE_YIELD : QUARRY_YIELD),
	}))
}

// Map-area scale factor relative to the original 4800x2800 design. Larger
// maps spawn more contested-mid resources so player-density stays roughly
// constant — otherwise a Huge map feels deserted in the middle band.
function midScale(): number {
	const baseArea = 4800 * 2800
	const area = (MAP_BOUNDS.maxX - MAP_BOUNDS.minX) * (MAP_BOUNDS.maxY - MAP_BOUNDS.minY)
	return Math.max(1, Math.sqrt(area / baseArea))
}

function mid(): { cx: number; cy: number } {
	return {
		cx: (MAP_BOUNDS.minX + MAP_BOUNDS.maxX) / 2,
		cy: (MAP_BOUNDS.minY + MAP_BOUNDS.maxY) / 2,
	}
}

// --------------------------- generators ---------------------------------

// Standard map: each player gets a fat starter forest + gold mine + a stone
// seam, a contested gold pair in the middle, and a couple of mid-band tree
// stands. Bigger maps add proportionally more centre resources via
// `midScale` so the contested band doesn't feel empty on Huge.
function generateContinents(): ResourceNode[] {
	const seeds: Seed[] = []
	for (const c of PLAYER_SPAWNS) {
		const home = jitter(c, 40)
		// Twin starter forests so a single town gets ~2x the wood it had in
		// the old layout — players can grow into mid-game before the home
		// trees run out.
		seeds.push(...cluster('tree', home.x + 280, home.y - 20, 10, 100))
		seeds.push(...cluster('tree', home.x + 100, home.y + 280, 8, 90))
		seeds.push({ kind: 'mine', x: clampX(home.x + 160), y: clampY(home.y - 200) })
		seeds.push({
			kind: 'quarry',
			x: clampX(home.x + 480),
			y: clampY(home.y + 100),
			remaining: 4500,
		})
	}
	const { cx, cy } = mid()
	const scale = midScale()
	const midForests = Math.round(2 * scale)
	for (let i = 0; i < midForests; i++) {
		const angle = (i / midForests) * Math.PI * 2 + nextRandom() * 0.4
		const dist = 300 + nextRandom() * 400
		seeds.push(
			...cluster('tree', cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 12, 180)
		)
	}
	const midMines = Math.max(2, Math.round(2 * scale))
	for (let i = 0; i < midMines; i++) {
		seeds.push({
			kind: 'mine',
			x: clampX(cx + rand(-500, 500)),
			y: clampY(cy + rand(-400, 400)),
			remaining: MINE_YIELD,
		})
	}
	const midQuarries = Math.max(1, Math.round(scale))
	for (let i = 0; i < midQuarries; i++) {
		seeds.push({
			kind: 'quarry',
			x: clampX(cx + rand(-600, 600)),
			y: clampY(cy + rand(-500, 500)),
			remaining: QUARRY_YIELD,
		})
	}
	return toNodes(seeds)
}

// Gold rush: more / richer gold mines, fewer trees. The contested centre is
// a pile of gold; players that secure it snowball.
function generateGoldrush(): ResourceNode[] {
	const seeds: Seed[] = []
	for (const c of PLAYER_SPAWNS) {
		const home = jitter(c, 40)
		seeds.push(...cluster('tree', home.x + 320, home.y - 40, 7, 90))
		// Two home mines instead of one so wood-starved nations can still
		// trade for gold.
		seeds.push({ kind: 'mine', x: clampX(home.x + 160), y: clampY(home.y - 200) })
		seeds.push({ kind: 'mine', x: clampX(home.x + 360), y: clampY(home.y + 200) })
		// A small starter quarry so every civ has some stone for Castle Age
		// and stone walls without rushing the contested middle.
		seeds.push({
			kind: 'quarry',
			x: clampX(home.x + 440),
			y: clampY(home.y + 120),
			remaining: Math.round(QUARRY_YIELD * 0.6),
		})
	}
	const { cx, cy } = mid()
	const scale = midScale()
	// Centre is a contested gold belt. Count scales with map size.
	const goldCount = Math.max(6, Math.round(6 * scale))
	for (let i = 0; i < goldCount; i++) {
		seeds.push({
			kind: 'mine',
			x: clampX(cx + rand(-700, 700)),
			y: clampY(cy + rand(-500, 500)),
			remaining: 8500,
		})
	}
	const quarryCount = Math.max(2, Math.round(2 * scale))
	for (let i = 0; i < quarryCount; i++) {
		seeds.push({
			kind: 'quarry',
			x: clampX(cx + rand(-900, 900)),
			y: clampY(cy + rand(-700, 700)),
			remaining: 4500,
		})
	}
	return toNodes(seeds)
}

// Heavy forest: dense trees everywhere; mines and quarries are rare. Slow
// economy, so the early game is a workers-and-walls race.
function generateHeavyForest(): ResourceNode[] {
	const seeds: Seed[] = []
	for (const c of PLAYER_SPAWNS) {
		const home = jitter(c, 40)
		// Big forest around the home base + a second back-line stand.
		seeds.push(...cluster('tree', home.x + 280, home.y - 40, 16, 160))
		seeds.push(...cluster('tree', home.x + 100, home.y + 320, 10, 110))
		seeds.push({ kind: 'mine', x: clampX(home.x + 200), y: clampY(home.y - 220) })
		// Single small starter quarry — stone is scarce on this map but every
		// player needs at least one source for Castle Age and walls.
		seeds.push({
			kind: 'quarry',
			x: clampX(home.x + 420),
			y: clampY(home.y + 140),
			remaining: Math.round(QUARRY_YIELD * 0.5),
		})
	}
	const { cx, cy } = mid()
	const scale = midScale()
	const midForests = Math.max(6, Math.round(6 * scale))
	for (let i = 0; i < midForests; i++) {
		const a = (i / midForests) * Math.PI * 2 + nextRandom() * 0.4
		const dist = 200 + nextRandom() * 700
		seeds.push(...cluster('tree', cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, 10, 130))
	}
	// Just a couple of mines + one quarry in the middle.
	const midMines = Math.max(1, Math.round(scale))
	for (let i = 0; i < midMines; i++) {
		seeds.push({
			kind: 'mine',
			x: clampX(cx + rand(-700, 700)),
			y: clampY(cy + rand(-500, 500)),
			remaining: 6500,
		})
	}
	seeds.push({
		kind: 'quarry',
		x: clampX(cx + rand(-600, 600)),
		y: clampY(cy + rand(-400, 400)),
		remaining: 4500,
	})
	return toNodes(seeds)
}

// Quarry lands: stone is everywhere, gold is rare. Castle-heavy strategies
// shine; nations that don't pivot to stone struggle in the late game.
function generateQuarryLands(): ResourceNode[] {
	const seeds: Seed[] = []
	for (const c of PLAYER_SPAWNS) {
		const home = jitter(c, 40)
		seeds.push(...cluster('tree', home.x + 320, home.y - 40, 8, 90))
		seeds.push({ kind: 'mine', x: clampX(home.x + 200), y: clampY(home.y - 200) })
		seeds.push({ kind: 'quarry', x: clampX(home.x + 460), y: clampY(home.y + 60) })
		seeds.push({ kind: 'quarry', x: clampX(home.x + 360), y: clampY(home.y + 280) })
	}
	const { cx, cy } = mid()
	const scale = midScale()
	const quarryCount = Math.max(5, Math.round(5 * scale))
	for (let i = 0; i < quarryCount; i++) {
		seeds.push({
			kind: 'quarry',
			x: clampX(cx + rand(-900, 900)),
			y: clampY(cy + rand(-700, 700)),
			remaining: 6000,
		})
	}
	const midForests = Math.max(1, Math.round(scale))
	for (let i = 0; i < midForests; i++) {
		seeds.push(
			...cluster('tree', clampX(cx + rand(-700, 700)), clampY(cy + rand(-500, 500)), 10, 150)
		)
	}
	seeds.push({ kind: 'mine', x: clampX(cx), y: clampY(cy), remaining: 8000 })
	return toNodes(seeds)
}

// --------------------------- terrain generators -----------------------------
//
// Each map type lays down a thematic terrain layer before resources are
// seeded. Player home areas are reserved (kept grass) so spawns stay clean.

const HOME_RESERVE_RADIUS = 320

function reservePlayerHomes() {
	for (const c of PLAYER_SPAWNS) {
		paintDisk(c.x + 100, c.y + 100, HOME_RESERVE_RADIUS, TERRAIN_GRASS)
	}
}

function generateTerrainContinents() {
	// A few scattered lakes + small forest patches + mid-band hills. Easy to
	// navigate around even without pathfinding.
	const { cx, cy } = mid()
	const scale = midScale()
	const lakeCount = Math.max(2, Math.round(2 * scale))
	for (let i = 0; i < lakeCount; i++) {
		paintDisk(
			clampX(cx + rand(-1100, 1100)),
			clampY(cy + rand(-900, 900)),
			120 + nextRandom() * 120,
			TERRAIN_WATER
		)
	}
	const forestPatches = Math.max(3, Math.round(3 * scale))
	for (let i = 0; i < forestPatches; i++) {
		paintDisk(
			clampX(cx + rand(-1400, 1400)),
			clampY(cy + rand(-1000, 1000)),
			180 + nextRandom() * 80,
			TERRAIN_FOREST
		)
	}
	const hillsCount = Math.max(2, Math.round(2 * scale))
	for (let i = 0; i < hillsCount; i++) {
		paintDisk(
			clampX(cx + rand(-700, 700)),
			clampY(cy + rand(-500, 500)),
			150 + nextRandom() * 60,
			TERRAIN_HILLS
		)
	}
	reservePlayerHomes()
}

function generateTerrainGoldrush() {
	// Open plains with a few hills clustering around the contested centre and
	// one or two small lakes for character.
	const { cx, cy } = mid()
	const scale = midScale()
	const hillsCount = Math.max(3, Math.round(4 * scale))
	for (let i = 0; i < hillsCount; i++) {
		paintDisk(
			clampX(cx + rand(-600, 600)),
			clampY(cy + rand(-400, 400)),
			140 + nextRandom() * 80,
			TERRAIN_HILLS
		)
	}
	const lakeCount = Math.max(1, Math.round(scale))
	for (let i = 0; i < lakeCount; i++) {
		paintDisk(
			clampX(cx + rand(-1300, 1300)),
			clampY(cy + rand(-900, 900)),
			100 + nextRandom() * 60,
			TERRAIN_WATER
		)
	}
	reservePlayerHomes()
}

function generateTerrainHeavyForest() {
	// Large forest blobs blanketing the map. Combined with the existing tree
	// resource clusters, this makes traversal slow and predictable.
	const { cx, cy } = mid()
	const scale = midScale()
	const forestBlobs = Math.max(8, Math.round(8 * scale))
	for (let i = 0; i < forestBlobs; i++) {
		paintDisk(
			clampX(cx + rand(-2000, 2000)),
			clampY(cy + rand(-1400, 1400)),
			220 + nextRandom() * 140,
			TERRAIN_FOREST
		)
	}
	// Small lakes thrown in for variety.
	const lakeCount = Math.max(1, Math.round(scale))
	for (let i = 0; i < lakeCount; i++) {
		paintDisk(
			clampX(cx + rand(-1500, 1500)),
			clampY(cy + rand(-1000, 1000)),
			90 + nextRandom() * 60,
			TERRAIN_WATER
		)
	}
	reservePlayerHomes()
}

function generateTerrainQuarryLands() {
	// Mountain ridges in clumps + a halo of hills around them. Strong choke
	// points; players that don't pivot to siege struggle to break through.
	const { cx, cy } = mid()
	const scale = midScale()
	const ridges = Math.max(3, Math.round(3 * scale))
	for (let i = 0; i < ridges; i++) {
		const rx = clampX(cx + rand(-1600, 1600))
		const ry = clampY(cy + rand(-1000, 1000))
		paintDisk(rx, ry, 160 + nextRandom() * 60, TERRAIN_MOUNTAIN)
		paintDisk(rx + rand(-80, 80), ry + rand(-80, 80), 200, TERRAIN_HILLS)
	}
	const extraHills = Math.max(3, Math.round(3 * scale))
	for (let i = 0; i < extraHills; i++) {
		paintDisk(
			clampX(cx + rand(-1400, 1400)),
			clampY(cy + rand(-900, 900)),
			140 + nextRandom() * 80,
			TERRAIN_HILLS
		)
	}
	reservePlayerHomes()
	// Suppress unused-import warning for paintRect — it's exported for hand-
	// crafted templates a future map type might want.
	void paintRect
}

export const MAP_TYPES: MapType[] = [
	{
		id: 'continents',
		label: 'Continents',
		description:
			'A balanced classic. Trees and gold near every corner; stone and a contested forest in the middle.',
		generate: generateContinents,
		generateTerrain: generateTerrainContinents,
	},
	{
		id: 'goldrush',
		label: 'Gold rush',
		description:
			'Gold-rich. Two mines per home base + a fat gold belt at the centre. Stone is scarce.',
		generate: generateGoldrush,
		generateTerrain: generateTerrainGoldrush,
	},
	{
		id: 'heavy-forest',
		label: 'Heavy forest',
		description:
			'Slow economies. Forests everywhere, gold and stone rare. Walls and ambushes go a long way.',
		generate: generateHeavyForest,
		generateTerrain: generateTerrainHeavyForest,
	},
	{
		id: 'quarry-lands',
		label: 'Quarry lands',
		description: 'Stone is plentiful and gold is rare. Castles are the late-game power play.',
		generate: generateQuarryLands,
		generateTerrain: generateTerrainQuarryLands,
	},
]

const BY_ID = new Map(MAP_TYPES.map((m) => [m.id, m]))

export function getMapType(id: MapTypeId): MapType {
	const m = BY_ID.get(id)
	if (!m) throw new Error(`Unknown map type: ${id}`)
	return m
}

export function pickRandomMapType(): MapType {
	return MAP_TYPES[nextInt(MAP_TYPES.length)]
}

// Backwards-compatible default seeder used for places that don't care about
// the chosen map type. Defaults to Continents (the original layout).
export function seedResources(): ResourceNode[] {
	return generateContinents()
}
