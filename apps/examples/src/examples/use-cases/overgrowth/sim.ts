import {
	AI_CORE_PULL,
	CELLS_PER_PULSE,
	CHARGE_NORM,
	CHOKE_THRESHOLD,
	CLAIM_CHARGE,
	CONNECTED_REGEN,
	CORE_HP,
	CORE_REGEN,
	CORE_SIEGE_RADIUS,
	cellOf,
	CUT_FLASH_TICKS,
	CUT_LOCKOUT_TICKS,
	GAP_SEEK_RADIUS,
	GAP_SEEK_WEIGHT,
	GRID,
	GROWTH_PULSE_INTERVAL,
	HYDRA_TIPS,
	makeStrand,
	OPENNESS_WEIGHT,
	MAX_TIPS_ADVANCED_PER_PULSE,
	ORPHAN_DECAY,
	Owner,
	Peg,
	publishScores,
	REACH_RADIUS,
	showHint,
	SIEGE_DMG,
	SIEGE_DMG_MAX,
	Spark,
	Strand,
	Tip,
	TIP_BRANCH_PROB,
	TIP_DEATH_PROB,
	TIP_JITTER,
	TIP_PERSISTENCE,
	World,
} from './game-state'

// ============================================================================
// TREE TOPOLOGY — THE key invariant
// ----------------------------------------------------------------------------
// Each color's living network is a strict FOREST: one tree rooted at its
// source. We NEVER add a vine to a peg already reached by that color, so there
// are no loops and no redundant cross-links. Every edge is therefore the sole
// connection of the subtree beyond it — cutting any vine disconnects everything
// past it from the source, which then withers. Depth of effect = where you cut.
//
// CONNECTIVITY drives life/death (not diffusion): each tick we BFS from each
// source over its living vines; reachable pegs of that color regen charge,
// orphaned ones decay fast to neutral.
// ============================================================================

const NEIGHBORS: Array<[number, number]> = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
	[1, 1],
	[1, -1],
	[-1, 1],
	[-1, -1],
]

function pegAt(world: World, c: number, r: number): Peg | null {
	if (c < 0 || c >= GRID.cols || r < 0 || r >= GRID.rows) return null
	return world.pegById.get(`peg:${c},${r}`) ?? null
}

// BFS from each source over living vines (peg.adj edges). Returns, per color,
// the set of peg ids reachable from that color's source. O(edges): each peg and
// edge is visited once per color, never O(pegs × strands).
function computeReachable(world: World): Record<Owner, Set<string>> {
	const result: Record<Owner, Set<string>> = { a: new Set(), b: new Set() }
	for (const owner of ['a', 'b'] as Owner[]) {
		const reach = result[owner]
		const sourceId = world.sources[owner]
		const source = world.pegById.get(sourceId)
		if (!source || source.owner !== owner) continue
		reach.add(sourceId)
		const queue: string[] = [sourceId]
		while (queue.length) {
			const id = queue.pop()!
			const peg = world.pegById.get(id)!
			for (const nId of peg.adj) {
				if (reach.has(nId)) continue
				const n = world.pegById.get(nId)
				// An edge always joins same-color pegs, but a peg can lose ownership
				// as it withers — so guard on current ownership.
				if (!n || n.owner !== owner) continue
				reach.add(nId)
				queue.push(nId)
			}
		}
	}
	return result
}

// Apply connectivity-driven life/death. Reachable pegs regen toward CLAIM_CHARGE
// (stay bright); orphaned pegs decay FAST and, once their charge falls below the
// ownership floor, relinquish the cell and its tree edges so it's reclaimable.
// Returns true if any peg lost ownership (graph changed → prune stranded tips).
function applyConnectivity(world: World, reachable: Record<Owner, Set<string>>): boolean {
	let changed = false
	for (const peg of world.pegs) {
		const owner = peg.owner
		if (!owner) continue
		const isSource = peg.id === world.sources[owner]
		const connected = isSource || reachable[owner].has(peg.id)
		if (connected) {
			peg.charge[owner] += (CLAIM_CHARGE - peg.charge[owner]) * CONNECTED_REGEN
			const other: Owner = owner === 'a' ? 'b' : 'a'
			peg.charge[other] *= ORPHAN_DECAY
			if (isSource) peg.charge[owner] = CLAIM_CHARGE
		} else {
			peg.charge[owner] *= ORPHAN_DECAY
			if (peg.charge[owner] < 0.05) {
				peg.charge[owner] = 0
				peg.owner = null
				peg.parent = null
				for (const nId of Array.from(peg.adj)) {
					const n = world.pegById.get(nId)
					if (n) n.adj.delete(peg.id)
					peg.adj.delete(nId)
				}
				changed = true
			}
		}
	}
	if (changed) dropDeadStrands(world)
	return changed
}

