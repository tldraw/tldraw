// ============================================================================
// MULTIPLAYER SNAPSHOT (de)serialization.
//
// The host runs the real sim and serializes its `world` to a compact blob that
// rides in a synced tldraw shape's `meta`; guests deserialize it back into a
// render-only `world` and draw it through the same overlay (which reads
// getWorld()). The encoding leans on one fact from the sim: a vine's parent is
// always one of the 8 ADJACENT cells (extendTip claims a neighbour), so the whole
// vine tree fits in one byte per cell:
//
//   bits 0-1  owner      (0 = neutral, 1 = a, 2 = b)
//   bits 2-5  parentDir  (0 = none/source, 1-8 = direction to parent cell)
//   bit  6    blocked    (rock)
//
// 80×80 = 6400 cells → ~6.4 KB raw, base64 in the shape meta, rewritten only on
// growth pulses / cuts (a few times a second), not every frame.
// ============================================================================
import { CLAIM_CHARGE, GRID, makeStrand, Owner, Peg, Strand, World } from '../overgrowth/game-state'
import { computeSubtreeSizes } from '../overgrowth/sim'

// 8-neighbour offsets; index i → parentDir code (i + 1). 0 means "no parent".
const DIRS: Array<[number, number]> = [
	[-1, -1],
	[0, -1],
	[1, -1],
	[-1, 0],
	[1, 0],
	[-1, 1],
	[0, 1],
	[1, 1],
]

const OWNER_NUM: Record<Owner, number> = { a: 1, b: 2 }
const ownerFromNum = (n: number): Owner | null => (n === 1 ? 'a' : n === 2 ? 'b' : null)

export interface WorldSnapshot {
	v: 1
	tick: number
	hpA: number
	hpB: number
	sourceA: string
	sourceB: string
	winner: Owner | null
	cells: string // base64 of one byte per cell
	tips: Array<[number, number]> // [cellIndex, ownerNum]
}

function b64encode(bytes: Uint8Array): string {
	let s = ''
	for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
	return btoa(s)
}

function b64decode(str: string): Uint8Array {
	const s = atob(str)
	const a = new Uint8Array(s.length)
	for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i)
	return a
}

// Serialize the host's live world into a compact, structured snapshot.
export function serializeWorld(world: World): WorldSnapshot {
	const { cols, rows } = GRID
	const cells = new Uint8Array(cols * rows)
	for (const peg of world.pegs) {
		const idx = peg.row * cols + peg.col
		let dir = 0
		if (peg.parent) {
			const p = world.pegById.get(peg.parent)
			if (p) {
				const dc = p.col - peg.col
				const dr = p.row - peg.row
				const i = DIRS.findIndex(([oc, or]) => oc === dc && or === dr)
				if (i >= 0) dir = i + 1
			}
		}
		const ownerNum = peg.owner ? OWNER_NUM[peg.owner] : 0
		cells[idx] = ownerNum | (dir << 2) | ((peg.blocked ? 1 : 0) << 6)
	}

	const tips: Array<[number, number]> = []
	for (const tip of world.tips) {
		const peg = world.pegById.get(tip.pegId)
		if (peg) tips.push([peg.row * cols + peg.col, OWNER_NUM[tip.owner]])
	}

	return {
		v: 1,
		tick: world.tick,
		hpA: world.coreHp.a,
		hpB: world.coreHp.b,
		sourceA: world.sources.a,
		sourceB: world.sources.b,
		winner: world.winner,
		cells: b64encode(cells),
		tips,
	}
}

// Rebuild a render-only world from a snapshot. It carries everything the overlay
// needs (peg ownership + the vine tree + cores + tips); charge is set full for
// owned pegs (guests don't render the wither gradient), and vine geometry is
// regenerated locally (the wiggle is cosmetic, so per-client variation is fine).
export function deserializeWorld(snap: WorldSnapshot): World {
	const { cols, rows, spacing, x0, y0 } = GRID
	const bytes = b64decode(snap.cells)

	const pegs: Peg[] = []
	const pegById = new Map<string, Peg>()
	const dirOf = new Int8Array(cols * rows) // remember parentDir for a second pass

	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const idx = r * cols + c
			const byte = bytes[idx] ?? 0
			const owner = ownerFromNum(byte & 3)
			dirOf[idx] = (byte >> 2) & 15
			const peg: Peg = {
				id: `peg:${c},${r}`,
				x: x0 + c * spacing,
				y: y0 + r * spacing,
				col: c,
				row: r,
				owner,
				parent: null,
				charge: {
					a: owner === 'a' ? CLAIM_CHARGE : 0,
					b: owner === 'b' ? CLAIM_CHARGE : 0,
				},
				cutLockout: 0,
				adj: new Set<string>(),
				subtreeSize: 1,
				blocked: !!((byte >> 6) & 1),
			}
			pegs.push(peg)
			pegById.set(peg.id, peg)
		}
	}

	// Second pass: resolve parents + adjacency from the stored directions.
	const strands: Strand[] = []
	const strandById = new Map<string, Strand>()
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const idx = r * cols + c
			const dir = dirOf[idx]
			if (!dir) continue
			const [dc, dr] = DIRS[dir - 1]
			const child = pegById.get(`peg:${c},${r}`)!
			const parent = pegById.get(`peg:${c + dc},${r + dr}`)
			if (!parent) continue
			child.parent = parent.id
			child.adj.add(parent.id)
			parent.adj.add(child.id)
			const s = makeStrand(parent, child, child.owner)
			strands.push(s)
			strandById.set(s.id, s)
		}
	}

	const world: World = {
		pegs,
		pegById,
		strands,
		strandById,
		tips: snap.tips.map(([cell, ownerNum]) => ({
			owner: ownerFromNum(ownerNum) as Owner,
			pegId: `peg:${cell % cols},${(cell / cols) | 0}`,
			heading: 0,
		})),
		sparks: [],
		flashes: [],
		sources: { a: snap.sourceA, b: snap.sourceB },
		coreHp: { a: snap.hpA, b: snap.hpB },
		tick: snap.tick,
		pulseTimer: 0,
		winner: snap.winner,
		slicing: false,
	}

	// Recompute subtree sizes so vine thickness (trunks vs leaves) reads correctly.
	computeSubtreeSizes(world)
	return world
}
