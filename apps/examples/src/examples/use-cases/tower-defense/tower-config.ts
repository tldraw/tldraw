// Maps geo shape variants to tower stats. Only these three geo types act as
// towers; other geo shapes the user draws are ignored by the game loop so the
// editor stays usable.

import { TLShape } from 'tldraw'

export type ProjectileKind = 'arrow' | 'rock' | 'orb'

export const MAX_TOWER_LEVEL = 4

export type TowerGeo = 'triangle' | 'rectangle' | 'ellipse'
export const TOWER_GEOS: TowerGeo[] = ['triangle', 'rectangle', 'ellipse']
export const TOWER_PLACEMENT_SIZE = 60

export interface TowerStats {
	label: string
	range: number
	fireRateMs: number
	damage: number
	projectileSpeed: number
	projectileKind: ProjectileKind
	cost: number
}

// Cost is roughly proportional to overall strength (range × damage / fireRate).
// Starting gold (see game-state) is calibrated to afford one Archer immediately
// and earn the others through kills.
export const TOWER_STATS_BY_GEO: Record<string, TowerStats> = {
	triangle: {
		label: 'Archer',
		range: 220,
		fireRateMs: 350,
		damage: 8,
		projectileSpeed: 700,
		projectileKind: 'arrow',
		cost: 50,
	},
	rectangle: {
		label: 'Cannon',
		range: 160,
		fireRateMs: 1100,
		damage: 30,
		projectileSpeed: 380,
		projectileKind: 'rock',
		cost: 120,
	},
	ellipse: {
		label: 'Magic',
		range: 190,
		fireRateMs: 600,
		damage: 14,
		projectileSpeed: 520,
		projectileKind: 'orb',
		cost: 80,
	},
}

export function getTowerStats(geo: string | undefined): TowerStats | null {
	if (!geo) return null
	return TOWER_STATS_BY_GEO[geo] ?? null
}

export function getTowerLevel(shape: TLShape): number {
	const lvl = shape.meta?.towerLevel
	return typeof lvl === 'number' && lvl >= 1 ? Math.min(MAX_TOWER_LEVEL, lvl) : 1
}

// Each upgrade adds 60% of base cost per level: L1→2 = 60%, L2→3 = 120%, L3→4 = 180%.
export function getUpgradeCost(baseCost: number, currentLevel: number): number {
	if (currentLevel >= MAX_TOWER_LEVEL) return 0
	return Math.ceil(baseCost * 0.6 * currentLevel)
}

// Visual cue for tower level — also makes the level readable at a glance.
export function levelColor(level: number): 'blue' | 'violet' | 'red' | 'orange' {
	if (level >= 4) return 'red'
	if (level === 3) return 'violet'
	if (level === 2) return 'blue'
	return 'orange'
}

// Damage and range grow with level; fire rate shortens. Level 1 returns base.
export function getScaledStats(stats: TowerStats, level: number): TowerStats {
	const k = Math.max(0, level - 1)
	if (k === 0) return stats
	return {
		...stats,
		damage: Math.round(stats.damage * Math.pow(1.4, k)),
		range: Math.round(stats.range * Math.pow(1.06, k)),
		fireRateMs: Math.round(stats.fireRateMs * Math.pow(0.9, k)),
	}
}