// Keep the strand list in sync after peg-level detachment: a strand survives
// only while both its endpoints still reference each other in adjacency.
function dropDeadStrands(world: World) {
	const alive: Strand[] = []
	for (const s of world.strands) {
		const a = s.aId ? world.pegById.get(s.aId) : null
		const b = s.bId ? world.pegById.get(s.bId) : null
		if (a && b && a.adj.has(b.id) && b.adj.has(a.id)) {
			alive.push(s)
		} else {
			world.strandById.delete(s.id)
		}
	}
	if (alive.length !== world.strands.length) world.strands = alive
}

// Remove tips no longer sitting on a living, same-color peg.
function pruneDeadTips(world: World) {
	world.tips = world.tips.filter((t) => {
		const peg = world.pegById.get(t.pegId)
		return peg && peg.owner === t.owner
	})
}

// ----------------------------------------------------------------------------
// SUBTREE SIZES — post-order over each source's tree, O(pegs).
// Every peg gets subtreeSize = itself + the sizes of its children (children =
// adjacent same-color pegs other than its parent). Drives vine thickness and the
// choke-vs-hydra decision. Recomputed whenever the graph changes (grow / cut /
// wither). We compute iteratively (no recursion) so deep trees can't blow the
// stack on a big board.
// ----------------------------------------------------------------------------
export function computeSubtreeSizes(world: World) {
	for (const owner of ['a', 'b'] as Owner[]) {
		const sourceId = world.sources[owner]
		const source = world.pegById.get(sourceId)
		if (!source || source.owner !== owner) continue

		// Establish parent pointers and a child ordering via BFS from the source
		// (this also re-roots the tree after a cut moved the source-connected side).
		const order: string[] = []
		const parentOf = new Map<string, string | null>()
		parentOf.set(sourceId, null)
		const queue: string[] = [sourceId]
		while (queue.length) {
			const id = queue.shift()!
			order.push(id)
			const peg = world.pegById.get(id)!
			peg.subtreeSize = 1 // reset; accumulate in the post-order pass below
			peg.parent = parentOf.get(id) ?? null
			for (const nId of peg.adj) {
				if (parentOf.has(nId)) continue
				const n = world.pegById.get(nId)
				if (!n || n.owner !== owner) continue
				parentOf.set(nId, id)
				queue.push(nId)
			}
		}
		// Post-order: walk BFS order in reverse, adding each node's size to its
		// parent. Reverse BFS guarantees children are processed before parents.
		for (let i = order.length - 1; i >= 0; i--) {
			const id = order[i]
			const parent = parentOf.get(id)
			if (!parent) continue
			const peg = world.pegById.get(id)!
			const par = world.pegById.get(parent)!
			par.subtreeSize += peg.subtreeSize
		}
	}
}

// Subtree size carried by a vine = the size of its CHILD peg's subtree (the part
// that would be orphaned if this vine were cut). The child is whichever endpoint
// has the other as its parent; default to bId (makeStrand stores parent=aId).
export function vineSubtreeSize(world: World, strand: Strand): number {
	const pa = strand.aId ? world.pegById.get(strand.aId) : null
	const pb = strand.bId ? world.pegById.get(strand.bId) : null
	if (pb && pa && pb.parent === pa.id) return pb.subtreeSize
	if (pa && pb && pa.parent === pb.id) return pa.subtreeSize
	// Re-rooting may have flipped parent/child; the smaller side is the subtree
	// that gets orphaned, so take the min as a safe estimate.
	return Math.min(pa?.subtreeSize ?? 0, pb?.subtreeSize ?? 0) || 1
}

// ============================================================================
// GROWTH — discrete pulse-waves of branching tendrils
// ----------------------------------------------------------------------------
// Every GROWTH_PULSE_INTERVAL ticks we fire ONE pulse: every active tip advances
// together (a visible surge), biased OUTWARD via its heading + directional
// persistence + jitter, branching and dying probabilistically so tendrils are
// chaotic and finite. Between pulses nothing grows, giving a prune window.
// ============================================================================

