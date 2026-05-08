// Static map data + procedural map-type generators. The playable area is
// shared by every map type; what differs is the resource layout (numbers,
// positions, mix of trees / gold mines / stone quarries) and the level of
// randomisation. Each map type is an idempotent generator that returns a
// fresh ResourceNode[] when called.

import { ResourceKind, ResourceNode, nextResourceId } from './game-state'

export const MAP_BOUNDS = { minX: 0, minY: 0, maxX: 4800, maxY: 2800 }

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
		const a = (i / n) * Math.PI * 2 + Math.random() * 0.6 - 0.3
		const r = spread * (0.55 + Math.random() * 0.9)
		const x = clampX(cx + Math.cos(a) * r)
		const y = clampY(cy + Math.sin(a) * r)
		out.push({ kind, x, y })
	}
	return out
}

function rand(min: number, max: number): number {
	return min + Math.random() * (max - min)
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

const PLAYER_CORNERS = [
	{ x: 320, y: 320 },
	{ x: 4380, y: 320 },
	{ x: 4380, y: 2380 },
	{ x: 320, y: 2380 },
]

function toNodes(seeds: Seed[]): ResourceNode[] {
	return seeds.map((s) => ({
		id: nextResourceId(),
		kind: s.kind,
		x: s.x,
		y: s.y,
		radius: s.radius ?? (s.kind === 'tree' ? 22 : 32),
		remaining: s.remaining ?? (s.kind === 'tree' ? 220 : s.kind === 'mine' ? 5000 : 4000),
	}))
}

// --------------------------- generators ---------------------------------

// Standard map: each player gets a starter forest + gold mine, a contested
// gold pair in the middle, and a couple of mid-band tree stands. A handful
// of stone quarries scattered around give late-game fortifications fuel.
function generateContinents(): ResourceNode[] {
	const seeds: Seed[] = []
	for (const c of PLAYER_CORNERS) {
		const home = jitter(c, 40)
		seeds.push(...cluster('tree', home.x + 300, home.y - 40, 8, 80))
		seeds.push({
			kind: 'mine',
			x: clampX(home.x + 160),
			y: clampY(home.y - 200),
		})
		seeds.push({
			kind: 'quarry',
			x: clampX(home.x + 480),
			y: clampY(home.y + 100),
			remaining: 3500,
		})
	}
	// Mid-map contested forests + gold + a stone seam.
	seeds.push(...cluster('tree', rand(2200, 2600), rand(800, 1100), 10, 160))
	seeds.push(...cluster('tree', rand(2200, 2600), rand(1700, 2000), 10, 160))
	seeds.push({ kind: 'mine', x: 2300, y: 1400 })
	seeds.push({ kind: 'mine', x: 2500, y: 1400 })
	seeds.push({ kind: 'quarry', x: 2400, y: rand(1100, 1700), remaining: 5000 })
	return toNodes(seeds)
}

// Gold rush: more / richer gold mines, fewer trees. The contested centre is
// a pile of gold; players that secure it snowball.
function generateGoldrush(): ResourceNode[] {
	const seeds: Seed[] = []
	for (const c of PLAYER_CORNERS) {
		const home = jitter(c, 40)
		seeds.push(...cluster('tree', home.x + 320, home.y - 40, 5, 70))
		// Two home mines instead of one
		seeds.push({ kind: 'mine', x: clampX(home.x + 160), y: clampY(home.y - 200) })
		seeds.push({ kind: 'mine', x: clampX(home.x + 360), y: clampY(home.y + 200) })
	}
	// Centre is a contested gold belt.
	for (let i = 0; i < 6; i++) {
		seeds.push({
			kind: 'mine',
			x: 2400 + rand(-400, 400),
			y: 1400 + rand(-300, 300),
			remaining: 6000,
		})
	}
	// A couple of stone quarries near the centre band so castles are still viable.
	seeds.push({ kind: 'quarry', x: rand(1500, 1900), y: rand(900, 1900), remaining: 3500 })
	seeds.push({ kind: 'quarry', x: rand(2900, 3300), y: rand(900, 1900), remaining: 3500 })
	return toNodes(seeds)
}

// Heavy forest: dense trees everywhere; mines and quarries are rare. Slow
// economy, so the early game is a workers-and-walls race.
function generateHeavyForest(): ResourceNode[] {
	const seeds: Seed[] = []
	for (const c of PLAYER_CORNERS) {
		const home = jitter(c, 40)
		// Big forest around the home base.
		seeds.push(...cluster('tree', home.x + 280, home.y - 40, 14, 140))
		seeds.push({ kind: 'mine', x: clampX(home.x + 200), y: clampY(home.y - 220) })
	}
	// Forests scattered all over the middle.
	for (let i = 0; i < 6; i++) {
		seeds.push(...cluster('tree', rand(1500, 3300), rand(700, 2100), 8, 110))
	}
	// Just a couple of mines + one quarry in the middle.
	seeds.push({ kind: 'mine', x: 2400, y: rand(1100, 1700), remaining: 4500 })
	seeds.push({ kind: 'quarry', x: rand(1800, 3000), y: rand(900, 1900), remaining: 3500 })
	return toNodes(seeds)
}

// Quarry lands: stone is everywhere, gold is rare. Castle-heavy strategies
// shine; nations that don't pivot to stone struggle in the late game.
function generateQuarryLands(): ResourceNode[] {
	const seeds: Seed[] = []
	for (const c of PLAYER_CORNERS) {
		const home = jitter(c, 40)
		seeds.push(...cluster('tree', home.x + 320, home.y - 40, 6, 80))
		seeds.push({ kind: 'mine', x: clampX(home.x + 200), y: clampY(home.y - 200) })
		seeds.push({ kind: 'quarry', x: clampX(home.x + 460), y: clampY(home.y + 60) })
		seeds.push({ kind: 'quarry', x: clampX(home.x + 360), y: clampY(home.y + 280) })
	}
	// Stone-rich middle band.
	for (let i = 0; i < 5; i++) {
		seeds.push({
			kind: 'quarry',
			x: rand(1700, 3100),
			y: rand(800, 2000),
			remaining: 4500,
		})
	}
	seeds.push(...cluster('tree', rand(2200, 2600), rand(1100, 1700), 8, 130))
	seeds.push({ kind: 'mine', x: 2400, y: 1400, remaining: 6000 })
	return toNodes(seeds)
}

export const MAP_TYPES: MapType[] = [
	{
		id: 'continents',
		label: 'Continents',
		description:
			'A balanced classic. Trees and gold near every corner; stone and a contested forest in the middle.',
		generate: generateContinents,
	},
	{
		id: 'goldrush',
		label: 'Gold rush',
		description:
			'Gold-rich. Two mines per home base + a fat gold belt at the centre. Stone is scarce.',
		generate: generateGoldrush,
	},
	{
		id: 'heavy-forest',
		label: 'Heavy forest',
		description:
			'Slow economies. Forests everywhere, gold and stone rare. Walls and ambushes go a long way.',
		generate: generateHeavyForest,
	},
	{
		id: 'quarry-lands',
		label: 'Quarry lands',
		description: 'Stone is plentiful and gold is rare. Castles are the late-game power play.',
		generate: generateQuarryLands,
	},
]

const BY_ID = new Map(MAP_TYPES.map((m) => [m.id, m]))

export function getMapType(id: MapTypeId): MapType {
	const m = BY_ID.get(id)
	if (!m) throw new Error(`Unknown map type: ${id}`)
	return m
}

export function pickRandomMapType(): MapType {
	return MAP_TYPES[Math.floor(Math.random() * MAP_TYPES.length)]
}

// Backwards-compatible default seeder used for places that don't care about
// the chosen map type. Defaults to Continents (the original layout).
export function seedResources(): ResourceNode[] {
	return generateContinents()
}
