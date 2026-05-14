// AI strategy tables: per-civ play style + per-difficulty parameter knobs.
//
// The AI brain (ai.ts) consumes these as plain data:
//   - civPlayStyle[nationId] → one of the four base styles
//   - PLAY_STYLES[style] → build order, training weights, aggression, walling
//   - DIFFICULTY_PROFILES[level] → warmup, gather mult, army cap, parallelism
//
// All weights are "soft" — they bias decisions but don't lock them. The AI
// can deviate when counter-comp scouting tells it to.

import { BuildingKind } from './building-config'
import { NationId } from './nations'
import { ArchetypeId } from './unit-config'

export type PlayStyle = 'rush' | 'boom' | 'turtle' | 'balanced'

export interface PlayStyleConfig {
	label: string
	description: string
	// First push target army size. Once the AI's army hits this many fighters,
	// it issues an attack-move command toward the nearest remembered enemy
	// base. Smaller = more aggressive.
	pushArmySize: number
	// Training composition weights. Sum doesn't matter — these are normalised
	// at pick time. Archetypes not listed get 0 weight (never trained directly,
	// though signature uniques can still be queued separately).
	composition: Partial<Record<ArchetypeId, number>>
	// Build order: ordered list of building kinds to construct (one of each
	// unless `repeatable` covers it below). Stops when the AI runs out of
	// resources or the list is exhausted.
	buildOrder: BuildingKind[]
	// Buildings the AI is willing to build multiple of, given parallel-prod
	// quota from difficulty. Order matters — earlier = preferred.
	parallelizable: BuildingKind[]
	// Walls / gates around the main base? Only Hard difficulty actually puts
	// these down; Normal Hard ignores it for now.
	wallsOnHard: boolean
	// Tech priority list. AI walks it top to bottom and queues the first that
	// it can afford + meets prereqs/age.
	techPriority: string[]
	// Aggression score for diplomacy decisions. 0 = pacifist (always offers
	// peace when losing), 1 = warmonger (rarely accepts peace).
	aggression: number
}

export interface DifficultyProfile {
	id: 'easy' | 'normal' | 'hard'
	label: string
	// Tick cadence — lower = faster decisions.
	decisionIntervalMs: number
	// Game-clock ms before the AI may issue its first push.
	warmupMs: number
	// Resource gather rate handicap / bonus. 1.0 = normal, < 1 = handicap, > 1
	// = AI cheats. Applied to its workers' carry per trip.
	gatherMult: number
	// Soft cap on army size before AI stops training to avoid food stalls.
	maxFighters: number
	// Soft cap on workers per AI player.
	maxWorkers: number
	// How many of each parallelizable building the AI is allowed.
	parallelBuildingsCap: number
	// Enables wallsOnHard from the play style.
	enableWalls: boolean
}

export const DIFFICULTY_PROFILES: Record<DifficultyProfile['id'], DifficultyProfile> = {
	easy: {
		id: 'easy',
		label: 'Easy',
		decisionIntervalMs: 1100,
		warmupMs: 30_000,
		gatherMult: 0.7,
		maxFighters: 5,
		maxWorkers: 4,
		parallelBuildingsCap: 1,
		enableWalls: false,
	},
	normal: {
		id: 'normal',
		label: 'Normal',
		decisionIntervalMs: 800,
		warmupMs: 18_000,
		gatherMult: 1.0,
		maxFighters: 10,
		maxWorkers: 6,
		parallelBuildingsCap: 1,
		enableWalls: false,
	},
	hard: {
		id: 'hard',
		label: 'Hard',
		decisionIntervalMs: 600,
		warmupMs: 8_000,
		gatherMult: 1.1,
		maxFighters: 18,
		maxWorkers: 9,
		parallelBuildingsCap: 3,
		enableWalls: true,
	},
}