// Is a cell claimable by `owner` (open, not already its net, not enemy, not
// locked out)?
function isClaimable(world: World, owner: Owner, c: number, r: number): boolean {
	const to = pegAt(world, c, r)
	if (!to || to.blocked) return false
	if (to.owner === owner) return false
	if (to.owner === (owner === 'a' ? 'b' : 'a')) return false
	if (to.cutLockout > 0) return false
	return true
}

// Openness of a cell = how much open NEUTRAL (unowned, unblocked) ground is in
// its 3×3 neighbourhood. 0..8, normalized to 0..1. Cells leading into emptiness
// score high; cells wedged against the enemy seam or walls score low — so growth
// flows into gaps and open space instead of piling along the contact line.
function openness(world: World, c: number, r: number): number {
	let n = 0
	for (const [dc, dr] of NEIGHBORS) {
		const to = pegAt(world, c + dc, r + dr)
		if (to && !to.blocked && !to.owner) n++
	}
	return n / NEIGHBORS.length
}

// When a tip is obstructed straight ahead, find the direction (angle) toward the
// nearest reachable NEUTRAL cell within GAP_SEEK_RADIUS, walking only through
// open ground (a small bounded BFS). Returns null if no neutral cell is in
// reach. Lets a tip route around enemy/rock and probe through 1–2 cell holes
// instead of grinding sideways along the seam.
function gapDirection(world: World, owner: Owner, peg: Peg): number | null {
	const R = GAP_SEEK_RADIUS
	const seen = new Set<string>()
	const queue: Array<{ c: number; r: number; d: number }> = [{ c: peg.col, r: peg.row, d: 0 }]
	seen.add(peg.id)
	while (queue.length) {
		const cur = queue.shift()!
		if (cur.d >= R) continue
		for (const [dc, dr] of NEIGHBORS) {
			const nc = cur.c + dc
			const nr = cur.r + dr
			const to = pegAt(world, nc, nr)
			if (!to || to.blocked || seen.has(to.id)) continue
			seen.add(to.id)
			// A claimable neutral cell that we can actually grow into: aim here.
			if (!to.owner && to.cutLockout === 0) {
				return Math.atan2(nr - peg.row, nc - peg.col)
			}
			// Walk onward only through open ground (neutral cells), so we route
			// through gaps but don't tunnel through enemy/own territory.
			if (!to.owner) queue.push({ c: nc, r: nr, d: cur.d + 1 })
		}
	}
	return null
}

// Pick the claimable neighbour best aligned with `heading`, biased toward open
// neutral space (openness) and, when boxed in straight ahead, toward the nearest
// gap. Returns null if there is no claimable neighbour at all (truly boxed in).
function pickTarget(world: World, owner: Owner, peg: Peg, heading: number): Peg | null {
	const enemy: Owner = owner === 'a' ? 'b' : 'a'
	// Blue (the AI) pulls its growth toward the player's (red's) core.
	let pullAngle = 0
	let pullW = 0
	if (owner === 'b') {
		const target = world.pegById.get(world.sources.a)
		if (target) {
			pullAngle = Math.atan2(target.y - peg.y, target.x - peg.x)
			pullW = AI_CORE_PULL
		}
	}

	// Is the heading-forward arc blocked (no claimable cell within ±45°)? If so,
	// steer toward the nearest gap so the tip probes through holes instead of
	// sliding along the seam.
	let effHeading = heading
	let gapW = 0
	let forwardOpen = false
	for (const [dc, dr] of NEIGHBORS) {
		if (!isClaimable(world, owner, peg.col + dc, peg.row + dr)) continue
		const ang = Math.atan2(dr, dc)
		if (Math.cos(ang - heading) > 0.5) {
			forwardOpen = true
			break
		}
	}
	if (!forwardOpen) {
		const gap = gapDirection(world, owner, peg)
		if (gap !== null) {
			effHeading = gap
			gapW = GAP_SEEK_WEIGHT
		}
	}

	let best: Peg | null = null
	let bestScore = -Infinity
	for (const [dc, dr] of NEIGHBORS) {
		const to = pegAt(world, peg.col + dc, peg.row + dr)
		if (!to) continue
		if (to.blocked) continue // wall/obstacle
		if (to.owner === owner) continue // tree invariant: never re-enter own net
		if (to.owner === enemy) continue // can't grow into enemy's living tendrils
		if (to.cutLockout > 0) continue // freshly pruned: locked out
		const ang = Math.atan2(dr, dc)
		// Alignment with the (possibly gap-steered) heading.
		const align = (gapW ? gapW : 1) * Math.cos(ang - effHeading)
		// AI core-pull toward the player core.
		const pull = pullW ? pullW * Math.cos(ang - pullAngle) : 0
		// Openness: flow into open neutral space / gaps.
		const open = OPENNESS_WEIGHT * openness(world, to.col, to.row)
		const score = align + pull + open + Math.random() * 0.5
		if (score > bestScore) {
			bestScore = score
			best = to
		}
	}
	return best
}

