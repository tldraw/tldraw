import { Block, BOUNDS, Hole, MAX_ACTIVE, misses$, score$, World } from './game-state'

// Timings, in seconds.
const SPAWN_GAP = 0.55 // pause between one mole retreating and the next emerging
const RISE = 0.16 // time to rise from one height to the next
const PEEK_POP = 0.45 // how far out the mole peeks before committing
const PEEK_TIME = 0.4 // telegraph window: mole sits at peek height this long
const OUT_TIME = 1.9 // total scorable time before the mole escapes (a miss)
const RETREAT = 0.18 // time to sink back down

// Physics.
const FRICTION = 3.0 // velocity decay; higher = blocks stop sooner
const WALL_BOUNCE = 0.6 // velocity kept after hitting a soft wall
const SHOVE_SPEED = 560 // how hard a bonked mole punches a block off its hole
const THROW_MAX = 2600 // cap on flick velocity, page units/sec

const cx = (b: Block) => b.x + b.w / 2
const cy = (b: Block) => b.y + b.h / 2

// How far the mole's center sticks up out of the hole, 0..1, as a function of
// its age. It rises to a low peek (telegraph), holds, then commits to full out.
function popFor(t: number): number {
	if (t < RISE) return (t / RISE) * PEEK_POP
	if (t < PEEK_TIME) return PEEK_POP
	if (t < PEEK_TIME + RISE) return PEEK_POP + ((t - PEEK_TIME) / RISE) * (1 - PEEK_POP)
	return 1
}

// A hole is covered when some block's rect contains the hole center (inset a
// little, so the block has to actually sit over the hole, not just graze it).
function coveringBlock(world: World, hole: Hole): Block | undefined {
	const m = 10
	return world.blocks.find(
		(b) =>
			hole.x >= b.x + m && hole.x <= b.x + b.w - m && hole.y >= b.y + m && hole.y <= b.y + b.h - m
	)
}

export function stepWorld(world: World, dt: number) {
	stepMoles(world, dt)
	stepSpawner(world, dt)
	stepBlocks(world, dt)
}

function stepMoles(world: World, dt: number) {
	for (const hole of world.holes) {
		const mole = hole.mole
		if (!mole) continue
		mole.t += dt

		if (mole.phase === 'out') {
			mole.pop = popFor(mole.t)
			const block = coveringBlock(world, hole)
			if (block) {
				// Bonk: a block came down over the mole. It scores — but on the way
				// down it shoves the block off the hole, unless you're pinning it by
				// hand. So a dropped block never stays parked.
				score$.set(score$.get() + 1)
				mole.phase = 'retreat'
				if (world.grab?.blockId !== block.id) shove(block, hole)
			} else if (mole.t >= OUT_TIME) {
				misses$.set(misses$.get() + 1)
				mole.phase = 'retreat'
			}
		} else {
			mole.pop -= dt / RETREAT
			if (mole.pop <= 0) hole.mole = null
		}
	}
}

// Punch a block away from a hole center, with a little random spin so shoves
// scatter unpredictably.
function shove(block: Block, hole: Hole) {
	let dx = cx(block) - hole.x
	let dy = cy(block) - hole.y
	const len = Math.hypot(dx, dy) || 1
	dx /= len
	dy /= len
	const ang = (Math.random() - 0.5) * 0.8
	const rx = dx * Math.cos(ang) - dy * Math.sin(ang)
	const ry = dx * Math.sin(ang) + dy * Math.cos(ang)
	block.vx += rx * SHOVE_SPEED
	block.vy += ry * SHOVE_SPEED
}

function stepSpawner(world: World, dt: number) {
	const active = world.holes.filter((h) => h.mole).length
	if (active >= MAX_ACTIVE) return
	world.spawnTimer -= dt
	if (world.spawnTimer > 0) return

	const open = world.holes.filter((h) => !h.mole)
	if (!open.length) return
	// Cheeky targeting: pop wherever is farthest from any block, so the player
	// has to run. A covered hole scores ~0 distance and is naturally avoided.
	const dist = (h: Hole) =>
		Math.min(...world.blocks.map((b) => Math.hypot(cx(b) - h.x, cy(b) - h.y))) + Math.random() * 60
	const pick = open.reduce((best, h) => (dist(h) > dist(best) ? h : best))
	pick.mole = { t: 0, phase: 'out', pop: 0 }
	world.spawnTimer = SPAWN_GAP
}

