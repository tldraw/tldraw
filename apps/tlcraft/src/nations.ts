// 20 historical civilizations. Each is picked once at the start of a match
// and grants its player a typed bonuses array (2-3 bonuses each) plus a
// signature tech that unlocks a unique unit. Bonuses are read in tech.ts via
// generic lookup helpers; whatever isn't yet wired into game-loop math is
// still shown to the player on the civ picker and resulting HUD.

import { TechId } from './tech-config'
import { ArchetypeId, UnitKind } from './unit-config'

export type NationId =
	| 'britons'
	| 'vikings'
	| 'romans'
	| 'mongols'
	| 'egyptians'
	| 'japanese'
	| 'chinese'
	| 'persians'
	| 'greeks'
	| 'aztecs'
	| 'mayans'
	| 'goths'
	| 'celts'
	| 'saracens'
	| 'byzantines'
	| 'franks'
	| 'slavs'
	| 'indians'
	| 'turks'
	| 'spanish'

// ---------------------------------------------------------------------------
// Bonuses
//
// Discriminated union covering every civ-specific effect. Anything not yet
// consumed in tech.ts is still defined here so the UI can show the bonus to
// the player; wiring the runtime side is a one-line addition in tech.ts.

export type UnitStat = 'hp' | 'attack' | 'speed' | 'cost' | 'trainTime'
export type BuildingScope = 'all' | 'defensive' | 'economic' | 'military'
export type BuildingStat = 'hp' | 'cost' | 'buildTime'
export type GatherResource = 'gold' | 'wood' | 'stone' | 'all'

export type NationBonus =
	| {
			kind: 'unit-mult'
			archetype: ArchetypeId | 'all'
			stat: UnitStat
			mult: number
			description: string
	  }
	| {
			kind: 'building-mult'
			scope: BuildingScope
			stat: BuildingStat
			mult: number
			description: string
	  }
	| {
			kind: 'gather-mult'
			resource: GatherResource
			mult: number
			description: string
	  }
	| {
			kind: 'archer-range'
			bonus: number
			description: string
	  }
	| {
			kind: 'tower-range'
			bonus: number
			description: string
	  }
	| {
			kind: 'research-mult'
			mult: number
			description: string
	  }
	| {
			kind: 'farm-cap-mult'
			mult: number
			description: string
	  }
	| {
			kind: 'starting-villagers'
			bonus: number
			description: string
	  }
	| {
			kind: 'starting-resources'
			gold?: number
			wood?: number
			stone?: number
			description: string
	  }

export interface Nation {
	id: NationId
	label: string
	tagline: string
	description: string
	// Two or three thematic bonuses. The bonuses array order doesn't matter at
	// runtime; the civ picker shows them in this order.
	bonuses: NationBonus[]
	// The tech ID (in tech-config.ts) that unlocks this nation's unique unit.
	signatureTech: TechId
	uniqueUnit: UnitKind
	// Accent colour used to tint this civ's unique unit overlay and the
	// civ-picker card border.
	accentColor: string
}