// Extend one tip into `target`: claim the cell, add the tree edge, seed charge,
// and return the new heading (rotated toward the step taken, with persistence
// + jitter for organic wander).
function extendTip(world: World, owner: Owner, from: Peg, to: Peg, heading: number): number {
	to.owner = owner
	to.parent = from.id
	to.charge[owner] = Math.max(to.charge[owner], CLAIM_CHARGE * 0.6)
	const s = makeStrand(from, to, owner)
	world.strands.push(s)
	world.strandById.set(s.id, s)
	from.adj.add(to.id)
	to.adj.add(from.id)

	const stepAngle = Math.atan2(to.row - from.row, to.col - from.col)
	let next = heading * TIP_PERSISTENCE + stepAngle * (1 - TIP_PERSISTENCE)
	next += (Math.random() - 0.5) * TIP_JITTER
	return next
}

// Fire one growth pulse. All tips advance together (capped per color); some
// branch, some die; tips boxed in (no claimable neighbour) terminate.
function growthPulse(world: World) {
	const advancedThisPulse: Record<Owner, number> = { a: 0, b: 0 }
	const nextTips: Tip[] = []

	for (const tip of world.tips) {
		if (Math.random() < TIP_DEATH_PROB) continue // random termination

		const owner = tip.owner
		if (advancedThisPulse[owner] >= MAX_TIPS_ADVANCED_PER_PULSE) {
			nextTips.push(tip) // over the per-pulse cap: keep, don't advance now
			continue
		}
		let peg = world.pegById.get(tip.pegId)
		if (!peg || peg.owner !== owner) continue // tip's base died; drop it

		let heading = tip.heading
		let advanced = false
		for (let step = 0; step < CELLS_PER_PULSE; step++) {
			const target = pickTarget(world, owner, peg, heading)
			if (!target) break
			heading = extendTip(world, owner, peg, target, heading)
			peg = target
			advanced = true
			advancedThisPulse[owner]++
			if (advancedThisPulse[owner] >= MAX_TIPS_ADVANCED_PER_PULSE) break
		}

		if (!advanced) continue // boxed in everywhere → terminate

		nextTips.push({ owner, pegId: peg.id, heading })

		// Branch: occasionally fork a second tip at an angle for fractal vines.
		if (Math.random() < TIP_BRANCH_PROB) {
			const fork = heading + (Math.random() < 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.8)
			nextTips.push({ owner, pegId: peg.id, heading: fork })
		}
	}

	world.tips = nextTips

	// Keep each color's frontier ALIVE. Tips terminate when they hit walls / their
	// own net / the enemy, so a color that has filled its half would otherwise
	// stall far from the enemy core. Each pulse we top a color back up to
	// MIN_TIPS_PER_COLOR by spawning fresh tips on real FRONTIER pegs — owned pegs
	// that still have a claimable neighbour — headed toward the enemy core. This
	// is what lets growth keep pressing across contested ground (e.g. into a lane
	// the player just cut open) instead of freezing at the midline.
	for (const owner of ['a', 'b'] as Owner[]) {
		let count = 0
		for (const t of world.tips) if (t.owner === owner) count++
		if (count >= MIN_TIPS_PER_COLOR) continue
		const enemyCore = world.pegById.get(world.sources[owner === 'a' ? 'b' : 'a'])
		const need = MIN_TIPS_PER_COLOR - count
		const fresh = frontierPegs(world, owner, need)
		for (const peg of fresh) {
			const heading = enemyCore
				? Math.atan2(enemyCore.y - peg.y, enemyCore.x - peg.x)
				: Math.random() * Math.PI * 2
			world.tips.push({ owner, pegId: peg.id, heading })
		}
		// Fallback: nothing claimable anywhere (fully walled in) — re-seed at the
		// source so the color isn't permanently dead if ground later frees up.
		if (fresh.length === 0) {
			const src = world.pegById.get(world.sources[owner])
			if (src && src.owner === owner) {
				const heading = enemyCore ? Math.atan2(enemyCore.y - src.y, enemyCore.x - src.x) : 0
				world.tips.push({ owner, pegId: src.id, heading })
			}
		}
	}
}

