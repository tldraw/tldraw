// Tech tree. Each tech has a tier (for layout) and a list of prerequisite
// techs that must be completed before it can be researched. The four
// signature techs at tier 3 are gated by nation — only the player whose
// nation matches can research them, which is checked in canQueueResearch.

import type { NationId } from './nations'

export type TechId =
	| 'sharp-blades'
	| 'tools-of-the-trade'
	| 'heavy-armor'
	| 'cavalry-training'
	| 'reinforced-walls'
	| 'tower-marksmanship'
	| 'stonemasonry'
	| 'holy-orders'
	| 'blood-frenzy'
	| 'arcane-studies'
	| 'champions-path'

export interface TechConfig {
	label: string
	description: string
	cost: { gold: number; wood: number; stone?: number }
	researchMs: number
	tier: 1 | 2 | 3
	prereqs: TechId[]
	// If set, only the player whose nation matches can research this tech.
	// Used for the four signature techs that unlock unique units.
	requiredNation?: NationId
}

export const TECH_CONFIG: Record<TechId, TechConfig> = {
	'sharp-blades': {
		label: 'Sharp blades',
		description: '+25% soldier and knight attack damage',
		cost: { gold: 80, wood: 40 },
		researchMs: 22_000,
		tier: 1,
		prereqs: [],
	},
	'tools-of-the-trade': {
		label: 'Tools of the trade',
		description: '+50% worker carry capacity',
		cost: { gold: 60, wood: 40 },
		researchMs: 18_000,
		tier: 1,
		prereqs: [],
	},
	'heavy-armor': {
		label: 'Heavy armor',
		description: '+25% melee max HP (new units only)',
		cost: { gold: 120, wood: 80 },
		researchMs: 30_000,
		tier: 2,
		prereqs: ['sharp-blades'],
	},
	'cavalry-training': {
		label: 'Cavalry training',
		description: 'Unlocks Knight at the barracks',
		cost: { gold: 150, wood: 80 },
		researchMs: 28_000,
		tier: 2,
		prereqs: ['sharp-blades'],
	},
	'reinforced-walls': {
		label: 'Reinforced walls',
		description: '+30% building HP (new buildings only)',
		cost: { gold: 100, wood: 120 },
		researchMs: 30_000,
		tier: 2,
		prereqs: ['tools-of-the-trade'],
	},
	'tower-marksmanship': {
		label: 'Tower marksmanship',
		description: '+30% tower attack range',
		cost: { gold: 120, wood: 60 },
		researchMs: 26_000,
		tier: 3,
		prereqs: ['heavy-armor'],
	},
	stonemasonry: {
		label: 'Stonemasonry',
		description: 'Unlocks the Castle — heavy fortification with an area attack',
		cost: { gold: 150, wood: 100, stone: 100 },
		researchMs: 30_000,
		tier: 3,
		prereqs: ['reinforced-walls'],
	},
	'holy-orders': {
		label: 'Holy orders',
		description: 'Unlocks the Paladin — heaviest melee unit',
		cost: { gold: 200, wood: 80 },
		researchMs: 32_000,
		tier: 3,
		prereqs: ['heavy-armor'],
		requiredNation: 'solari',
	},
	'blood-frenzy': {
		label: 'Blood frenzy',
		description: 'Unlocks the Berserker — fast, hard-hitting raider',
		cost: { gold: 180, wood: 60 },
		researchMs: 28_000,
		tier: 3,
		prereqs: ['cavalry-training'],
		requiredNation: 'crimson',
	},
	'arcane-studies': {
		label: 'Arcane studies',
		description: 'Unlocks the Sorcerer — long-range magical attacker',
		cost: { gold: 220, wood: 60 },
		researchMs: 30_000,
		tier: 3,
		prereqs: ['reinforced-walls'],
		requiredNation: 'mystic',
	},
	'champions-path': {
		label: 'Champion’s path',
		description: 'Unlocks the Champion — elite all-rounder',
		cost: { gold: 240, wood: 80 },
		researchMs: 32_000,
		tier: 3,
		prereqs: ['cavalry-training'],
		requiredNation: 'sun-tribe',
	},
}

export const TECH_IDS = Object.keys(TECH_CONFIG) as TechId[]
export const SIGNATURE_TECH_IDS: TechId[] = [
	'holy-orders',
	'blood-frenzy',
	'arcane-studies',
	'champions-path',
]

export function getTechsByTier(tier: 1 | 2 | 3): TechId[] {
	return TECH_IDS.filter((id) => TECH_CONFIG[id].tier === tier)
}
