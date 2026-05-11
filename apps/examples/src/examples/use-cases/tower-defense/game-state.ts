import { atom } from 'tldraw'
import { EnemyType } from './enemy-config'
import { ProjectileKind, TowerGeo } from './tower-config'

export interface Enemy {
	id: number
	type: EnemyType
	distance: number
	hp: number
	maxHp: number
	speed: number
	radius: number
	bounty: number
	// Absolute elapsedMs at which any active slow ends. 0 = not slowed.
	slowedUntilMs: number
}

export interface Projectile {
	id: number
	x: number
	y: number
	vx: number
	vy: number
	damage: number
	kind: ProjectileKind
	targetEnemyId: number
	ageMs: number
}

export interface TowerCooldown {
	lastFiredAt: number
}

export interface Explosion {
	id: number
	x: number
	y: number
	radius: number
	ageMs: number
	maxAgeMs: number
}

export const STARTING_GOLD = 100
export const STARTING_LIVES = 20

export const enemies$ = atom<Enemy[]>('enemies', [])
export const projectiles$ = atom<Projectile[]>('projectiles', [])
export const explosions$ = atom<Explosion[]>('explosions', [])
// Currently armed tower placement; non-null while the player has a tower
// "in hand" from the toolbar / keyboard.
export const placingTower$ = atom<TowerGeo | null>('placingTower', null)
export const score$ = atom('score', 0)
export const gold$ = atom('gold', STARTING_GOLD)
export const lives$ = atom('lives', STARTING_LIVES)
export const gameOver$ = atom('gameOver', false)
export const elapsedMs$ = atom('elapsedMs', 0)

// Tower cooldowns are keyed by shape id. Not an atom — only the game loop reads
// and writes them, and they don't need to drive overlay reactivity.
export const towerCooldowns = new Map<string, TowerCooldown>()

let _nextEnemyId = 1
export const nextEnemyId = () => _nextEnemyId++
let _nextProjId = 1
export const nextProjectileId = () => _nextProjId++
let _nextExplosionId = 1
export const nextExplosionId = () => _nextExplosionId++

export function resetGameState() {
	enemies$.set([])
	projectiles$.set([])
	explosions$.set([])
	score$.set(0)
	gold$.set(STARTING_GOLD)
	lives$.set(STARTING_LIVES)
	gameOver$.set(false)
	elapsedMs$.set(0)
	towerCooldowns.clear()
	_nextEnemyId = 1
	_nextProjId = 1
	_nextExplosionId = 1
}

export function gainBounty(amount: number) {
	score$.update((s) => s + amount)
	gold$.update((g) => g + amount)
}

export function applyDamage(enemyId: number, amount: number) {
	const enemies = enemies$.get()
	const next: Enemy[] = []
	let killed: Enemy | null = null
	for (const e of enemies) {
		if (e.id !== enemyId) {
			next.push(e)
			continue
		}
		const hp = e.hp - amount
		if (hp <= 0) {
			killed = e
		} else {
			next.push({ ...e, hp })
		}
	}
	if (killed) gainBounty(killed.bounty)
	enemies$.set(next)
}
