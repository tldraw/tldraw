// The bridge between the pure simulation (sim.ts) and tldraw's reactive world.
// The `World` is a plain mutable object; the overlays and HUD can't read it
// directly, so each frame we publish a snapshot into atoms. Crucially we copy
// the arrays — the sim mutates entity positions in place, so a fresh array
// reference is what tells the overlay canvas "redraw this frame".

import { atom } from 'tldraw'
import { Segment } from './engine'
import { createWorld, Enemy, Gem, Projectile, Upgrade, World } from './sim'

export const enemies$ = atom<Enemy[]>('vs_enemies', [])
export const projectiles$ = atom<Projectile[]>('vs_projectiles', [])
export const gems$ = atom<Gem[]>('vs_gems', [])
// The wall segments read from the canvas each frame, shared with the
// first-person view so it raycasts the same geometry the player collides with.
export const walls$ = atom<Segment[]>('vs_walls', [])

export interface HudState {
	hp: number
	maxHp: number
	level: number
	xp: number
	xpToNext: number
	kills: number
	timeMs: number
	gameOver: boolean
}

export const hud$ = atom<HudState>('vs_hud', {
	hp: 0,
	maxHp: 0,
	level: 1,
	xp: 0,
	xpToNext: 0,
	kills: 0,
	timeMs: 0,
	gameOver: false,
})

// Non-null while a level-up menu is open. The host pauses the sim until the
// player picks one of these.
export const levelUpChoices$ = atom<Upgrade[] | null>('vs_levelup', null)

let _world = createWorld()

export function getWorld(): World {
	return _world
}

// Push the current world into the atoms so overlays and the HUD update.
export function publishWorld() {
	const w = _world
	enemies$.set(w.enemies.slice())
	projectiles$.set(w.projectiles.slice())
	gems$.set(w.gems.slice())
	hud$.set({
		hp: w.hp,
		maxHp: w.maxHp,
		level: w.level,
		xp: w.xp,
		xpToNext: w.xpToNext,
		kills: w.kills,
		timeMs: w.timeMs,
		gameOver: w.gameOver,
	})
}

export function resetWorld() {
	_world = createWorld()
	levelUpChoices$.set(null)
	publishWorld()
}
