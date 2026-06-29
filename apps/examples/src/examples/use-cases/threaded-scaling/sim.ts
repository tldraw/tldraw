import { EASE_BASE, EASE_FALLOFF, EASE_MIN, MAX_R, MIN_R, Node, START_R, World } from './game-state'

// Pure logic: graph topology + the conserved-flow solve + pointer interaction.
// No tldraw, no React.

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

// ---- graph helpers ----------------------------------------------------------

function adjacency(world: World): Map<string, string[]> {
	const adj = new Map<string, string[]>()
	for (const n of world.nodes) adj.set(n.id, [])
	for (const t of world.threads) {
		adj.get(t.a)!.push(t.b)
		adj.get(t.b)!.push(t.a)
	}
	return adj
}

// Breadth-first hop distance from `startId` to every node reachable from it.
function hopsFrom(world: World, startId: string, adj: Map<string, string[]>): Map<string, number> {
	const dist = new Map<string, number>([[startId, 0]])
	const queue = [startId]
	while (queue.length) {
		const id = queue.shift()!
		const d = dist.get(id)!
		for (const nb of adj.get(id)!) {
			if (!dist.has(nb)) {
				dist.set(nb, d + 1)
				queue.push(nb)
			}
		}
	}
	return dist
}

// Assign each node a connected-group index from the thread graph.
function assignGroups(world: World, adj: Map<string, string[]>): void {
	const seen = new Set<string>()
	let g = 0
	for (const node of world.nodes) {
		if (seen.has(node.id)) continue
		const reach = hopsFrom(world, node.id, adj)
		for (const id of reach.keys()) {
			seen.add(id)
			world.nodes.find((n) => n.id === id)!.group = g
		}
		g++
	}
	world.totals = []
	for (const n of world.nodes) world.totals[n.group] = (world.totals[n.group] ?? 0) + n.goal
}

// ---- the conserved-flow solve ----------------------------------------------

// Drive `node` toward `desired` by exchanging size with its DIRECT neighbours
// only. Growing pulls size out of adjacent nodes (never below MIN); shrinking
// pushes it into them (never above MAX). Because size only ever moves one thread
// at a time, reaching a distant node means walking size across the graph — so
// the wiring and the order of pulls are the puzzle. Group total stays fixed.
// Also stamps every node's `hop` for the ripple ease.
export function applyDrag(world: World, node: Node, desired: number): void {
	const adj = adjacency(world)
	const hops = hopsFrom(world, node.id, adj)
	for (const n of world.nodes) n.hop = hops.get(n.id) ?? 99

	const byId = new Map(world.nodes.map((n) => [n.id, n]))
	const neighbours = adj.get(node.id)!.map((id) => byId.get(id)!)
	if (neighbours.length === 0) return

	const want = clamp(desired, MIN_R, MAX_R) - node.goal
	if (want > 0) {
		// Grow: pull from neighbours, capped by how much they can spare.
		const spare = neighbours.map((n) => n.goal - MIN_R)
		const avail = spare.reduce((s, v) => s + v, 0)
		const delta = Math.min(want, avail)
		if (avail > 1e-6) {
			neighbours.forEach((n, i) => (n.goal -= delta * (spare[i] / avail)))
		}
		node.goal += delta
	} else if (want < 0) {
		// Shrink: push into neighbours, capped by how much they can take.
		const room = neighbours.map((n) => MAX_R - n.goal)
		const avail = room.reduce((s, v) => s + v, 0)
		const delta = Math.min(-want, avail)
		if (avail > 1e-6) {
			neighbours.forEach((n, i) => (n.goal += delta * (room[i] / avail)))
		}
		node.goal -= delta
	}
}

// ---- puzzle generation ------------------------------------------------------

// Build a solvable board: start every node flat, replay a fixed script of drags
// to scatter size through the graph, freeze the result as the targets, then snap
// the visible board back to flat. Because the targets are the output of real
// drags, the same route (and usually others) solves it.
export const SCRIPT: Array<[string, number]> = [
	// Spine — walk size toward both ends so the middle must be routed through.
	['sp-0', 110],
	['sp-1', 104],
	['sp-4', 100],
	['sp-3', 85],
	// Star — load one spoke, redistribute via the hub, then pull another spoke.
	['h-1', 110],
	['hub', 90],
	['h-4', 100],
]

export function initPuzzle(world: World): void {
	const adj = adjacency(world)
	assignGroups(world, adj)

	for (const [id, size] of SCRIPT) {
		const node = world.nodes.find((n) => n.id === id)
		if (node) applyDrag(world, node, size)
	}
	for (const n of world.nodes) n.target = n.goal

	// Snap the playable board back to a flat start (totals are preserved, so the
	// targets remain reachable).
	for (const n of world.nodes) {
		n.r = START_R
		n.goal = START_R
		n.hop = 0
	}
	world.grabbedId = null
}

// ---- per-tick + pointer -----------------------------------------------------

// Ease drawn radii toward goals; nearer-to-the-pull nodes move faster, so a
// transfer reads as a wave travelling out along the threads.
export function stepWorld(world: World): void {
	world.t += 1
	for (const n of world.nodes) {
		const speed = Math.max(EASE_MIN, EASE_BASE * Math.pow(EASE_FALLOFF, n.hop))
		n.r += (n.goal - n.r) * speed
		if (Math.abs(n.goal - n.r) < 0.05) n.r = n.goal
	}
}

// Pick the node under the pointer (within its drawn radius plus a grab margin).
export function grabNode(world: World, p: { x: number; y: number }, margin: number): boolean {
	let best: Node | null = null
	let bestDist = Infinity
	for (const n of world.nodes) {
		const d = Math.hypot(p.x - n.x, p.y - n.y)
		if (d < n.r + margin && d < bestDist) {
			bestDist = d
			best = n
		}
	}
	if (!best) return false
	world.grabbedId = best.id
	return true
}

// Radial resize: the pointer's distance from the node centre is its desired size.
export function dragNode(world: World, p: { x: number; y: number }): void {
	if (!world.grabbedId) return
	const node = world.nodes.find((n) => n.id === world.grabbedId)
	if (!node) return
	applyDrag(world, node, Math.hypot(p.x - node.x, p.y - node.y))
}

export function releaseNode(world: World): void {
	world.grabbedId = null
}