// Minimum live tips to keep per color so the frontier never goes dormant.
const MIN_TIPS_PER_COLOR = 10

// Find up to `limit` owned FRONTIER pegs for `owner` — pegs that have at least
// one claimable neighbour (somewhere growth can still push). We scan owned pegs
// from a rotating offset and stop early once we have enough, so the cost is
// bounded and we don't always sample the same corner. Prefers pegs nearer the
// enemy core so re-seeded growth heads the right way.
function frontierPegs(world: World, owner: Owner, limit: number): Peg[] {
	const enemy: Owner = owner === 'a' ? 'b' : 'a'
	const enemyCore = world.pegById.get(world.sources[enemy])
	// Two tiers: pegs that can claim NEUTRAL ground right now (true frontier), and
	// pegs that merely border ENEMY ground (the contested front). We prefer the
	// former, but keep the latter so that the moment a cut/wither opens neutral
	// ground at the contested line, a live tip is already sitting there to take it.
	const open: Peg[] = []
	const contested: Peg[] = []
	const n = world.pegs.length
	const start = (world.tick * 131) % n
	for (let k = 0; k < n && open.length < limit * 6; k++) {
		const peg = world.pegs[(start + k) % n]
		if (peg.owner !== owner) continue
		let canClaim = false
		let bordersEnemy = false
		for (const [dc, dr] of NEIGHBORS) {
			const to = pegAt(world, peg.col + dc, peg.row + dr)
			if (!to || to.blocked) continue
			if (!to.owner && to.cutLockout === 0) canClaim = true
			else if (to.owner === enemy) bordersEnemy = true
		}
		if (canClaim) open.push(peg)
		else if (bordersEnemy) contested.push(peg)
	}
	// Rank open frontier pegs by a blend of OPENNESS (reseed into the largest
	// gaps/channels so the front breaks through rather than thickening) and
	// proximity to the enemy core (head the right way). Diagonal of the board is
	// the distance normalizer.
	const diag = Math.hypot(GRID.cols, GRID.rows)
	const score = (p: Peg) => {
		const op = openness(world, p.col, p.row)
		const near = enemyCore ? 1 - Math.hypot(p.col - enemyCore.col, p.row - enemyCore.row) / diag : 0
		return op * 1.5 + near
	}
	open.sort((p, q) => score(q) - score(p))
	if (open.length >= limit) return open.slice(0, limit)
	// Top up with contested-front pegs nearest the enemy core.
	if (enemyCore && contested.length > 1) {
		contested.sort(
			(p, q) =>
				Math.hypot(p.x - enemyCore.x, p.y - enemyCore.y) -
				Math.hypot(q.x - enemyCore.x, q.y - enemyCore.y)
		)
	}
	return open.concat(contested).slice(0, limit)
}

// ============================================================================
// CUTTING — gated by reach, shaped by choke vs hydra
// ----------------------------------------------------------------------------
// A slice severs vines it crosses, BUT the constraint system gates each one:
//  • Own vines: always cuttable (steering) — they just wither, never hydra.
//  • Enemy vines: only cuttable if you have PRESENCE (a living own vine within
//    REACH_RADIUS of the cut). Cutting a thick enemy choke (orphaned subtree ≥
//    CHOKE_THRESHOLD) is devastating; cutting a thin leaf HYDRA-backfires,
//    spawning new enemy tips on the surviving side so it regrows bushier.
// Zoom-lock is enforced by the caller (cuts ignored below CUT_ZOOM_MIN).
// ============================================================================

function segmentsIntersect(
	p1: { x: number; y: number },
	p2: { x: number; y: number },
	p3: { x: number; y: number },
	p4: { x: number; y: number }
) {
	const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x)
	if (d === 0) return false
	const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d
	const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d
	return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

