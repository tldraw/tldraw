// Tech tree.
//
// Three kinds of tech:
//   - 'advance': age-up research, queued at the Town Hall (feudal-age,
//     castle-age, imperial-age). On completion, the player's age moves up.
//   - 'upgrade': regular tech-tree research at the Library. Grouped into
//     three tiers in the UI based on minAge.
//   - 'signature': unlocks a civilization's unique unit. Researched at the
//     Library by the matching nation only (requiredNation), Castle Age and
//     beyond.
//
// Each tech has a minAge gate. The game loop refuses to queue a tech whose
// minAge is greater than the player's current age.

import { AgeId } from './age-config'
import type { NationId } from './nations'

export type TechId =
	// Age advances
	| 'feudal-age'
	| 'castle-age'
	| 'imperial-age'
	// Feudal upgrades (tier 1)
	| 'sharp-blades'
	| 'fletching'
	| 'loom'
	| 'wheelbarrow'
	| 'masonry'
	// Castle upgrades (tier 2)
	| 'forging'
	| 'bodkin-arrow'
	| 'padded-armor'
	| 'hand-cart'
	| 'ballistics'
	| 'stonemasonry'
	| 'chain-mail'
	| 'husbandry'
	// Imperial upgrades (tier 3)
	| 'blast-furnace'
	| 'bracer'
	| 'plate-mail'
	| 'siege-engineers'
	| 'architecture'
	| 'bloodlines'
	| 'tracking'
	| 'tower-marksmanship'
	// Signatures (one per civ)
	| 'yew-bow'
	| 'berserkergang'
	| 'legio'
	| 'horde-tactics'
	| 'sun-chariot'
	| 'bushido'
	| 'repeating-bolt'
	| 'royal-stables'
	| 'phalanx'
	| 'jaguar-rite'
	| 'el-dorado'
	| 'anarchy'
	| 'woad-paint'
	| 'mamluk-guard'
	| 'greek-fire'
	| 'chivalry'
	| 'druzhina'
	| 'sultanate'
	| 'janissary-corps'
	| 'conquistadors'

export type TechKind = 'advance' | 'upgrade' | 'signature'

export interface TechConfig {
	label: string
	description: string
	cost: { gold: number; wood: number; stone?: number }
	researchMs: number
	kind: TechKind
	// UI grouping for the Library research panel. Advance techs are never
	// shown here; their tier field is set to 1 but ignored.
	tier: 1 | 2 | 3
	minAge: AgeId
	prereqs: TechId[]
	requiredNation?: NationId
	// Only set for kind === 'advance'. Reaching this tech moves the player
	// into the named age.
	advanceToAge?: AgeId
}

