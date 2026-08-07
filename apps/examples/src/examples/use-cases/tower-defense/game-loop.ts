import { Editor, TLGeoShape } from 'tldraw'
import { ENEMY_CONFIG, pickEnemyType } from './enemy-config'
import {
	Enemy,
	Explosion,
	Projectile,
	elapsedMs$,
	enemies$,
	explosions$,
	gainBounty,
	gameOver$,
	lives$,
	nextEnemyId,
	nextExplosionId,
	nextProjectileId,
	projectiles$,
	towerCooldowns,
} from './game-state'
import { PATH_LENGTH, getPositionAtDistance } from './path'
import { playFireSound } from './sounds'
import { getScaledStats, getTowerLevel, getTowerStats } from './tower-config'

const SPAWN_BASE_INTERVAL_MS = 1400
const SPAWN_RAMP_RATE = 0.00004 // shaves spawn interval over time
const SPAWN_INTERVAL_FLOOR_MS = 350
const ENEMY_BASE_HP = 50
const ENEMY_HP_RAMP = 0.025 // per second of game time
const ENEMY_BASE_SPEED = 65 // page units / sec
const ENEMY_BASE_BOUNTY = 5
const PROJECTILE_MAX_AGE_MS = 4000
const MAGIC_AOE_RADIUS = 60
// Magic projectiles slow enemies they hit for this long, scaling speed by
// MAGIC_SLOW_FACTOR until the timer expires.
const MAGIC_SLOW_DURATION_MS = 1500
const MAGIC_SLOW_FACTOR = 0.4

let lastSpawnAt = 0

export function resetSpawnTimer() {
	lastSpawnAt = 0
}

export function runGameTick(editor: Editor, dtMs: number) {
	if (gameOver$.get()) return
	const now = elapsedMs$.get() + dtMs
	elapsedMs$.set(now)
	const dt = dtMs / 1000

	maybeSpawn(now)
	moveEnemies(dt, now)
	fireTowers(editor, now)
	moveProjectiles(dt, dtMs)
	resolveHits()
	tickExplosions(dtMs)
	checkGameOver()
}

const EXPLOSION_DURATION_MS = 320

function spawnExplosion(x: number, y: number, radius: number) {
	const exp: Explosion = {
		id: nextExplosionId(),
		x,
		y,
		radius,
		ageMs: 0,
		maxAgeMs: EXPLOSION_DURATION_MS,
	}
	explosions$.update((list) => [...list, exp])
}

function tickExplosions(dtMs: number) {
	const list = explosions$.get()
	if (list.length === 0) return
	const next: Explosion[] = []
	for (const e of list) {
		const ageMs = e.ageMs + dtMs
		if (ageMs >= e.maxAgeMs) continue
		next.push({ ...e, ageMs })
	}
	explosions$.set(next)
}

function maybeSpawn(now: number) {
	const interval = Math.max(
		SPAWN_INTERVAL_FLOOR_MS,
		SPAWN_BASE_INTERVAL_MS - now * SPAWN_RAMP_RATE * SPAWN_BASE_INTERVAL_MS
	)
	if (now - lastSpawnAt < interval) return
	lastSpawnAt = now
	const type = pickEnemyType(now)
	const cfg = ENEMY_CONFIG[type]
	const hpScale = 1 + (now / 1000) * ENEMY_HP_RAMP
	const maxHp = Math.round(ENEMY_BASE_HP * hpScale * cfg.hpMultiplier)
	const bounty = Math.round((ENEMY_BASE_BOUNTY + maxHp / 10) * cfg.bountyMultiplier)
	const enemy: Enemy = {
		id: nextEnemyId(),
		type,
		distance: 0,
		hp: maxHp,
		maxHp,
		speed: (ENEMY_BASE_SPEED + Math.random() * 25) * cfg.speedMultiplier,
		radius: cfg.radius,
		bounty,
		slowedUntilMs: 0,
	}
	enemies$.update((list) => [...list, enemy])
}

function moveEnemies(dt: number, now: number) {
	const enemies = enemies$.get()
	if (enemies.length === 0) return
	const next: Enemy[] = []
	let leaks = 0
	for (const e of enemies) {
		const isSlowed = e.slowedUntilMs > now
		const speed = isSlowed ? e.speed * MAGIC_SLOW_FACTOR : e.speed
		const distance = e.distance + speed * dt
		if (distance >= PATH_LENGTH) {
			leaks++
			continue
		}
		next.push({ ...e, distance })
	}
	if (leaks > 0) lives$.update((l) => Math.max(0, l - leaks))
	enemies$.set(next)
}