// Does `owner` have a living vine peg within REACH_RADIUS of `point`? Scans only
// the grid cells within reach (O(cells in radius), never the whole board).
export function hasPresence(world: World, owner: Owner, point: { x: number; y: number }): boolean {
	const cells = Math.ceil(REACH_RADIUS / GRID.spacing)
	const c0 = Math.round((point.x - GRID.x0) / GRID.spacing)
	const r0 = Math.round((point.y - GRID.y0) / GRID.spacing)
	const r2 = REACH_RADIUS * REACH_RADIUS
	for (let dr = -cells; dr <= cells; dr++) {
		for (let dc = -cells; dc <= cells; dc++) {
			const peg = pegAt(world, c0 + dc, r0 + dr)
			if (!peg || peg.owner !== owner) continue
			const ddx = peg.x - point.x
			const ddy = peg.y - point.y
			if (ddx * ddx + ddy * ddy <= r2) return true
		}
	}
	return false
}

// BFS the orphaned subtree from a set of seed pegs over remaining edges, and
// remove any growth tips sitting on it. Used after a cut so severed branches
// stop growing immediately (even before they finish withering).
function killTipsOnOrphans(world: World, seeds: Peg[]) {
	if (seeds.length === 0) return
	const orphanSet = new Set<string>()
	const queue: string[] = []
	for (const p of seeds) {
		orphanSet.add(p.id)
		queue.push(p.id)
	}
	while (queue.length) {
		const id = queue.pop()!
		const peg = world.pegById.get(id)!
		for (const nId of peg.adj) {
			if (orphanSet.has(nId)) continue
			const n = world.pegById.get(nId)
			if (!n || n.owner !== peg.owner) continue
			orphanSet.add(nId)
			queue.push(nId)
		}
	}
	world.tips = world.tips.filter((t) => !orphanSet.has(t.pegId))
}

// Spawn HYDRA_TIPS new tips for `owner` from `peg` (the surviving, source-side
// wound), each headed outward away from the source so the enemy regrows bushier.
function spawnHydra(world: World, owner: Owner, peg: Peg) {
	const src = world.pegById.get(world.sources[owner])
	const baseHeading = src ? Math.atan2(peg.y - src.y, peg.x - src.x) : Math.random() * Math.PI * 2
	for (let i = 0; i < HYDRA_TIPS; i++) {
		const spread = (i - (HYDRA_TIPS - 1) / 2) * 0.8 + (Math.random() - 0.5) * 0.5
		world.tips.push({ owner, pegId: peg.id, heading: baseHeading + spread })
	}
}

export function sliceCut(
	world: World,
	a: { x: number; y: number },
	b: { x: number; y: number },
	cutter: Owner
) {
	const minC = Math.floor((Math.min(a.x, b.x) - GRID.x0) / GRID.spacing) - 1
	const maxC = Math.ceil((Math.max(a.x, b.x) - GRID.x0) / GRID.spacing) + 1
	const minR = Math.floor((Math.min(a.y, b.y) - GRID.y0) / GRID.spacing) - 1
	const maxR = Math.ceil((Math.max(a.y, b.y) - GRID.y0) / GRID.spacing) + 1

	const enemy: Owner = cutter === 'a' ? 'b' : 'a'

	const cut: Array<{ strand: Strand; mid: { x: number; y: number } }> = []
	for (const strand of world.strands) {
		const c = strand.cell % GRID.cols
		const r = (strand.cell / GRID.cols) | 0
		if (c < minC || c > maxC || r < minR || r > maxR) continue
		const pts = strand.points
		for (let i = 0; i < pts.length - 1; i++) {
			if (segmentsIntersect(a, b, pts[i], pts[i + 1])) {
				const mid = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 }
				cut.push({ strand, mid })
				break
			}
		}
	}
	if (cut.length === 0) return false

	const cutSet = new Set<string>()
	const orphanedChildren: Peg[] = []
	let outOfReach = false // hit an enemy vine we lacked presence to cut
	let choke = false // landed at least one real choke
	let hydra = false // backfired at least one leaf
	let didCut = false

	for (const { strand, mid } of cut) {
		const isEnemyVine = strand.owner === enemy
		// REACH GATE: enemy vines need presence; own/neutral vines are free to cut.
		if (isEnemyVine && !hasPresence(world, cutter, mid)) {
			outOfReach = true
			continue
		}

		// CHOKE vs HYDRA is decided from the to-be-orphaned subtree size, measured
		// BEFORE we detach the edge.
		const subtree = isEnemyVine ? vineSubtreeSize(world, strand) : 0

		cutSet.add(strand.id)
		world.strandById.delete(strand.id)
		const pa = strand.aId ? world.pegById.get(strand.aId) : null
		const pb = strand.bId ? world.pegById.get(strand.bId) : null
		if (pa && strand.bId) pa.adj.delete(strand.bId)
		if (pb && strand.aId) pb.adj.delete(strand.aId)
		if (pa) pa.cutLockout = Math.max(pa.cutLockout, CUT_LOCKOUT_TICKS)
		if (pb) pb.cutLockout = Math.max(pb.cutLockout, CUT_LOCKOUT_TICKS)
		didCut = true

		// Subtle "snip" flourish at the cut point (decoration; aged out in stepSim).
		world.flashes.push({ x: mid.x, y: mid.y, cell: cellOf(mid.x, mid.y), born: world.tick })

		// Identify child (orphaned) side and survivor (source) side.
		let child: Peg | null = null
		let survivor: Peg | null = null
		if (pb && pa && pb.parent === pa.id) {
			child = pb
			survivor = pa
		} else if (pa && pb && pa.parent === pb.id) {
			child = pa
			survivor = pb
		}
		if (child) {
			child.parent = null
			orphanedChildren.push(child)
		}

		// Enemy cut: choke if the orphaned subtree is big; otherwise hydra.
		if (isEnemyVine) {
			if (subtree >= CHOKE_THRESHOLD) {
				choke = true
			} else {
				hydra = true
				// Spawn the backfire on the SURVIVING, source-connected side.
				if (survivor && survivor.owner === enemy) spawnHydra(world, enemy, survivor)
			}
		}
	}

	if (!didCut) {
		// Everything we crossed was out of reach.
		if (outOfReach && cutter === 'a') showHint('out of reach — grow closer to cut', 'warn')
		return false
	}

	world.strands = world.strands.filter((s) => !cutSet.has(s.id))
	world.sparks = world.sparks.filter((sp) => !cutSet.has(sp.strandId))
	killTipsOnOrphans(world, orphanedChildren)

	// Graph changed — refresh subtree sizes so thickness/choke stay accurate.
	computeSubtreeSizes(world)

	// Player feedback so the rules are learnable. Hydra warning takes priority
	// (it's the surprising one), then choke success, then reach miss.
	if (cutter === 'a') {
		if (hydra) showHint('hydra! cut a thin branch — it grew back', 'warn')
		else if (choke) showHint('choke cut — branch severed', 'good')
		else if (outOfReach) showHint('out of reach — grow closer to cut', 'warn')
	}
	return true
}