export const TECH_CONFIG: Record<TechId, TechConfig> = {
	// ---- Age advances -----------------------------------------------------
	'feudal-age': {
		label: 'Advance to Feudal Age',
		description: 'Unlocks the barracks, towers, walls, market, and the first wave of research.',
		cost: { gold: 200, wood: 200 },
		researchMs: 60_000,
		kind: 'advance',
		tier: 1,
		minAge: 'dark',
		prereqs: [],
		advanceToAge: 'feudal',
	},
	'castle-age': {
		label: 'Advance to Castle Age',
		description: 'Unlocks the castle, monastery, siege workshop, and each civ’s unique unit.',
		cost: { gold: 400, wood: 300, stone: 100 },
		researchMs: 120_000,
		kind: 'advance',
		tier: 1,
		minAge: 'feudal',
		prereqs: ['feudal-age'],
		advanceToAge: 'castle',
	},
	'imperial-age': {
		label: 'Advance to Imperial Age',
		description: 'Unlocks trebuchets, tier-3 upgrades, and the most powerful units.',
		cost: { gold: 800, wood: 500, stone: 300 },
		researchMs: 180_000,
		kind: 'advance',
		tier: 1,
		minAge: 'castle',
		prereqs: ['castle-age'],
		advanceToAge: 'imperial',
	},

	// ---- Feudal upgrades (tier 1) -----------------------------------------
	'sharp-blades': {
		label: 'Sharp blades',
		description: '+10% infantry attack damage',
		cost: { gold: 80, wood: 40 },
		researchMs: 22_000,
		kind: 'upgrade',
		tier: 1,
		minAge: 'feudal',
		prereqs: [],
	},
	fletching: {
		label: 'Fletching',
		description: '+1 archer range',
		cost: { gold: 80, wood: 50 },
		researchMs: 22_000,
		kind: 'upgrade',
		tier: 1,
		minAge: 'feudal',
		prereqs: [],
	},
	loom: {
		label: 'Loom',
		description: '+25 villager HP',
		cost: { gold: 50, wood: 0 },
		researchMs: 18_000,
		kind: 'upgrade',
		tier: 1,
		minAge: 'feudal',
		prereqs: [],
	},
	wheelbarrow: {
		label: 'Wheelbarrow',
		description: '+25% villager gather rate',
		cost: { gold: 60, wood: 40 },
		researchMs: 20_000,
		kind: 'upgrade',
		tier: 1,
		minAge: 'feudal',
		prereqs: [],
	},
	masonry: {
		label: 'Masonry',
		description: '+20% building HP (new buildings only)',
		cost: { gold: 100, wood: 80 },
		researchMs: 26_000,
		kind: 'upgrade',
		tier: 1,
		minAge: 'feudal',
		prereqs: [],
	},

	// ---- Castle upgrades (tier 2) -----------------------------------------
	forging: {
		label: 'Forging',
		description: '+15% infantry attack damage',
		cost: { gold: 140, wood: 60 },
		researchMs: 28_000,
		kind: 'upgrade',
		tier: 2,
		minAge: 'castle',
		prereqs: ['sharp-blades'],
	},
	'bodkin-arrow': {
		label: 'Bodkin arrow',
		description: '+1 archer range',
		cost: { gold: 140, wood: 60 },
		researchMs: 28_000,
		kind: 'upgrade',
		tier: 2,
		minAge: 'castle',
		prereqs: ['fletching'],
	},
	'padded-armor': {
		label: 'Padded armor',
		description: '+20% infantry HP (new units only)',
		cost: { gold: 120, wood: 80 },
		researchMs: 28_000,
		kind: 'upgrade',
		tier: 2,
		minAge: 'castle',
		prereqs: ['loom'],
	},
	'hand-cart': {
		label: 'Hand cart',
		description: '+50% villager carry capacity',
		cost: { gold: 120, wood: 80 },
		researchMs: 26_000,
		kind: 'upgrade',
		tier: 2,
		minAge: 'castle',
		prereqs: ['wheelbarrow'],
	},
	ballistics: {
		label: 'Ballistics',
		description: '+20% tower attack damage',
		cost: { gold: 120, wood: 60 },
		researchMs: 26_000,
		kind: 'upgrade',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
	},
	stonemasonry: {
		label: 'Stonemasonry',
		description: 'Unlocks the Castle — heavy fortification with an area attack',
		cost: { gold: 150, wood: 100, stone: 100 },
		researchMs: 30_000,
		kind: 'upgrade',
		tier: 2,
		minAge: 'castle',
		prereqs: ['masonry'],
	},
	'chain-mail': {
		label: 'Chain mail',
		description: '+20% cavalry HP (new units only)',
		cost: { gold: 140, wood: 60 },
		researchMs: 28_000,
		kind: 'upgrade',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
	},
	husbandry: {
		label: 'Husbandry',
		description: '+15% cavalry speed',
		cost: { gold: 120, wood: 40 },
		researchMs: 26_000,
		kind: 'upgrade',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
	},

	// ---- Imperial upgrades (tier 3) ---------------------------------------
	'blast-furnace': {
		label: 'Blast furnace',
		description: '+20% infantry attack damage',
		cost: { gold: 220, wood: 100 },
		researchMs: 36_000,
		kind: 'upgrade',
		tier: 3,
		minAge: 'imperial',
		prereqs: ['forging'],
	},
	bracer: {
		label: 'Bracer',
		description: '+1 archer range',
		cost: { gold: 200, wood: 80 },
		researchMs: 34_000,
		kind: 'upgrade',
		tier: 3,
		minAge: 'imperial',
		prereqs: ['bodkin-arrow'],
	},
	'plate-mail': {
		label: 'Plate mail',
		description: '+30% infantry HP (new units only)',
		cost: { gold: 220, wood: 120 },
		researchMs: 36_000,
		kind: 'upgrade',
		tier: 3,
		minAge: 'imperial',
		prereqs: ['padded-armor'],
	},
	'siege-engineers': {
		label: 'Siege engineers',
		description: '+25% siege attack range',
		cost: { gold: 240, wood: 140 },
		researchMs: 36_000,
		kind: 'upgrade',
		tier: 3,
		minAge: 'imperial',
		prereqs: [],
	},
	architecture: {
		label: 'Architecture',
		description: '+20% building HP and -10% build time (new buildings only)',
		cost: { gold: 220, wood: 160 },
		researchMs: 36_000,
		kind: 'upgrade',
		tier: 3,
		minAge: 'imperial',
		prereqs: ['stonemasonry'],
	},
	bloodlines: {
		label: 'Bloodlines',
		description: '+20% cavalry HP (new units only)',
		cost: { gold: 200, wood: 100 },
		researchMs: 34_000,
		kind: 'upgrade',
		tier: 3,
		minAge: 'imperial',
		prereqs: ['chain-mail'],
	},
	tracking: {
		label: 'Tracking',
		description: '+50% unit line of sight',
		cost: { gold: 160, wood: 60 },
		researchMs: 30_000,
		kind: 'upgrade',
		tier: 3,
		minAge: 'imperial',
		prereqs: [],
	},
	'tower-marksmanship': {
		label: 'Tower marksmanship',
		description: '+30% tower attack range',
		cost: { gold: 200, wood: 80 },
		researchMs: 32_000,
		kind: 'upgrade',
		tier: 3,
		minAge: 'imperial',
		prereqs: ['ballistics'],
	},

	// ---- Signature techs (one per civ) ------------------------------------
	'yew-bow': {
		label: 'Yew bow',
		description: 'Britons: unlocks the Longbowman — long-range elite archer.',
		cost: { gold: 200, wood: 100 },
		researchMs: 35_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'britons',
	},
	berserkergang: {
		label: 'Berserkergang',
		description: 'Vikings: unlocks the Berserker — fast, hard-hitting raider.',
		cost: { gold: 180, wood: 80 },
		researchMs: 32_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'vikings',
	},
	legio: {
		label: 'Legio',
		description: 'Romans: unlocks the Legionnaire — disciplined heavy infantry.',
		cost: { gold: 200, wood: 100 },
		researchMs: 35_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'romans',
	},
	'horde-tactics': {
		label: 'Horde tactics',
		description: 'Mongols: unlocks the Mangudai — fast cavalry archer.',
		cost: { gold: 200, wood: 100 },
		researchMs: 32_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'mongols',
	},
	'sun-chariot': {
		label: 'Sun chariot',
		description: 'Egyptians: unlocks the Chariot Archer — mobile ranged attacker.',
		cost: { gold: 200, wood: 120 },
		researchMs: 33_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'egyptians',
	},
	bushido: {
		label: 'Bushido',
		description: 'Japanese: unlocks the Samurai — quick-strike heavy infantry.',
		cost: { gold: 220, wood: 100 },
		researchMs: 34_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'japanese',
	},
	'repeating-bolt': {
		label: 'Repeating bolt',
		description: 'Chinese: unlocks the Chu-ko-nu — rapid-firing crossbow archer.',
		cost: { gold: 180, wood: 100 },
		researchMs: 32_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'chinese',
	},
	'royal-stables': {
		label: 'Royal stables',
		description: 'Persians: unlocks the War Elephant — tank-tier heavy cavalry.',
		cost: { gold: 260, wood: 120 },
		researchMs: 38_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'persians',
	},
	phalanx: {
		label: 'Phalanx',
		description: 'Greeks: unlocks the Hoplite — disciplined shield-line infantry.',
		cost: { gold: 200, wood: 100 },
		researchMs: 34_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'greeks',
	},
	'jaguar-rite': {
		label: 'Jaguar rite',
		description: 'Aztecs: unlocks the Jaguar Warrior — fast, fierce light infantry.',
		cost: { gold: 180, wood: 80 },
		researchMs: 32_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'aztecs',
	},
	'el-dorado': {
		label: 'El dorado',
		description: 'Mayans: unlocks the Plumed Archer — fast foot archer.',
		cost: { gold: 180, wood: 100 },
		researchMs: 32_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'mayans',
	},
	anarchy: {
		label: 'Anarchy',
		description: 'Goths: unlocks the Huskarl — anti-archer heavy infantry.',
		cost: { gold: 160, wood: 80 },
		researchMs: 30_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'goths',
	},
	'woad-paint': {
		label: 'Woad paint',
		description: 'Celts: unlocks the Woad Raider — howling fast light infantry.',
		cost: { gold: 180, wood: 80 },
		researchMs: 32_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'celts',
	},
	'mamluk-guard': {
		label: 'Mamluk guard',
		description: 'Saracens: unlocks the Mameluke — armoured javelin cavalry.',
		cost: { gold: 220, wood: 100 },
		researchMs: 34_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'saracens',
	},
	'greek-fire': {
		label: 'Greek fire',
		description: 'Byzantines: unlocks the Cataphract — armoured shock cavalry.',
		cost: { gold: 240, wood: 120 },
		researchMs: 36_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'byzantines',
	},
	chivalry: {
		label: 'Chivalry',
		description: 'Franks: unlocks the Throwing Axeman — short-range skirmisher.',
		cost: { gold: 200, wood: 100 },
		researchMs: 33_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'franks',
	},
	druzhina: {
		label: 'Druzhina',
		description: 'Slavs: unlocks the Boyar — heavy boyar cavalry.',
		cost: { gold: 220, wood: 100 },
		researchMs: 34_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'slavs',
	},
	sultanate: {
		label: 'Sultanate',
		description: 'Indians: unlocks the Imperial Camel — tough light cavalry.',
		cost: { gold: 200, wood: 100 },
		researchMs: 33_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'indians',
	},
	'janissary-corps': {
		label: 'Janissary corps',
		description: 'Turks: unlocks the Janissary — heavy hand-cannon archer.',
		cost: { gold: 220, wood: 100 },
		researchMs: 34_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'turks',
	},
	conquistadors: {
		label: 'Conquistadors',
		description: 'Spanish: unlocks the Conquistador — mounted gunpowder skirmisher.',
		cost: { gold: 220, wood: 120 },
		researchMs: 34_000,
		kind: 'signature',
		tier: 2,
		minAge: 'castle',
		prereqs: [],
		requiredNation: 'spanish',
	},
}

export const TECH_IDS = Object.keys(TECH_CONFIG) as TechId[]

export const SIGNATURE_TECH_IDS: TechId[] = TECH_IDS.filter(
	(id) => TECH_CONFIG[id].kind === 'signature'
)

export const ADVANCE_TECH_IDS: TechId[] = TECH_IDS.filter(
	(id) => TECH_CONFIG[id].kind === 'advance'
)

// Tech IDs that appear in the Library research panel (everything except age
// advances, which are queued at the Town Hall instead).
export const LIBRARY_TECH_IDS: TechId[] = TECH_IDS.filter(
	(id) => TECH_CONFIG[id].kind !== 'advance'
)

export function getTechsByTier(tier: 1 | 2 | 3): TechId[] {
	return LIBRARY_TECH_IDS.filter((id) => TECH_CONFIG[id].tier === tier)
}

// Returns the age-advance tech for the next age after `current`, or null if
// the player is already at the final age.
export function getAdvanceTechFor(current: AgeId): TechId | null {
	const map: Record<AgeId, TechId | null> = {
		dark: 'feudal-age',
		feudal: 'castle-age',
		castle: 'imperial-age',
		imperial: null,
	}
	return map[current]
}