export const NATIONS: Nation[] = [
	{
		id: 'britons',
		label: 'Britons',
		tagline: 'Hold the line, draw the bow',
		description: 'A defensive archery civilization that out-ranges and out-walls its rivals.',
		bonuses: [
			{ kind: 'archer-range', bonus: 1, description: 'Archers +1 range' },
			{ kind: 'gather-mult', resource: 'wood', mult: 1.1, description: 'Lumberjacks +10%' },
			{
				kind: 'building-mult',
				scope: 'economic',
				stat: 'cost',
				mult: 0.85,
				description: 'Economic buildings -15% cost',
			},
		],
		signatureTech: 'yew-bow',
		uniqueUnit: 'longbowman',
		accentColor: 'hsl(212, 65%, 55%)',
	},
	{
		id: 'vikings',
		label: 'Vikings',
		tagline: 'Wolves of the wind and water',
		description: 'Aggressive raiders with cheap, tough infantry and a fast lumber economy.',
		bonuses: [
			{
				kind: 'unit-mult',
				archetype: 'light-infantry',
				stat: 'hp',
				mult: 1.2,
				description: 'Light infantry +20% HP',
			},
			{ kind: 'gather-mult', resource: 'wood', mult: 1.1, description: 'Lumberjacks +10%' },
			{
				kind: 'building-mult',
				scope: 'military',
				stat: 'buildTime',
				mult: 0.85,
				description: 'Military buildings build 15% faster',
			},
		],
		signatureTech: 'berserkergang',
		uniqueUnit: 'berserker',
		accentColor: 'hsl(0, 60%, 50%)',
	},
	{
		id: 'romans',
		label: 'Romans',
		tagline: 'Discipline, masonry, the legion',
		description:
			'Steady infantry civ — strong walls, faster builders, and a punishing heavy infantry.',
		bonuses: [
			{
				kind: 'unit-mult',
				archetype: 'heavy-infantry',
				stat: 'attack',
				mult: 1.1,
				description: 'Heavy infantry +10% attack',
			},
			{
				kind: 'building-mult',
				scope: 'defensive',
				stat: 'cost',
				mult: 0.75,
				description: 'Walls and towers -25% cost',
			},
			{
				kind: 'building-mult',
				scope: 'all',
				stat: 'buildTime',
				mult: 0.85,
				description: 'Buildings construct 15% faster',
			},
		],
		signatureTech: 'legio',
		uniqueUnit: 'legionnaire',
		accentColor: 'hsl(355, 70%, 45%)',
	},
	{
		id: 'mongols',
		label: 'Mongols',
		tagline: 'Strike from the saddle',
		description:
			'Mobile cavalry civ that hits fast, retreats faster, and wears armies down on the move.',
		bonuses: [
			{
				kind: 'unit-mult',
				archetype: 'light-cavalry',
				stat: 'hp',
				mult: 1.2,
				description: 'Light cavalry +20% HP',
			},
			{
				kind: 'unit-mult',
				archetype: 'light-cavalry',
				stat: 'speed',
				mult: 1.15,
				description: 'Light cavalry +15% speed',
			},
			{
				kind: 'unit-mult',
				archetype: 'light-cavalry',
				stat: 'trainTime',
				mult: 0.8,
				description: 'Light cavalry trains 20% faster',
			},
		],
		signatureTech: 'horde-tactics',
		uniqueUnit: 'mangudai',
		accentColor: 'hsl(28, 80%, 50%)',
	},
	{
		id: 'egyptians',
		label: 'Egyptians',
		tagline: 'Builders of stone, masters of the bow',
		description: 'Defensive civ with cheaper workers, sturdier walls, and longer-ranged towers.',
		bonuses: [
			{ kind: 'tower-range', bonus: 1, description: 'Towers +1 range' },
			{
				kind: 'unit-mult',
				archetype: 'all',
				stat: 'cost',
				mult: 0.9,
				description: 'All units -10% cost',
			},
			{
				kind: 'building-mult',
				scope: 'defensive',
				stat: 'hp',
				mult: 1.2,
				description: 'Walls and towers +20% HP',
			},
		],
		signatureTech: 'sun-chariot',
		uniqueUnit: 'chariot-archer',
		accentColor: 'hsl(45, 80%, 50%)',
	},
	{
		id: 'japanese',
		label: 'Japanese',
		tagline: 'Honour by the blade',
		description: 'A precise infantry civ with quick-strike heavy infantry and resilient defences.',
		bonuses: [
			{
				kind: 'unit-mult',
				archetype: 'heavy-infantry',
				stat: 'attack',
				mult: 1.15,
				description: 'Heavy infantry +15% attack',
			},
			{
				kind: 'building-mult',
				scope: 'defensive',
				stat: 'hp',
				mult: 1.2,
				description: 'Walls and towers +20% HP',
			},
			{ kind: 'gather-mult', resource: 'all', mult: 1.05, description: 'All gather rates +5%' },
		],
		signatureTech: 'bushido',
		uniqueUnit: 'samurai',
		accentColor: 'hsl(345, 65%, 50%)',
	},
	{
		id: 'chinese',
		label: 'Chinese',
		tagline: 'Many hands, many arrows',
		description:
			'Eco-and-archer civ that snowballs through cheap research and an early worker bonus.',
		bonuses: [
			{ kind: 'starting-villagers', bonus: 3, description: 'Start with +3 villagers' },
			{ kind: 'research-mult', mult: 1.2, description: 'Research completes 20% faster' },
			{
				kind: 'unit-mult',
				archetype: 'archer',
				stat: 'attack',
				mult: 1.1,
				description: 'Archers +10% attack',
			},
		],
		signatureTech: 'repeating-bolt',
		uniqueUnit: 'chu-ko-nu',
		accentColor: 'hsl(15, 70%, 50%)',
	},
	{
		id: 'persians',
		label: 'Persians',
		tagline: 'The march of the elephants',
		description: 'Heavy cavalry civ with sturdy buildings and a slow, devastating shock force.',
		bonuses: [
			{
				kind: 'building-mult',
				scope: 'all',
				stat: 'hp',
				mult: 1.1,
				description: 'All buildings +10% HP',
			},
			{ kind: 'gather-mult', resource: 'all', mult: 1.1, description: 'All gather rates +10%' },
			{
				kind: 'unit-mult',
				archetype: 'heavy-cavalry',
				stat: 'hp',
				mult: 1.1,
				description: 'Heavy cavalry +10% HP',
			},
		],
		signatureTech: 'royal-stables',
		uniqueUnit: 'war-elephant',
		accentColor: 'hsl(195, 70%, 50%)',
	},
	{
		id: 'greeks',
		label: 'Greeks',
		tagline: 'The shield wall holds',
		description:
			'Scholars and shield-bearers — strong libraries, sturdy infantry, formidable walls.',
		bonuses: [
			{
				kind: 'building-mult',
				scope: 'defensive',
				stat: 'hp',
				mult: 1.2,
				description: 'Walls and towers +20% HP',
			},
			{
				kind: 'unit-mult',
				archetype: 'heavy-infantry',
				stat: 'hp',
				mult: 1.1,
				description: 'Heavy infantry +10% HP',
			},
			{ kind: 'research-mult', mult: 1.15, description: 'Research completes 15% faster' },
		],
		signatureTech: 'phalanx',
		uniqueUnit: 'hoplite',
		accentColor: 'hsl(220, 60%, 50%)',
	},
	{
		id: 'aztecs',
		label: 'Aztecs',
		tagline: 'Ferocity by the sun',
		description: 'Light infantry rush civ that trains quickly and hits with religious fervour.',
		bonuses: [
			{
				kind: 'unit-mult',
				archetype: 'light-infantry',
				stat: 'attack',
				mult: 1.15,
				description: 'Light infantry +15% attack',
			},
			{
				kind: 'unit-mult',
				archetype: 'all',
				stat: 'trainTime',
				mult: 0.9,
				description: 'All units train 10% faster',
			},
			{ kind: 'starting-villagers', bonus: 2, description: 'Start with +2 villagers' },
		],
		signatureTech: 'jaguar-rite',
		uniqueUnit: 'jaguar-warrior',
		accentColor: 'hsl(120, 50%, 40%)',
	},
	{
		id: 'mayans',
		label: 'Mayans',
		tagline: 'Stone, feather, and obsidian',
		description: 'Frugal archer civ — cheap archers, cheap walls, and an early eco edge.',
		bonuses: [
			{
				kind: 'unit-mult',
				archetype: 'archer',
				stat: 'cost',
				mult: 0.85,
				description: 'Archers -15% cost',
			},
			{
				kind: 'building-mult',
				scope: 'defensive',
				stat: 'cost',
				mult: 0.7,
				description: 'Walls and towers -30% cost',
			},
			{ kind: 'starting-villagers', bonus: 2, description: 'Start with +2 villagers' },
		],
		signatureTech: 'el-dorado',
		uniqueUnit: 'plumed-archer',
		accentColor: 'hsl(150, 50%, 40%)',
	},
	{
		id: 'goths',
		label: 'Goths',
		tagline: 'The horde at the gate',
		description: 'Infantry spam civ — cheaper, tougher infantry that just keep coming.',
		bonuses: [
			{
				kind: 'unit-mult',
				archetype: 'heavy-infantry',
				stat: 'cost',
				mult: 0.75,
				description: 'Heavy infantry -25% cost',
			},
			{
				kind: 'unit-mult',
				archetype: 'heavy-infantry',
				stat: 'hp',
				mult: 1.1,
				description: 'Heavy infantry +10% HP',
			},
			{
				kind: 'unit-mult',
				archetype: 'all',
				stat: 'trainTime',
				mult: 0.9,
				description: 'All units train 10% faster',
			},
		],
		signatureTech: 'anarchy',
		uniqueUnit: 'huskarl',
		accentColor: 'hsl(35, 50%, 35%)',
	},
	{
		id: 'celts',
		label: 'Celts',
		tagline: 'Howl through the heather',
		description: 'Fast light infantry civ with a thriving lumber economy and dangerous siege.',
		bonuses: [
			{
				kind: 'unit-mult',
				archetype: 'light-infantry',
				stat: 'speed',
				mult: 1.15,
				description: 'Light infantry +15% speed',
			},
			{ kind: 'gather-mult', resource: 'wood', mult: 1.15, description: 'Lumberjacks +15%' },
			{
				kind: 'unit-mult',
				archetype: 'siege',
				stat: 'attack',
				mult: 1.15,
				description: 'Siege +15% attack',
			},
		],
		signatureTech: 'woad-paint',
		uniqueUnit: 'woad-raider',
		accentColor: 'hsl(165, 50%, 40%)',
	},
	{
		id: 'saracens',
		label: 'Saracens',
		tagline: 'Trade winds and steel',
		description: 'Cavalry-and-economy civ with strong markets, swift building, and elite riders.',
		bonuses: [
			{
				kind: 'unit-mult',
				archetype: 'heavy-cavalry',
				stat: 'attack',
				mult: 1.1,
				description: 'Heavy cavalry +10% attack',
			},
			{ kind: 'gather-mult', resource: 'gold', mult: 1.1, description: 'Gold miners +10%' },
			{
				kind: 'building-mult',
				scope: 'all',
				stat: 'buildTime',
				mult: 0.9,
				description: 'Buildings construct 10% faster',
			},
		],
		signatureTech: 'mamluk-guard',
		uniqueUnit: 'mameluke',
		accentColor: 'hsl(50, 70%, 45%)',
	},
	{
		id: 'byzantines',
		label: 'Byzantines',
		tagline: 'The bulwark of empires',
		description:
			'Resilient civ — sturdy buildings, cheap defences, and shock cavalry to break a line.',
		bonuses: [
			{
				kind: 'building-mult',
				scope: 'all',
				stat: 'hp',
				mult: 1.2,
				description: 'All buildings +20% HP',
			},
			{
				kind: 'building-mult',
				scope: 'defensive',
				stat: 'cost',
				mult: 0.75,
				description: 'Walls and towers -25% cost',
			},
			{
				kind: 'unit-mult',
				archetype: 'heavy-cavalry',
				stat: 'hp',
				mult: 1.1,
				description: 'Heavy cavalry +10% HP',
			},
		],
		signatureTech: 'greek-fire',
		uniqueUnit: 'cataphract',
		accentColor: 'hsl(280, 50%, 50%)',
	},
	{
		id: 'franks',
		label: 'Franks',
		tagline: 'The thunder of mounted men',
		description: 'Cavalry civ with deeper farms, more workers, and unmatched heavy cavalry HP.',
		bonuses: [
			{
				kind: 'unit-mult',
				archetype: 'heavy-cavalry',
				stat: 'hp',
				mult: 1.2,
				description: 'Heavy cavalry +20% HP',
			},
			{ kind: 'farm-cap-mult', mult: 1.25, description: 'Farms +25% food capacity' },
			{ kind: 'starting-villagers', bonus: 1, description: 'Start with +1 villager' },
		],
		signatureTech: 'chivalry',
		uniqueUnit: 'throwing-axeman',
		accentColor: 'hsl(240, 50%, 50%)',
	},
	{
		id: 'slavs',
		label: 'Slavs',
		tagline: 'Strong arms, fuller storehouses',
		description: 'Infantry-and-farms civ. Slow, hard hitters with deep food reserves.',
		bonuses: [
			{
				kind: 'unit-mult',
				archetype: 'heavy-infantry',
				stat: 'attack',
				mult: 1.1,
				description: 'Heavy infantry +10% attack',
			},
			{ kind: 'farm-cap-mult', mult: 1.5, description: 'Farms +50% food capacity' },
			{ kind: 'gather-mult', resource: 'wood', mult: 1.1, description: 'Lumberjacks +10%' },
		],
		signatureTech: 'druzhina',
		uniqueUnit: 'boyar',
		accentColor: 'hsl(60, 50%, 45%)',
	},
	{
		id: 'indians',
		label: 'Indians',
		tagline: 'The desert tide',
		description:
			'Cheap-villager civ — gold-rich economy and tough light cavalry on the open ground.',
		bonuses: [
			{
				kind: 'unit-mult',
				archetype: 'all',
				stat: 'cost',
				mult: 0.9,
				description: 'All units -10% cost',
			},
			{ kind: 'gather-mult', resource: 'gold', mult: 1.05, description: 'Gold miners +5%' },
			{
				kind: 'unit-mult',
				archetype: 'light-cavalry',
				stat: 'hp',
				mult: 1.1,
				description: 'Light cavalry +10% HP',
			},
		],
		signatureTech: 'sultanate',
		uniqueUnit: 'imperial-camel',
		accentColor: 'hsl(20, 60%, 45%)',
	},
	{
		id: 'turks',
		label: 'Turks',
		tagline: 'Gunpowder and gold',
		description: 'Late-game civ — abundant gold, sharp archers, and accelerated science.',
		bonuses: [
			{ kind: 'gather-mult', resource: 'gold', mult: 1.2, description: 'Gold miners +20%' },
			{
				kind: 'unit-mult',
				archetype: 'archer',
				stat: 'attack',
				mult: 1.1,
				description: 'Archers +10% attack',
			},
			{ kind: 'research-mult', mult: 1.1, description: 'Research completes 10% faster' },
		],
		signatureTech: 'janissary-corps',
		uniqueUnit: 'janissary',
		accentColor: 'hsl(180, 60%, 40%)',
	},
	{
		id: 'spanish',
		label: 'Spanish',
		tagline: 'Crown, conquest, and gold',
		description: 'Boom civ — fastest builders in the game and a versatile gunpowder cavalry.',
		bonuses: [
			{
				kind: 'building-mult',
				scope: 'all',
				stat: 'buildTime',
				mult: 0.7,
				description: 'Buildings construct 30% faster',
			},
			{
				kind: 'unit-mult',
				archetype: 'light-cavalry',
				stat: 'attack',
				mult: 1.1,
				description: 'Light cavalry +10% attack',
			},
			{
				kind: 'starting-resources',
				gold: 100,
				wood: 100,
				description: 'Start with +100 gold and +100 wood',
			},
		],
		signatureTech: 'conquistadors',
		uniqueUnit: 'conquistador',
		accentColor: 'hsl(5, 70%, 45%)',
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
// pool so AI players can't double up. Uses the seeded PRNG so the outcome is
// reproducible across clients (required for lockstep multiplayer).
export function pickAiNations(humanNation: NationId): NationId[] {
	const pool = NATIONS.filter((n) => n.id !== humanNation).map((n) => n.id)
	return shuffleInPlace(pool)
}