// ============================================================================
// SPARKS — visual-only, bounded, viewport-local (model unchanged)
// ============================================================================

const SPARK_SPEED = 3.5 // page units per tick along a vine
export const SPARK_POOL = 140 // hard ceiling on live sparks

export function stepSparks(world: World, visibleStrandIds: Set<string>, want: number) {
	const next: Spark[] = []
	for (const spark of world.sparks) {
		const strand = world.strandById.get(spark.strandId)
		if (!strand) continue
		spark.dist += SPARK_SPEED
		if (spark.dist > strandTotalLength(strand)) continue
		next.push(spark)
	}
	world.sparks = next

	const target = Math.min(SPARK_POOL, want)
	if (world.sparks.length >= target || visibleStrandIds.size === 0) return

	const visible: Strand[] = []
	for (const id of visibleStrandIds) {
		const s = world.strandById.get(id)
		if (s && s.owner) visible.push(s)
	}
	if (visible.length === 0) return
	let toSpawn = target - world.sparks.length
	while (toSpawn-- > 0) {
		const strand = visible[(Math.random() * visible.length) | 0]
		world.sparks.push({
			strandId: strand.id,
			dir: Math.random() < 0.5 ? 1 : -1,
			dist: 0,
			owner: strand.owner!,
		})
	}
}

function strandTotalLength(strand: Strand): number {
	let total = 0
	const pts = strand.points
	for (let i = 0; i < pts.length - 1; i++) {
		total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)
	}
	return total
}

export function sparkPos(strand: Strand, dir: 1 | -1, dist: number) {
	const pts = strand.points
	let rem = dist
	if (dir === 1) {
		for (let i = 0; i < pts.length - 1; i++) {
			const a = pts[i]
			const b = pts[i + 1]
			const l = Math.hypot(b.x - a.x, b.y - a.y)
			if (rem <= l) {
				const t = l ? rem / l : 0
				return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
			}
			rem -= l
		}
		return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y }
	}
	for (let i = pts.length - 1; i > 0; i--) {
		const a = pts[i]
		const b = pts[i - 1]
		const l = Math.hypot(b.x - a.x, b.y - a.y)
		if (rem <= l) {
			const t = l ? rem / l : 0
			return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
		}
		rem -= l
	}
	return { x: pts[0].x, y: pts[0].y }
}

