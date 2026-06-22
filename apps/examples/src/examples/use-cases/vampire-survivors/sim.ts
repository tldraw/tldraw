// The game simulation: pure, framework-free, no tldraw imports. It owns the
// whole game state (`World`) and advances it one frame at a time. Rendering and
// input live in the tldraw glue (VampireSurvivorsExample.tsx); this file just
// moves numbers around so it stays testable and renderer-agnostic — the same
// `World` could drive the top-down view we ship or a future raycast view.

import { Player, Segment, blocked, createPlayer, faceDirection } from './engine'

export interface Enemy {
	id: number
	x: number
	y: number
	hp: number
	maxHp: number
	speed: number
	radius: number
	damage: number // contact damage per second
	xp: number // dropped as a gem on death
}

export interface Projectile {
	id: number
	x: number
	y: number
	vx: number
	vy: number
	damage: number
	radius: number
	pierce: number // how many more enemies it can pass through
	ageMs: number
	hitIds: number[] // enemies already hit, so pierce doesn't double-hit
}

export interface Gem {
	id: number
	x: number
	y: number
	xp: number
	homing: boolean // flips true once the player's pickup field reaches it
}

export interface Weapon {
	cooldownMs: number
	lastFiredAt: number
	count: number // projectiles per volley
	damage: number
	speed: number
	pierce: number
}

export interface MoveInput {
	up: boolean
	down: boolean
	left: boolean
	right: boolean
}

export interface World {
	player: Player
	hp: number
	maxHp: number
	moveSpeed: number
	radius: number
	pickupRadius: number
	weapon: Weapon
	enemies: Enemy[]
	projectiles: Projectile[]
	gems: Gem[]
	timeMs: number
	kills: number
	level: number
	xp: number
	xpToNext: number
	lastSpawnAt: number
	gameOver: boolean
	// Set true when xp crosses the threshold. The host pauses, shows the upgrade
	// menu, calls applyUpgrade(), and that clears the flag and resumes.
	pendingLevelUp: boolean
}

// --- tuning -----------------------------------------------------------------

const PLAYER_RADIUS = 18
const PLAYER_MAX_HP = 100
const PLAYER_SPEED = 190 // page units / second
const TURN_RATE = 7 // radians / second the first-person camera can pan

const SPAWN_RADIUS = 560 // enemies appear this far from the player (just offscreen)
const SPAWN_BASE_INTERVAL_MS = 650
const SPAWN_FLOOR_MS = 130
const SPAWN_RAMP = 0.00045 // shaves the interval as the run goes on

const ENEMY_BASE_HP = 16
const ENEMY_HP_RAMP = 0.04 // per second of game time
const ENEMY_BASE_SPEED = 62
const ENEMY_RADIUS = 14
const ENEMY_CONTACT_DPS = 16

const PROJECTILE_RADIUS = 6
const PROJECTILE_MAX_AGE_MS = 1600
const PROJECTILE_SPREAD = 0.18 // radians between multishot pellets

const GEM_HOMING_SPEED = 560
const GEM_COLLECT_RADIUS = 26

let nextId = 1
function genId() {
	return nextId++
}

export function createWorld(): World {
	nextId = 1
	return {
		player: createPlayer(0, 0),
		hp: PLAYER_MAX_HP,
		maxHp: PLAYER_MAX_HP,
		moveSpeed: PLAYER_SPEED,
		radius: PLAYER_RADIUS,
		pickupRadius: 120,
		weapon: { cooldownMs: 560, lastFiredAt: 0, count: 1, damage: 18, speed: 430, pierce: 0 },
		enemies: [],
		projectiles: [],
		gems: [],
		timeMs: 0,
		kills: 0,
		level: 1,
		xp: 0,
		xpToNext: 5,
		lastSpawnAt: 0,
		gameOver: false,
		pendingLevelUp: false,
	}
}

// Advance the world by `dtMs` milliseconds. No-op while the game is over or a
// level-up menu is pending, so the action freezes behind the menu.
export function stepWorld(world: World, input: MoveInput, dtMs: number, walls: Segment[]) {
	if (world.gameOver || world.pendingLevelUp) return
	const dt = dtMs / 1000
	world.timeMs += dtMs

	movePlayer(world, input, dt, walls)
	maybeSpawn(world)
	moveEnemies(world, dt)
	fireWeapon(world)
	moveProjectiles(world, dt)
	resolveHits(world)
	contactDamage(world, dt)
	updateGems(world, dt)
	checkLevelUp(world)

	if (world.hp <= 0) {
		world.hp = 0
		world.gameOver = true
	}
}