function stepBlocks(world: World, dt: number) {
	const damp = Math.exp(-FRICTION * dt)
	for (const b of world.blocks) {
		if (world.grab?.blockId === b.id) continue // held block is driven by the pointer
		b.x += b.vx * dt
		b.y += b.vy * dt
		b.vx *= damp
		b.vy *= damp
		bounceWalls(b)
	}
	collideBlocks(world)
}

// Reflect a block off the soft play-area walls (measured at its center).
function bounceWalls(b: Block) {
	const hw = b.w / 2
	const hh = b.h / 2
	if (cx(b) < BOUNDS.minX + hw) {
		b.x = BOUNDS.minX
		b.vx = Math.abs(b.vx) * WALL_BOUNCE
	} else if (cx(b) > BOUNDS.maxX - hw) {
		b.x = BOUNDS.maxX - b.w
		b.vx = -Math.abs(b.vx) * WALL_BOUNCE
	}
	if (cy(b) < BOUNDS.minY + hh) {
		b.y = BOUNDS.minY
		b.vy = Math.abs(b.vy) * WALL_BOUNCE
	} else if (cy(b) > BOUNDS.maxY - hh) {
		b.y = BOUNDS.maxY - b.h
		b.vy = -Math.abs(b.vy) * WALL_BOUNCE
	}
}

// Elastic collision between blocks, approximated as equal-mass circles. A held
// block is treated as immovable, so the player can bulldoze others with it.
function collideBlocks(world: World) {
	const r = world.blocks[0].w / 2
	for (let i = 0; i < world.blocks.length; i++) {
		for (let j = i + 1; j < world.blocks.length; j++) {
			const a = world.blocks[i]
			const b = world.blocks[j]
			let nx = cx(b) - cx(a)
			let ny = cy(b) - cy(a)
			const d = Math.hypot(nx, ny) || 1
			const overlap = 2 * r - d
			if (overlap <= 0) continue
			nx /= d
			ny /= d

			const aHeld = world.grab?.blockId === a.id
			const bHeld = world.grab?.blockId === b.id
			// Separate along the collision normal.
			if (aHeld && !bHeld) {
				b.x += nx * overlap
				b.y += ny * overlap
			} else if (bHeld && !aHeld) {
				a.x -= nx * overlap
				a.y -= ny * overlap
			} else if (!aHeld && !bHeld) {
				a.x -= nx * (overlap / 2)
				a.y -= ny * (overlap / 2)
				b.x += nx * (overlap / 2)
				b.y += ny * (overlap / 2)
			}

			// Exchange velocity along the normal (equal-mass elastic); a held
			// block donates the pointer's motion but takes none back.
			const av = a.vx * nx + a.vy * ny
			const bv = b.vx * nx + b.vy * ny
			if (av - bv <= 0) continue // already separating
			const diff = av - bv
			if (!aHeld) {
				a.vx -= diff * nx
				a.vy -= diff * ny
			}
			if (!bHeld) {
				b.vx += diff * nx
				b.vy += diff * ny
			}
		}
	}
}

// --- pointer interaction: drag, throw, and bulldoze a block ---

function blockAt(world: World, p: { x: number; y: number }): Block | undefined {
	for (let i = world.blocks.length - 1; i >= 0; i--) {
		const b = world.blocks[i]
		if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b
	}
	return undefined
}

export function tryGrab(world: World, p: { x: number; y: number }): boolean {
	const b = blockAt(world, p)
	if (!b) return false
	world.grab = { blockId: b.id, dx: p.x - b.x, dy: p.y - b.y }
	b.vx = 0
	b.vy = 0
	// Bring the grabbed block to the front.
	world.blocks.splice(world.blocks.indexOf(b), 1)
	world.blocks.push(b)
	return true
}

export function dragGrab(world: World, p: { x: number; y: number }) {
	if (!world.grab) return
	const b = world.blocks.find((b) => b.id === world.grab!.blockId)
	if (!b) return
	b.x = p.x - world.grab.dx
	b.y = p.y - world.grab.dy
}

// Release the held block, launching it with the flick velocity from the drag.
export function releaseGrab(world: World, vx: number, vy: number) {
	if (!world.grab) return
	const b = world.blocks.find((b) => b.id === world.grab!.blockId)
	if (b) {
		const speed = Math.hypot(vx, vy)
		const scale = speed > THROW_MAX ? THROW_MAX / speed : 1
		b.vx = vx * scale
		b.vy = vy * scale
	}
	world.grab = null
}