// ============================================================================
// SIEGE WIN CONDITION
// ----------------------------------------------------------------------------
// A core is UNDER SIEGE while enemy living vine-pegs sit within CORE_SIEGE_RADIUS
// of it. Each besieging peg deals SIEGE_DMG/tick, capped at SIEGE_DMG_MAX so a
// swarm isn't instant. Not under siege → the core regenerates toward CORE_HP. A
// core at 0 HP loses. The siege scan only looks at the cells within the (small)
// siege radius of each core — O(cells in radius), never O(pegs × strands).
// ============================================================================

// Count living enemy vine-pegs within CORE_SIEGE_RADIUS of `owner`'s core.
function countBesiegers(world: World, owner: Owner): number {
	const core = world.pegById.get(world.sources[owner])
	if (!core) return 0
	const enemy: Owner = owner === 'a' ? 'b' : 'a'
	const rad = CORE_SIEGE_RADIUS
	const cells = Math.ceil(rad)
	const r2 = rad * rad * GRID.spacing * GRID.spacing
	let count = 0
	for (let dr = -cells; dr <= cells; dr++) {
		for (let dc = -cells; dc <= cells; dc++) {
			const peg = pegAt(world, core.col + dc, core.row + dr)
			if (!peg || peg.owner !== enemy) continue
			const ddx = peg.x - core.x
			const ddy = peg.y - core.y
			if (ddx * ddx + ddy * ddy <= r2) count++
		}
	}
	return count
}

function checkWin(world: World) {
	if (world.winner) return
	for (const owner of ['a', 'b'] as Owner[]) {
		const besiegers = countBesiegers(world, owner)
		if (besiegers > 0) {
			world.coreHp[owner] -= Math.min(SIEGE_DMG_MAX, besiegers * SIEGE_DMG)
		} else if (world.coreHp[owner] < CORE_HP) {
			world.coreHp[owner] = Math.min(CORE_HP, world.coreHp[owner] + CORE_REGEN)
		}
	}
	// A fallen core means its owner loses, so the ENEMY wins.
	if (world.coreHp.a <= 0) {
		world.coreHp.a = 0
		world.winner = 'b'
	} else if (world.coreHp.b <= 0) {
		world.coreHp.b = 0
		world.winner = 'a'
	}
}

// ============================================================================
// MAIN TICK
// ============================================================================

// How often (ticks) to refresh subtree sizes when no cut happened. Growth and
// withering change the tree between cuts; we recompute on a light cadence (and
// always right after a cut, inside sliceCut) so thickness stays current without
// running the O(pegs) post-order every single tick.
const SUBTREE_REFRESH_TICKS = 6

export function stepSim(world: World) {
	if (world.winner) return
	world.tick++

	for (const peg of world.pegs) {
		if (peg.cutLockout > 0) peg.cutLockout--
	}

	// Age out expired cut-flash "snip" markers.
	if (world.flashes.length) {
		world.flashes = world.flashes.filter((f) => world.tick - f.born < CUT_FLASH_TICKS)
	}

	// Connectivity drives life/death every tick (cheap BFS over edges). If pegs
	// died, prune tips stranded on dead ground.
	const reachable = computeReachable(world)
	const died = applyConnectivity(world, reachable)
	if (died) pruneDeadTips(world)

	// Discrete growth pulses: fire only when the pulse timer rolls over.
	world.pulseTimer++
	let grew = false
	if (world.pulseTimer >= GROWTH_PULSE_INTERVAL) {
		world.pulseTimer = 0
		growthPulse(world)
		grew = true
	}

	// Keep subtree sizes (thickness + choke logic) current: always right after a
	// graph change (growth or peg death), else on a light cadence.
	if (grew || died || world.tick % SUBTREE_REFRESH_TICKS === 0) {
		computeSubtreeSizes(world)
	}

	checkWin(world)
	publishScores(world)
}

// NOTE: the AI (blue) no longer cuts. Blue competes purely by automatic
// pulse-wave growth, identical to red's — a spreading force of nature the player
// contains and beats by choke-cutting. The only entity that prunes is the human,
// so there is no `aiStep` and no AI cut constants.

export function chargeStrength(peg: Peg, owner: Owner) {
	return Math.min(1, peg.charge[owner] / CHARGE_NORM)
}