function movePlayer(world: World, input: MoveInput, dt: number, walls: Segment[]) {
	const p = world.player
	let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0)
	let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0)
	if (dx === 0 && dy === 0) return

	const len = Math.hypot(dx, dy)
	dx /= len
	dy /= len

	// Rotate the facing smoothly toward the movement direction so the
	// first-person camera pans rather than snapping when you change heading.
	const target = Math.atan2(dy, dx)
	const current = Math.atan2(p.dirY, p.dirX)
	let delta = target - current
	while (delta > Math.PI) delta -= Math.PI * 2
	while (delta < -Math.PI) delta += Math.PI * 2
	const maxTurn = TURN_RATE * dt
	const angle = current + Math.max(-maxTurn, Math.min(maxTurn, delta))
	faceDirection(p, Math.cos(angle), Math.sin(angle))

	const step = world.moveSpeed * dt
	// Resolve each axis separately so the player slides along walls instead of
	// sticking. With no walls drawn this is just free movement.
	const nx = p.x + dx * step
	const ny = p.y + dy * step
	if (!blocked(walls, nx, p.y, world.radius)) p.x = nx
	if (!blocked(walls, p.x, ny, world.radius)) p.y = ny
}

function maybeSpawn(world: World) {
	const interval = Math.max(SPAWN_FLOOR_MS, SPAWN_BASE_INTERVAL_MS - world.timeMs * SPAWN_RAMP)
	if (world.timeMs - world.lastSpawnAt < interval) return
	world.lastSpawnAt = world.timeMs

	// Spawn a small cluster that grows over the run.
	const count = 1 + Math.floor(world.timeMs / 18000)
	const seconds = world.timeMs / 1000
	const maxHp = Math.round(ENEMY_BASE_HP * (1 + seconds * ENEMY_HP_RAMP))
	for (let i = 0; i < count; i++) {
		const angle = Math.random() * Math.PI * 2
		world.enemies.push({
			id: genId(),
			x: world.player.x + Math.cos(angle) * SPAWN_RADIUS,
			y: world.player.y + Math.sin(angle) * SPAWN_RADIUS,
			hp: maxHp,
			maxHp,
			speed: ENEMY_BASE_SPEED + Math.random() * 22,
			radius: ENEMY_RADIUS,
			damage: ENEMY_CONTACT_DPS,
			xp: 1,
		})
	}
}

function moveEnemies(world: World, dt: number) {
	const { x: px, y: py } = world.player
	for (const e of world.enemies) {
		const dx = px - e.x
		const dy = py - e.y
		const dist = Math.hypot(dx, dy) || 1
		const step = e.speed * dt
		e.x += (dx / dist) * step
		e.y += (dy / dist) * step
	}
}

function fireWeapon(world: World) {
	const w = world.weapon
	if (world.timeMs - w.lastFiredAt < w.cooldownMs) return
	const target = nearestEnemy(world)
	if (!target) return
	w.lastFiredAt = world.timeMs

	const { x: px, y: py } = world.player
	const baseAngle = Math.atan2(target.y - py, target.x - px)
	// Center the spread fan on the aim direction.
	const start = baseAngle - (PROJECTILE_SPREAD * (w.count - 1)) / 2
	for (let i = 0; i < w.count; i++) {
		const a = start + i * PROJECTILE_SPREAD
		world.projectiles.push({
			id: genId(),
			x: px,
			y: py,
			vx: Math.cos(a) * w.speed,
			vy: Math.sin(a) * w.speed,
			damage: w.damage,
			radius: PROJECTILE_RADIUS,
			pierce: w.pierce,
			ageMs: 0,
			hitIds: [],
		})
	}
}

function nearestEnemy(world: World): Enemy | null {
	const { x: px, y: py } = world.player
	let best: Enemy | null = null
	let bestD = Infinity
	for (const e of world.enemies) {
		const d = (e.x - px) ** 2 + (e.y - py) ** 2
		if (d < bestD) {
			bestD = d
			best = e
		}
	}
	return best
}

function moveProjectiles(world: World, dt: number) {
	const next: Projectile[] = []
	for (const p of world.projectiles) {
		const ageMs = p.ageMs + dt * 1000
		if (ageMs > PROJECTILE_MAX_AGE_MS) continue
		p.x += p.vx * dt
		p.y += p.vy * dt
		p.ageMs = ageMs
		next.push(p)
	}
	world.projectiles = next
}

