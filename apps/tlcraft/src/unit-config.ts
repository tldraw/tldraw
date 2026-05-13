// Unit configuration. Stats are the per-kind baseline; per-player effects
// (HP, attack, speed, cost mults from civ bonuses and tech upgrades) are
// applied in tech.ts when reading these numbers in the game loop.
//
// Each unit belongs to an `archetype` (one of 8) which controls overlay
// rendering and many civ bonuses. Each unit also has a `minAge` gate so the
// train UI and game loop can refuse to train it until that age is reached.
//
// The 20 "unique" units (one per civ) are gated additionally by their nation
// signature tech — see nations.ts and canTrainUnit() in tech.ts.

import { AgeId } from './age-config'

export type ArchetypeId =
	| 'heavy-cavalry'
	| 'light-cavalry'
	| 'heavy-infantry'
	| 'light-infantry'
	| 'archer'
	| 'skirmisher'
	| 'caster'
	| 'siege'

export type UnitTrainBuilding =
	| 'town-hall'
	| 'barracks'
	| 'archery-range'
	| 'stable'
	| 'siege-workshop'
	| 'monastery'

export type UnitKind =
	// Base / shared units
	| 'worker'
	| 'soldier'
	| 'pikeman'
	| 'archer'
	| 'crossbowman'
	| 'skirmisher'
	| 'scout-cavalry'
	| 'knight'
	| 'monk'
	| 'trebuchet'
	// Unique units (one per civ)
	| 'longbowman'
	| 'berserker'
	| 'legionnaire'
	| 'mangudai'
	| 'chariot-archer'
	| 'samurai'
	| 'chu-ko-nu'
	| 'war-elephant'
	| 'hoplite'
	| 'jaguar-warrior'
	| 'plumed-archer'
	| 'huskarl'
	| 'woad-raider'
	| 'mameluke'
	| 'cataphract'
	| 'throwing-axeman'
	| 'boyar'
	| 'imperial-camel'
	| 'janissary'
	| 'conquistador'

export interface UnitConfig {
	label: string
	archetype: ArchetypeId
	minAge: AgeId
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
	trainedBy: UnitTrainBuilding
	// Letter glyph drawn on the unit body when the overlay falls back to text.
	glyph: string
}

// Range helpers — keep magic numbers grouped so it's obvious what "long range" means.
const MELEE_RANGE_SQ = 28 * 28
const SHORT_RANGE_SQ = 160 * 160
const MEDIUM_RANGE_SQ = 220 * 220
const LONG_RANGE_SQ = 260 * 260
const SIEGE_RANGE_SQ = 320 * 320

