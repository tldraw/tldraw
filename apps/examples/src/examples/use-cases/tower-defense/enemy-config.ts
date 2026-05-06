// Enemy archetypes. Each carries its own multipliers and visual identity so
// later waves can mix tougher/faster targets and the overlay layer has more
// to render than uniform circles.

export type EnemyType = 'grunt' | 'runner' | 'brute'

export interface EnemyConfig {
	label: string
	hpMultiplier: number
	speedMultiplier: number
	radius: number
	bountyMultiplier: number
	bodyColor: string
	ringColor: string
}

export const ENEMY_CONFIG: Record<EnemyType, EnemyConfig> = {
	grunt: {
		label: 'Grunt',
		hpMultiplier: 1,
		speedMultiplier: 1,
		radius: 18,
		bountyMultiplier: 1,
		bodyColor: '#c84',
		ringColor: '#000',
	},
	runner: {
		label: 'Runner',
		hpMultiplier: 0.55,
		speedMultiplier: 1.9,
		radius: 13,
		bountyMultiplier: 1.4,
		bodyColor: '#3aa',
		ringColor: '#055',
	},
	brute: {
		label: 'Brute',
		hpMultiplier: 3.2,
		speedMultiplier: 0.62,
		radius: 26,
		bountyMultiplier: 2.6,
		bodyColor: '#735',
		ringColor: '#220',
	},
}

// Weighted spawn picker: the longer the game runs, the more often runners and
// brutes appear. Returns an enemy type.
export function pickEnemyType(elapsedMs: number): EnemyType {
	const t = Math.min(1, elapsedMs / 60_000)
	const wGrunt = Math.max(0.2, 1 - t)
	const wRunner = 0.3 + 0.4 * t
	const wBrute = 0.05 + 0.5 * t
	const total = wGrunt + wRunner + wBrute
	const r = Math.random() * total
	if (r < wGrunt) return 'grunt'
	if (r < wGrunt + wRunner) return 'runner'
	return 'brute'
}