function resolveHits(world: World) {
	if (world.projectiles.length === 0 || world.enemies.length === 0) return
	const deadEnemyIds = new Set<number>()
	const spentProjectileIds = new Set<number>()

	for (const p of world.projectiles) {
		for (const e of world.enemies) {
			if (deadEnemyIds.has(e.id) || p.hitIds.includes(e.id)) continue
			const rr = p.radius + e.radius
			if ((p.x - e.x) ** 2 + (p.y - e.y) ** 2 > rr * rr) continue

			e.hp -= p.damage
			p.hitIds.push(e.id)
			if (e.hp <= 0) {
				deadEnemyIds.add(e.id)
				world.kills++
				world.gems.push({ id: genId(), x: e.x, y: e.y, xp: e.xp, homing: false })
			}
			if (p.pierce <= 0) {
				spentProjectileIds.add(p.id)
				break
			}
			p.pierce--
		}
	}

	if (deadEnemyIds.size) world.enemies = world.enemies.filter((e) => !deadEnemyIds.has(e.id))
	if (spentProjectileIds.size)
		world.projectiles = world.projectiles.filter((p) => !spentProjectileIds.has(p.id))
}

function contactDamage(world: World, dt: number) {
	const { x: px, y: py } = world.player
	for (const e of world.enemies) {
		const rr = world.radius + e.radius
		if ((e.x - px) ** 2 + (e.y - py) ** 2 <= rr * rr) {
			world.hp -= e.damage * dt
		}
	}
}

function updateGems(world: World, dt: number) {
	if (world.gems.length === 0) return
	const { x: px, y: py } = world.player
	const pickup2 = world.pickupRadius ** 2
	const collect2 = GEM_COLLECT_RADIUS ** 2
	const next: Gem[] = []
	for (const g of world.gems) {
		const dx = px - g.x
		const dy = py - g.y
		const d2 = dx * dx + dy * dy
		if (d2 <= collect2) {
			world.xp += g.xp
			continue
		}
		if (!g.homing && d2 <= pickup2) g.homing = true
		if (g.homing) {
			const dist = Math.sqrt(d2) || 1
			const step = GEM_HOMING_SPEED * dt
			g.x += (dx / dist) * step
			g.y += (dy / dist) * step
		}
		next.push(g)
	}
	world.gems = next
}

function checkLevelUp(world: World) {
	if (world.xp < world.xpToNext) return
	world.xp -= world.xpToNext
	world.level++
	// Gentle quadratic-ish curve so later levels take longer.
	world.xpToNext = 5 + world.level * 4
	world.pendingLevelUp = true
}

// --- upgrades ---------------------------------------------------------------

export type UpgradeId =
	| 'fireRate'
	| 'multishot'
	| 'damage'
	| 'pierce'
	| 'speed'
	| 'magnet'
	| 'vitality'

export interface Upgrade {
	id: UpgradeId
	title: string
	description: string
	// A tldraw palette color name, so the menu cards match the canvas language.
	color: 'blue' | 'green' | 'orange' | 'violet' | 'red' | 'yellow' | 'light-blue'
}

export const UPGRADES: Upgrade[] = [
	{ id: 'fireRate', title: 'Rapid fire', description: 'Shoot 18% faster', color: 'orange' },
	{ id: 'multishot', title: 'Multishot', description: '+1 projectile per volley', color: 'blue' },
	{ id: 'damage', title: 'Power shot', description: '+6 projectile damage', color: 'red' },
	{ id: 'pierce', title: 'Piercing', description: 'Shots pass through +1 enemy', color: 'violet' },
	{ id: 'speed', title: 'Swift boots', description: '+12% move speed', color: 'green' },
	{ id: 'magnet', title: 'Magnet', description: '+40% pickup range', color: 'light-blue' },
	{ id: 'vitality', title: 'Vitality', description: '+25 max health, heal 25', color: 'yellow' },
]

// Pick `count` distinct upgrades at random for the level-up menu.
export function rollUpgrades(count: number): Upgrade[] {
	const pool = [...UPGRADES]
	const out: Upgrade[] = []
	for (let i = 0; i < count && pool.length; i++) {
		const idx = Math.floor(Math.random() * pool.length)
		out.push(pool.splice(idx, 1)[0])
	}
	return out
}

export function applyUpgrade(world: World, id: UpgradeId) {
	const w = world.weapon
	switch (id) {
		case 'fireRate':
			w.cooldownMs = Math.max(120, w.cooldownMs * 0.82)
			break
		case 'multishot':
			w.count++
			break
		case 'damage':
			w.damage += 6
			break
		case 'pierce':
			w.pierce++
			break
		case 'speed':
			world.moveSpeed *= 1.12
			break
		case 'magnet':
			world.pickupRadius *= 1.4
			break
		case 'vitality':
			world.maxHp += 25
			world.hp = Math.min(world.maxHp, world.hp + 25)
			break
	}
	world.pendingLevelUp = false
}