export const PLAY_STYLES: Record<PlayStyle, PlayStyleConfig> = {
	rush: {
		label: 'Rush',
		description: 'Aggressive — light units fast, attacks early, ignores walls.',
		pushArmySize: 5,
		composition: {
			'light-infantry': 4,
			'heavy-infantry': 1,
			'light-cavalry': 2,
			archer: 1,
		},
		buildOrder: [
			'town-hall',
			'lumber-camp',
			'mining-camp',
			'barracks',
			'farm',
			'barracks',
			'stable',
			'library',
		],
		parallelizable: ['barracks', 'farm', 'stable'],
		wallsOnHard: false,
		techPriority: ['sharp-blades', 'wheelbarrow', 'forging', 'husbandry'],
		aggression: 0.85,
	},
	boom: {
		label: 'Boom',
		description: 'Eco-first — deep worker count, deferred military, big late-game army.',
		pushArmySize: 10,
		composition: {
			'heavy-infantry': 2,
			archer: 3,
			'heavy-cavalry': 2,
			siege: 1,
		},
		buildOrder: [
			'town-hall',
			'mill',
			'lumber-camp',
			'mining-camp',
			'farm',
			'farm',
			'market',
			'library',
			'barracks',
			'archery-range',
			'town-hall',
			'stable',
		],
		parallelizable: ['farm', 'mill', 'town-hall', 'barracks', 'archery-range'],
		wallsOnHard: true,
		techPriority: [
			'wheelbarrow',
			'loom',
			'masonry',
			'sharp-blades',
			'hand-cart',
			'forging',
			'architecture',
		],
		aggression: 0.5,
	},
	turtle: {
		label: 'Turtle',
		description: 'Defensive — walls, towers, archers. Late push.',
		pushArmySize: 12,
		composition: {
			archer: 4,
			skirmisher: 2,
			'heavy-infantry': 2,
			'heavy-cavalry': 1,
		},
		buildOrder: [
			'town-hall',
			'lumber-camp',
			'mining-camp',
			'farm',
			'library',
			'archery-range',
			'tower',
			'wall',
			'barracks',
			'tower',
			'castle',
		],
		parallelizable: ['tower', 'archery-range', 'wall', 'farm'],
		wallsOnHard: true,
		techPriority: [
			'fletching',
			'masonry',
			'bodkin-arrow',
			'ballistics',
			'stonemasonry',
			'tower-marksmanship',
			'bracer',
			'architecture',
		],
		aggression: 0.3,
	},
	balanced: {
		label: 'Balanced',
		description: 'Mixed comp, standard timing. Mid-game push with a flexible army.',
		pushArmySize: 8,
		composition: {
			'heavy-infantry': 2,
			archer: 2,
			'heavy-cavalry': 2,
			'light-cavalry': 1,
		},
		buildOrder: [
			'town-hall',
			'lumber-camp',
			'mining-camp',
			'farm',
			'barracks',
			'archery-range',
			'stable',
			'library',
			'farm',
			'tower',
		],
		parallelizable: ['barracks', 'archery-range', 'stable', 'farm'],
		wallsOnHard: false,
		techPriority: ['sharp-blades', 'fletching', 'wheelbarrow', 'forging', 'chain-mail', 'masonry'],
		aggression: 0.6,
	},
}

// Per-civ → play style. Derived from each civ's mechanical bias, not a
// hard-coded role — civs whose bonuses make them shine with a particular
// composition lean toward that style.
export const CIV_PLAY_STYLES: Record<NationId, PlayStyle> = {
	britons: 'turtle',
	vikings: 'rush',
	romans: 'balanced',
	mongols: 'rush',
	egyptians: 'turtle',
	japanese: 'balanced',
	chinese: 'boom',
	persians: 'boom',
	greeks: 'turtle',
	aztecs: 'rush',
	mayans: 'turtle',
	goths: 'rush',
	celts: 'rush',
	saracens: 'balanced',
	byzantines: 'turtle',
	franks: 'balanced',
	slavs: 'balanced',
	indians: 'boom',
	turks: 'boom',
	spanish: 'boom',
}

export function styleForNation(nation: NationId): PlayStyleConfig {
	return PLAY_STYLES[CIV_PLAY_STYLES[nation]]
}
