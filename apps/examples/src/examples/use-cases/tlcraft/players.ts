// Player roster. Starting bases hug the corners of the larger map (see map.ts)
// so each AI has a defensible economic core and the human has time to scout
// before being engaged.

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

export const PLAYERS: Player[] = [
	{
		id: 'p0',
		isHuman: true,
		label: 'You',
		bodyColor: '#3b82f6',
		ringColor: '#1e3a8a',
		buildingColor: 'blue',
		minimapColor: '#3b82f6',
		startBase: { x: 320, y: 320 },
	},
	{
		id: 'p1',
		isHuman: false,
		label: 'Red',
		bodyColor: '#ef4444',
		ringColor: '#7f1d1d',
		buildingColor: 'red',
		minimapColor: '#ef4444',
		startBase: { x: 4380, y: 320 },
	},
	{
		id: 'p2',
		isHuman: false,
		label: 'Violet',
		bodyColor: '#a855f7',
		ringColor: '#581c87',
		buildingColor: 'violet',
		minimapColor: '#a855f7',
		startBase: { x: 4380, y: 2380 },
	},
	{
		id: 'p3',
		isHuman: false,
		label: 'Orange',
		bodyColor: '#f97316',
		ringColor: '#7c2d12',
		buildingColor: 'orange',
		minimapColor: '#f97316',
		startBase: { x: 320, y: 2380 },
	},
]

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
	return viewer !== target
}
