// Unit archetypes. Visual colour comes from the unit's player (see players.ts);
// kind only determines stats and which glyph appears on the body.
//
// The four "unique" kinds (paladin/berserker/sorcerer/champion) are gated by
// a nation choice + a signature research at the Library — see nations.ts and
// the queueUnit check in building-actions.ts.

export type UnitKind =
	| 'worker'
	| 'soldier'
	| 'knight'
	| 'paladin'
	| 'berserker'
	| 'sorcerer'
	| 'champion'

export interface UnitConfig {
	label: string
	maxHp: number
	speed: number
	radius: number
	attackDamage: number
	attackRangeSq: number
	attackCooldownMs: number
	visionRadius: number
	gatherRate: number
	carryCapacity: number
	bounty: number
	trainCost: { gold: number; wood: number; food: number }
	trainMs: number
	trainedBy: 'town-hall' | 'barracks'
	// Letter glyph drawn on the unit body.
	glyph: string
}

export const UNIT_CONFIG: Record<UnitKind, UnitConfig> = {
	worker: {
		label: 'Worker',
		maxHp: 35,
		speed: 95,
		radius: 11,
		attackDamage: 3,
		attackRangeSq: 22 * 22,
		attackCooldownMs: 900,
		visionRadius: 220,
		gatherRate: 5,
		carryCapacity: 10,
		bounty: 8,
		trainCost: { gold: 50, wood: 0, food: 1 },
		trainMs: 5500,
		trainedBy: 'town-hall',
		glyph: 'W',
	},
	soldier: {
		label: 'Soldier',
		maxHp: 110,
		speed: 80,
		radius: 13,
		attackDamage: 14,
		attackRangeSq: 28 * 28,
		attackCooldownMs: 800,
		visionRadius: 280,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 14,
		trainCost: { gold: 60, wood: 20, food: 1 },
		trainMs: 7000,
		trainedBy: 'barracks',
		glyph: 'S',
	},
	knight: {
		label: 'Knight',
		maxHp: 220,
		speed: 90,
		radius: 16,
		attackDamage: 28,
		attackRangeSq: 32 * 32,
		attackCooldownMs: 850,
		visionRadius: 320,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 28,
		trainCost: { gold: 140, wood: 60, food: 2 },
		trainMs: 11000,
		trainedBy: 'barracks',
		glyph: 'K',
	},
	// --- Nation-unique units. Each is gated behind a nation's signature tech.
	paladin: {
		label: 'Paladin',
		maxHp: 320,
		speed: 80,
		radius: 17,
		attackDamage: 30,
		attackRangeSq: 32 * 32,
		attackCooldownMs: 900,
		visionRadius: 340,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 36,
		trainCost: { gold: 180, wood: 80, food: 2 },
		trainMs: 12_000,
		trainedBy: 'barracks',
		glyph: 'P',
	},
	berserker: {
		label: 'Berserker',
		maxHp: 130,
		speed: 130,
		radius: 13,
		attackDamage: 22,
		attackRangeSq: 26 * 26,
		attackCooldownMs: 600,
		visionRadius: 300,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 22,
		trainCost: { gold: 120, wood: 30, food: 1 },
		trainMs: 8000,
		trainedBy: 'barracks',
		glyph: 'B',
	},
	sorcerer: {
		label: 'Sorcerer',
		maxHp: 90,
		speed: 75,
		radius: 13,
		attackDamage: 26,
		attackRangeSq: 220 * 220,
		attackCooldownMs: 1400,
		visionRadius: 360,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 26,
		trainCost: { gold: 160, wood: 40, food: 2 },
		trainMs: 10_000,
		trainedBy: 'barracks',
		glyph: 'M',
	},
	champion: {
		label: 'Champion',
		maxHp: 280,
		speed: 100,
		radius: 17,
		attackDamage: 32,
		attackRangeSq: 32 * 32,
		attackCooldownMs: 850,
		visionRadius: 340,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 34,
		trainCost: { gold: 200, wood: 60, food: 2 },
		trainMs: 12_000,
		trainedBy: 'barracks',
		glyph: 'C',
	},
}

export const UNIT_KINDS: UnitKind[] = [
	'worker',
	'soldier',
	'knight',
	'paladin',
	'berserker',
	'sorcerer',
	'champion',
]

// The set of unit kinds gated by a nation's signature tech. Used by the
// Train UI and AI to know what "unlock" looks like.
export const UNIQUE_UNIT_KINDS: UnitKind[] = ['paladin', 'berserker', 'sorcerer', 'champion']

export function isUniqueUnit(kind: UnitKind): boolean {
	return UNIQUE_UNIT_KINDS.includes(kind)
}
