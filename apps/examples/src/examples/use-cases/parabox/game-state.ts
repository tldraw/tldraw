// Bridge between the pure sim and tldraw. The World is a module singleton; the
// HUD reads a published snapshot, and the renderer reads the world directly.

import { atom } from 'tldraw'
import { LEVELS, parseLevel } from './levels'
import { cloneWorld, Dir, move, World } from './sim'

export interface Hud {
	level: number
	name: string
	moves: number
	won: boolean
	total: number
}

export const hud$ = atom<Hud>('pb_hud', { level: 0, name: '', moves: 0, won: false, total: 0 })
// Bumped on every state change so the renderer knows to redraw.
export const version$ = atom<number>('pb_version', 0)

let _world: World = parseLevel(LEVELS[0])
let _level = 0
let _undo: World[] = []

export function getWorld(): World {
	return _world
}

export function getLevelIndex(): number {
	return _level
}

function publish() {
	hud$.set({
		level: _level,
		name: LEVELS[_level].name,
		moves: _world.moves,
		won: _world.won,
		total: LEVELS.length,
	})
	version$.set(version$.get() + 1)
}

export function loadLevel(i: number) {
	_level = ((i % LEVELS.length) + LEVELS.length) % LEVELS.length
	_world = parseLevel(LEVELS[_level])
	_undo = []
	publish()
}

export function restart() {
	loadLevel(_level)
}

// Snapshot, move, publish. Returns whether anything moved.
export function doMove(dir: Dir): boolean {
	const snapshot = cloneWorld(_world)
	if (move(_world, dir)) {
		_undo.push(snapshot)
		if (_undo.length > 300) _undo.shift()
		publish()
		return true
	}
	return false
}

export function undo() {
	const prev = _undo.pop()
	if (prev) {
		_world = prev
		publish()
	}
}