export const UNIT_CONFIG: Record<UnitKind, UnitConfig> = {
	// ---- Base / shared units ----------------------------------------------
	worker: {
		label: 'Villager',
		archetype: 'light-infantry',
		minAge: 'dark',
		maxHp: 35,
		speed: 95,
		radius: 11,
		attackDamage: 3,
		attackRangeSq: MELEE_RANGE_SQ,
		attackCooldownMs: 900,
		visionRadius: 220,
		gatherRate: 5,
		carryCapacity: 10,
		bounty: 8,
		trainCost: { gold: 50, wood: 0, food: 1 },
		trainMs: 5500,
		trainedBy: 'town-hall',
		glyph: 'V',
	},
	soldier: {
		label: 'Militia',
		archetype: 'heavy-infantry',
		minAge: 'feudal',
		maxHp: 110,
		speed: 80,
		radius: 13,
		attackDamage: 14,
		attackRangeSq: MELEE_RANGE_SQ,
		attackCooldownMs: 800,
		visionRadius: 280,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 14,
		trainCost: { gold: 60, wood: 20, food: 1 },
		trainMs: 7000,
		trainedBy: 'barracks',
		glyph: 'M',
	},
	pikeman: {
		label: 'Pikeman',
		archetype: 'heavy-infantry',
		minAge: 'castle',
		maxHp: 150,
		speed: 80,
		radius: 13,
		attackDamage: 18,
		attackRangeSq: MELEE_RANGE_SQ,
		attackCooldownMs: 800,
		visionRadius: 280,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 16,
		trainCost: { gold: 35, wood: 25, food: 1 },
		trainMs: 7500,
		trainedBy: 'barracks',
		glyph: 'P',
	},
	archer: {
		label: 'Archer',
		archetype: 'archer',
		minAge: 'feudal',
		maxHp: 70,
		speed: 85,
		radius: 12,
		attackDamage: 16,
		attackRangeSq: MEDIUM_RANGE_SQ,
		attackCooldownMs: 1100,
		visionRadius: 300,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 14,
		trainCost: { gold: 30, wood: 60, food: 1 },
		trainMs: 7000,
		trainedBy: 'archery-range',
		glyph: 'A',
	},
	crossbowman: {
		label: 'Crossbowman',
		archetype: 'archer',
		minAge: 'castle',
		maxHp: 90,
		speed: 85,
		radius: 12,
		attackDamage: 22,
		attackRangeSq: MEDIUM_RANGE_SQ,
		attackCooldownMs: 1100,
		visionRadius: 320,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 18,
		trainCost: { gold: 50, wood: 80, food: 1 },
		trainMs: 8500,
		trainedBy: 'archery-range',
		glyph: 'X',
	},
	skirmisher: {
		label: 'Skirmisher',
		archetype: 'skirmisher',
		minAge: 'feudal',
		maxHp: 90,
		speed: 95,
		radius: 12,
		attackDamage: 12,
		attackRangeSq: SHORT_RANGE_SQ,
		attackCooldownMs: 950,
		visionRadius: 280,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 12,
		trainCost: { gold: 25, wood: 35, food: 1 },
		trainMs: 6500,
		trainedBy: 'archery-range',
		glyph: 'S',
	},
	'scout-cavalry': {
		label: 'Scout cavalry',
		archetype: 'light-cavalry',
		minAge: 'feudal',
		maxHp: 100,
		speed: 130,
		radius: 14,
		attackDamage: 12,
		attackRangeSq: MELEE_RANGE_SQ,
		attackCooldownMs: 800,
		visionRadius: 360,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 14,
		trainCost: { gold: 60, wood: 0, food: 1 },
		trainMs: 6500,
		trainedBy: 'stable',
		glyph: 'C',
	},
	knight: {
		label: 'Knight',
		archetype: 'heavy-cavalry',
		minAge: 'castle',
		maxHp: 220,
		speed: 105,
		radius: 16,
		attackDamage: 28,
		attackRangeSq: MELEE_RANGE_SQ,
		attackCooldownMs: 850,
		visionRadius: 320,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 28,
		trainCost: { gold: 140, wood: 60, food: 2 },
		trainMs: 11_000,
		trainedBy: 'stable',
		glyph: 'K',
	},
	monk: {
		label: 'Monk',
		archetype: 'caster',
		minAge: 'castle',
		maxHp: 85,
		speed: 75,
		radius: 12,
		attackDamage: 24,
		attackRangeSq: LONG_RANGE_SQ,
		attackCooldownMs: 1500,
		visionRadius: 360,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 22,
		trainCost: { gold: 100, wood: 0, food: 1 },
		trainMs: 9000,
		trainedBy: 'monastery',
		glyph: 'O',
	},
	trebuchet: {
		label: 'Trebuchet',
		archetype: 'siege',
		minAge: 'imperial',
		maxHp: 160,
		speed: 55,
		radius: 18,
		attackDamage: 65,
		attackRangeSq: SIEGE_RANGE_SQ,
		attackCooldownMs: 3500,
		visionRadius: 360,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 50,
		trainCost: { gold: 200, wood: 200, food: 2 },
		trainMs: 16_000,
		trainedBy: 'siege-workshop',
		glyph: 'T',
	},

	// ---- Unique units (one per civ) ---------------------------------------
	longbowman: {
		label: 'Longbowman',
		archetype: 'archer',
		minAge: 'castle',
		maxHp: 95,
		speed: 85,
		radius: 12,
		attackDamage: 24,
		attackRangeSq: LONG_RANGE_SQ,
		attackCooldownMs: 1200,
		visionRadius: 340,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 24,
		trainCost: { gold: 60, wood: 90, food: 1 },
		trainMs: 9500,
		trainedBy: 'archery-range',
		glyph: 'L',
	},
	berserker: {
		label: 'Berserker',
		archetype: 'light-infantry',
		minAge: 'castle',
		maxHp: 140,
		speed: 130,
		radius: 13,
		attackDamage: 24,
		attackRangeSq: MELEE_RANGE_SQ,
		attackCooldownMs: 700,
		visionRadius: 300,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 24,
		trainCost: { gold: 100, wood: 30, food: 1 },
		trainMs: 9000,
		trainedBy: 'barracks',
		glyph: 'B',
	},
	legionnaire: {
		label: 'Legionnaire',
		archetype: 'heavy-infantry',
		minAge: 'castle',
		maxHp: 200,
		speed: 85,
		radius: 14,
		attackDamage: 26,
		attackRangeSq: MELEE_RANGE_SQ,
		attackCooldownMs: 800,
		visionRadius: 300,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 26,
		trainCost: { gold: 110, wood: 40, food: 2 },
		trainMs: 10_000,
		trainedBy: 'barracks',
		glyph: 'L',
	},
	mangudai: {
		label: 'Mangudai',
		archetype: 'light-cavalry',
		minAge: 'castle',
		maxHp: 110,
		speed: 130,
		radius: 14,
		attackDamage: 18,
		attackRangeSq: MEDIUM_RANGE_SQ,
		attackCooldownMs: 950,
		visionRadius: 360,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 22,
		trainCost: { gold: 55, wood: 65, food: 1 },
		trainMs: 9000,
		trainedBy: 'stable',
		glyph: 'M',
	},
	'chariot-archer': {
		label: 'Chariot archer',
		archetype: 'archer',
		minAge: 'castle',
		maxHp: 120,
		speed: 115,
		radius: 14,
		attackDamage: 20,
		attackRangeSq: MEDIUM_RANGE_SQ,
		attackCooldownMs: 1000,
		visionRadius: 320,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 22,
		trainCost: { gold: 60, wood: 80, food: 2 },
		trainMs: 10_000,
		trainedBy: 'archery-range',
		glyph: 'H',
	},
	samurai: {
		label: 'Samurai',
		archetype: 'heavy-infantry',
		minAge: 'castle',
		maxHp: 180,
		speed: 90,
		radius: 14,
		attackDamage: 30,
		attackRangeSq: MELEE_RANGE_SQ,
		attackCooldownMs: 650,
		visionRadius: 300,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 28,
		trainCost: { gold: 140, wood: 60, food: 2 },
		trainMs: 10_500,
		trainedBy: 'barracks',
		glyph: 'S',
	},
	'chu-ko-nu': {
		label: 'Chu-ko-nu',
		archetype: 'archer',
		minAge: 'castle',
		maxHp: 90,
		speed: 80,
		radius: 12,
		attackDamage: 14,
		attackRangeSq: MEDIUM_RANGE_SQ,
		attackCooldownMs: 500,
		visionRadius: 320,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 22,
		trainCost: { gold: 40, wood: 80, food: 1 },
		trainMs: 8500,
		trainedBy: 'archery-range',
		glyph: 'C',
	},
	'war-elephant': {
		label: 'War elephant',
		archetype: 'heavy-cavalry',
		minAge: 'castle',
		maxHp: 350,
		speed: 70,
		radius: 18,
		attackDamage: 36,
		attackRangeSq: MELEE_RANGE_SQ,
		attackCooldownMs: 900,
		visionRadius: 320,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 40,
		trainCost: { gold: 200, wood: 80, food: 3 },
		trainMs: 14_000,
		trainedBy: 'stable',
		glyph: 'E',
	},
	hoplite: {
		label: 'Hoplite',
		archetype: 'heavy-infantry',
		minAge: 'castle',
		maxHp: 220,
		speed: 75,
		radius: 14,
		attackDamage: 24,
		attackRangeSq: MELEE_RANGE_SQ,
		attackCooldownMs: 850,
		visionRadius: 280,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 26,
		trainCost: { gold: 120, wood: 40, food: 2 },
		trainMs: 10_000,
		trainedBy: 'barracks',
		glyph: 'H',
	},
	'jaguar-warrior': {
		label: 'Jaguar warrior',
		archetype: 'light-infantry',
		minAge: 'castle',
		maxHp: 130,
		speed: 115,
		radius: 13,
		attackDamage: 26,
		attackRangeSq: MELEE_RANGE_SQ,
		attackCooldownMs: 750,
		visionRadius: 300,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 24,
		trainCost: { gold: 110, wood: 0, food: 1 },
		trainMs: 9000,
		trainedBy: 'barracks',
		glyph: 'J',
	},
	'plumed-archer': {
		label: 'Plumed archer',
		archetype: 'archer',
		minAge: 'castle',
		maxHp: 80,
		speed: 100,
		radius: 12,
		attackDamage: 20,
		attackRangeSq: MEDIUM_RANGE_SQ,
		attackCooldownMs: 1000,
		visionRadius: 320,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 20,
		trainCost: { gold: 45, wood: 60, food: 1 },
		trainMs: 8000,
		trainedBy: 'archery-range',
		glyph: 'F',
	},
	huskarl: {
		label: 'Huskarl',
		archetype: 'heavy-infantry',
		minAge: 'castle',
		maxHp: 170,
		speed: 95,
		radius: 13,
		attackDamage: 22,
		attackRangeSq: MELEE_RANGE_SQ,
		attackCooldownMs: 800,
		visionRadius: 300,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 22,
		trainCost: { gold: 90, wood: 30, food: 1 },
		trainMs: 8500,
		trainedBy: 'barracks',
		glyph: 'U',
	},
	'woad-raider': {
		label: 'Woad raider',
		archetype: 'light-infantry',
		minAge: 'castle',
		maxHp: 130,
		speed: 135,
		radius: 13,
		attackDamage: 22,
		attackRangeSq: MELEE_RANGE_SQ,
		attackCooldownMs: 700,
		visionRadius: 320,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 22,
		trainCost: { gold: 90, wood: 30, food: 1 },
		trainMs: 8500,
		trainedBy: 'barracks',
		glyph: 'W',
	},
	mameluke: {
		label: 'Mameluke',
		archetype: 'heavy-cavalry',
		minAge: 'castle',
		maxHp: 220,
		speed: 110,
		radius: 16,
		attackDamage: 30,
		attackRangeSq: SHORT_RANGE_SQ,
		attackCooldownMs: 850,
		visionRadius: 340,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 32,
		trainCost: { gold: 160, wood: 60, food: 2 },
		trainMs: 11_000,
		trainedBy: 'stable',
		glyph: 'A',
	},
	cataphract: {
		label: 'Cataphract',
		archetype: 'heavy-cavalry',
		minAge: 'castle',
		maxHp: 250,
		speed: 100,
		radius: 16,
		attackDamage: 30,
		attackRangeSq: MELEE_RANGE_SQ,
		attackCooldownMs: 800,
		visionRadius: 320,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 32,
		trainCost: { gold: 150, wood: 70, food: 2 },
		trainMs: 11_500,
		trainedBy: 'stable',
		glyph: 'Y',
	},
	'throwing-axeman': {
		label: 'Throwing axeman',
		archetype: 'skirmisher',
		minAge: 'castle',
		maxHp: 120,
		speed: 95,
		radius: 13,
		attackDamage: 18,
		attackRangeSq: SHORT_RANGE_SQ,
		attackCooldownMs: 950,
		visionRadius: 300,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 22,
		trainCost: { gold: 70, wood: 50, food: 1 },
		trainMs: 8500,
		trainedBy: 'archery-range',
		glyph: 'F',
	},
	boyar: {
		label: 'Boyar',
		archetype: 'heavy-cavalry',
		minAge: 'castle',
		maxHp: 240,
		speed: 105,
		radius: 16,
		attackDamage: 32,
		attackRangeSq: MELEE_RANGE_SQ,
		attackCooldownMs: 850,
		visionRadius: 320,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 32,
		trainCost: { gold: 140, wood: 60, food: 2 },
		trainMs: 11_000,
		trainedBy: 'stable',
		glyph: 'Y',
	},
	'imperial-camel': {
		label: 'Imperial camel',
		archetype: 'light-cavalry',
		minAge: 'castle',
		maxHp: 150,
		speed: 120,
		radius: 14,
		attackDamage: 22,
		attackRangeSq: MELEE_RANGE_SQ,
		attackCooldownMs: 850,
		visionRadius: 340,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 22,
		trainCost: { gold: 70, wood: 40, food: 1 },
		trainMs: 9000,
		trainedBy: 'stable',
		glyph: 'I',
	},
	janissary: {
		label: 'Janissary',
		archetype: 'archer',
		minAge: 'castle',
		maxHp: 100,
		speed: 90,
		radius: 12,
		attackDamage: 28,
		attackRangeSq: MEDIUM_RANGE_SQ,
		attackCooldownMs: 1300,
		visionRadius: 320,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 26,
		trainCost: { gold: 70, wood: 70, food: 1 },
		trainMs: 9000,
		trainedBy: 'archery-range',
		glyph: 'N',
	},
	conquistador: {
		label: 'Conquistador',
		archetype: 'light-cavalry',
		minAge: 'castle',
		maxHp: 140,
		speed: 115,
		radius: 14,
		attackDamage: 26,
		attackRangeSq: SHORT_RANGE_SQ,
		attackCooldownMs: 1100,
		visionRadius: 340,
		gatherRate: 0,
		carryCapacity: 0,
		bounty: 26,
		trainCost: { gold: 70, wood: 80, food: 2 },
		trainMs: 10_000,
		trainedBy: 'stable',
		glyph: 'Q',
	},
}

export const UNIT_KINDS: UnitKind[] = Object.keys(UNIT_CONFIG) as UnitKind[]

export const UNIQUE_UNIT_KINDS: UnitKind[] = [
	'longbowman',
	'berserker',
	'legionnaire',
	'mangudai',
	'chariot-archer',
	'samurai',
	'chu-ko-nu',
	'war-elephant',
	'hoplite',
	'jaguar-warrior',
	'plumed-archer',
	'huskarl',
	'woad-raider',
	'mameluke',
	'cataphract',
	'throwing-axeman',
	'boyar',
	'imperial-camel',
	'janissary',
	'conquistador',
]

const UNIQUE_SET = new Set<UnitKind>(UNIQUE_UNIT_KINDS)

export function isUniqueUnit(kind: UnitKind): boolean {
	return UNIQUE_SET.has(kind)
}

export const ARCHETYPES: ArchetypeId[] = [
	'heavy-cavalry',
	'light-cavalry',
	'heavy-infantry',
	'light-infantry',
	'archer',
	'skirmisher',
	'caster',
	'siege',
]

export function getArchetype(kind: UnitKind): ArchetypeId {
	return UNIT_CONFIG[kind].archetype
}
