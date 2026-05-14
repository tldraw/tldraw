// Player roster. Starting bases get filled in at runtime by
// `updatePlayerStartBases(spawns)` — the caller passes the latest spawn
// positions from map.ts. We don't import PLAYER_SPAWNS here because
// players.ts ↔ map.ts ↔ game-state.ts would otherwise form a load-time
// cycle (game-state.ts imports from players.ts).

import { getRelation } from './diplomacy'

export type PlayerId = string

export const HUMAN_PLAYER_ID: PlayerId = 'p0'

export interface Player {
	id: PlayerId
	isHuman: boolean
	label: string
	bodyColor: string
	ringColor: string
	buildingColor: 'blue' | 'red' | 'orange' | 'violet' | 'green' | 'yellow'
	minimapColor: string
	startBase: { x: number; y: number }
}

// startBase is a placeholder at module load. The first bootstrap (after
// editor mount) calls `updatePlayerStartBases(PLAYER_SPAWNS)` to fill them in.
export const PLAYERS: Player[] = [
	{
		id: 'p0',
		isHuman: true,
		label: 'You',
		bodyColor: '#3b82f6',
		ringColor: '#1e3a8a',
		buildingColor: 'blue',
		minimapColor: '#3b82f6',
		startBase: { x: 0, y: 0 },
	},
	{
		id: 'p1',
		isHuman: false,
		label: 'Red',
		bodyColor: '#ef4444',
		ringColor: '#7f1d1d',
		buildingColor: 'red',
		minimapColor: '#ef4444',
		startBase: { x: 0, y: 0 },
	},
	{
		id: 'p2',
		isHuman: false,
		label: 'Violet',
		bodyColor: '#a855f7',
		ringColor: '#581c87',
		buildingColor: 'violet',
		minimapColor: '#a855f7',
		startBase: { x: 0, y: 0 },
	},
	{
		id: 'p3',
		isHuman: false,
		label: 'Orange',
		bodyColor: '#f97316',
		ringColor: '#7c2d12',
		buildingColor: 'orange',
		minimapColor: '#f97316',
		startBase: { x: 0, y: 0 },
	},
]

/** Copy a list of spawn positions into each player's startBase. Call after
 * map.ts has rerolled `PLAYER_SPAWNS` and before any code reads startBase
 * (bootstrap, zoom-to-bounds, etc.). */
export function updatePlayerStartBases(spawns: Array<{ x: number; y: number }>) {
	for (let i = 0; i < PLAYERS.length; i++) {
		const s = spawns[i] ?? spawns[spawns.length - 1] ?? { x: 0, y: 0 }
		PLAYERS[i].startBase.x = s.x
		PLAYERS[i].startBase.y = s.y
	}
}

export const HUMAN_PLAYER = PLAYERS.find((p) => p.id === HUMAN_PLAYER_ID)!
export const AI_PLAYERS = PLAYERS.filter((p) => !p.isHuman)

const BY_ID = new Map(PLAYERS.map((p) => [p.id, p]))

export function getPlayer(id: PlayerId): Player {
	const p = BY_ID.get(id)
	if (!p) throw new Error(`Unknown player id: ${id}`)
	return p
}

export function isHuman(id: PlayerId): boolean {
	return getPlayer(id).isHuman
}

export function isEnemyOf(viewer: PlayerId, target: PlayerId): boolean {
	if (viewer === target) return false
	return getRelation(viewer, target) === 'war'
}