function fireTowers(editor: Editor, now: number) {
	const enemies = enemies$.get()
	if (enemies.length === 0) return
	const shapes = editor.getCurrentPageShapes()
	for (const shape of shapes) {
		if (shape.type !== 'geo') continue
		const baseStats = getTowerStats((shape as TLGeoShape).props.geo)
		if (!baseStats) continue
		const stats = getScaledStats(baseStats, getTowerLevel(shape))
		const cooldown = towerCooldowns.get(shape.id)
		if (cooldown && now - cooldown.lastFiredAt < stats.fireRateMs) continue
		const bounds = editor.getShapePageBounds(shape.id)
		if (!bounds) continue
		const cx = bounds.center.x
		const cy = bounds.center.y
		// Pick the enemy closest to the end of the path within range.
		let target: Enemy | null = null
		let targetPos = { x: 0, y: 0 }
		let bestProgress = -1
		for (const enemy of enemies) {
			const pos = getPositionAtDistance(enemy.distance)
			const dx = pos.x - cx
			const dy = pos.y - cy
			if (dx * dx + dy * dy > stats.range * stats.range) continue
			if (enemy.distance > bestProgress) {
				bestProgress = enemy.distance
				target = enemy
				targetPos = pos
			}
		}
		if (!target) continue
		const dx = targetPos.x - cx
		const dy = targetPos.y - cy
		const dist = Math.hypot(dx, dy) || 1
		const projectile: Projectile = {
			id: nextProjectileId(),
			x: cx,
			y: cy,
			vx: (dx / dist) * stats.projectileSpeed,
			vy: (dy / dist) * stats.projectileSpeed,
			damage: stats.damage,
			kind: stats.projectileKind,
			targetEnemyId: target.id,
			ageMs: 0,
		}
		projectiles$.update((list) => [...list, projectile])
		towerCooldowns.set(shape.id, { lastFiredAt: now })
		playFireSound(stats.projectileKind)
	}
}

function moveProjectiles(dt: number, dtMs: number) {
	const list = projectiles$.get()
	if (list.length === 0) return
	const next: Projectile[] = []
	for (const p of list) {
		const ageMs = p.ageMs + dtMs
		if (ageMs > PROJECTILE_MAX_AGE_MS) continue
		next.push({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, ageMs })
	}
	projectiles$.set(next)
}

function resolveHits() {
	const projectiles = projectiles$.get()
	if (projectiles.length === 0) return
	const enemies = enemies$.get()
	if (enemies.length === 0) {
		// Projectiles whose targets vanished can keep flying until expiry.
		return
	}
	const now = elapsedMs$.get()
	const enemyById = new Map<number, Enemy>()
	for (const e of enemies) enemyById.set(e.id, e)

	const survivingProjectiles: Projectile[] = []
	const damageByEnemyId = new Map<number, number>()
	const slowedEnemyIds = new Set<number>()
	for (const p of projectiles) {
		// Use current position of the original target if still alive; otherwise
		// look for any nearby enemy to make impacts feel responsive.
		const target = enemyById.get(p.targetEnemyId)
		let hit: Enemy | null = null
		if (target) {
			const pos = getPositionAtDistance(target.distance)
			if (Math.hypot(p.x - pos.x, p.y - pos.y) <= target.radius) hit = target
		}
		if (!hit) {
			for (const e of enemies) {
				const pos = getPositionAtDistance(e.distance)
				if (Math.hypot(p.x - pos.x, p.y - pos.y) <= e.radius) {
					hit = e
					break
				}
			}
		}
		if (hit) {
			if (p.kind === 'orb') {
				// Magic projectiles explode on impact: damage and slow every
				// enemy in the AOE, plus a transient ring overlay.
				spawnExplosion(p.x, p.y, MAGIC_AOE_RADIUS)
				for (const e of enemies) {
					const pos = getPositionAtDistance(e.distance)
					if (Math.hypot(p.x - pos.x, p.y - pos.y) <= MAGIC_AOE_RADIUS + e.radius) {
						damageByEnemyId.set(e.id, (damageByEnemyId.get(e.id) ?? 0) + p.damage)
						slowedEnemyIds.add(e.id)
					}
				}
			} else {
				damageByEnemyId.set(hit.id, (damageByEnemyId.get(hit.id) ?? 0) + p.damage)
			}
		} else {
			survivingProjectiles.push(p)
		}
	}
	if (survivingProjectiles.length !== projectiles.length) {
		projectiles$.set(survivingProjectiles)
	}
	if (damageByEnemyId.size === 0 && slowedEnemyIds.size === 0) return

	let bountyGained = 0
	const slowExpiry = now + MAGIC_SLOW_DURATION_MS
	const nextEnemies: Enemy[] = []
	for (const e of enemies) {
		const dmg = damageByEnemyId.get(e.id) ?? 0
		const slowed = slowedEnemyIds.has(e.id)
		if (dmg === 0 && !slowed) {
			nextEnemies.push(e)
			continue
		}
		const hp = e.hp - dmg
		if (hp <= 0) {
			bountyGained += e.bounty
			continue
		}
		nextEnemies.push({
			...e,
			hp,
			// Slows refresh — multiple magic hits keep the effect alive rather
			// than stacking duration.
			slowedUntilMs: slowed ? Math.max(e.slowedUntilMs, slowExpiry) : e.slowedUntilMs,
		})
	}
	enemies$.set(nextEnemies)
	if (bountyGained > 0) gainBounty(bountyGained)
}

function checkGameOver() {
	if (lives$.get() <= 0) gameOver$.set(true)
}
