// Nations are picked once at the start of a match. Each gives a passive perk
// applied to that player throughout the game and unlocks a unique unit via
// a signature tech researched at the Library.
//
// Perks are pure multipliers / additive bonuses. The runtime helpers in
// tech.ts read the player's nation alongside their researched techs.

import { TechId } from './tech-config'
import { UnitKind } from './unit-config'

export type NationId = 'solari' | 'crimson' | 'mystic' | 'sun-tribe'

export interface Nation {
	id: NationId
	label: string
	tagline: string
	description: string
	// Passive perk multipliers — 1 = unchanged. Applied always for this nation.
	buildingHpMult: number
	unitSpeedMult: number
	researchSpeedMult: number
	gatherMult: number
	// The signature tech that unlocks this nation's unique unit.
	signatureTech: TechId
	// The unique unit kind unlocked by the signature tech.
	uniqueUnit: UnitKind
}

export const NATIONS: Nation[] = [
	{
		id: 'solari',
		label: 'Solari',
		tagline: 'Defenders of the dawn',
		description:
			'Builders and bulwarks. Walls go up faster and stand longer; the Paladin marches under their banner.',
		buildingHpMult: 1.25,
		unitSpeedMult: 1,
		researchSpeedMult: 1,
		gatherMult: 1,
		signatureTech: 'holy-orders',
		uniqueUnit: 'paladin',
	},
	{
		id: 'crimson',
		label: 'Crimson Horde',
		tagline: 'The fast and the furious',
		description:
			'Aggressive raiders. Every unit moves 15% faster, and the Berserker arrives early to harass.',
		buildingHpMult: 1,
		unitSpeedMult: 1.15,
		researchSpeedMult: 1,
		gatherMult: 1,
		signatureTech: 'blood-frenzy',
		uniqueUnit: 'berserker',
	},
	{
		id: 'mystic',
		label: 'Mystic Order',
		tagline: 'Knowledge is power',
		description:
			'Scholars and sorcerers. Research completes 25% faster, opening up the Sorcerer’s ranged attack.',
		buildingHpMult: 1,
		unitSpeedMult: 1,
		researchSpeedMult: 1.25,
		gatherMult: 1,
		signatureTech: 'arcane-studies',
		uniqueUnit: 'sorcerer',
	},
	{
		id: 'sun-tribe',
		label: 'Sun Tribe',
		tagline: 'A bountiful harvest',
		description:
			'Economic powerhouses. Workers carry 25% more from every gather, and the Champion is a one-soldier army.',
		buildingHpMult: 1,
		unitSpeedMult: 1,
		researchSpeedMult: 1,
		gatherMult: 1.25,
		signatureTech: 'champions-path',
		uniqueUnit: 'champion',
	},
]

const BY_ID = new Map(NATIONS.map((n) => [n.id, n]))

export function getNation(id: NationId): Nation {
	const n = BY_ID.get(id)
	if (!n) throw new Error(`Unknown nation: ${id}`)
	return n
}

import { shuffleInPlace } from './random'

// Random assignment for AI players. The human's nation is removed from the
// pool so AI can't double up. Uses the seeded PRNG so the outcome is
// reproducible across clients (required for lockstep multiplayer).
export function pickAiNations(humanNation: NationId): NationId[] {
	const pool = NATIONS.filter((n) => n.id !== humanNation).map((n) => n.id)
	return shuffleInPlace(pool)
}
