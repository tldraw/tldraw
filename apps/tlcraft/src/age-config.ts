// Age progression. Each player starts in the Dark Age and advances through
// Feudal -> Castle -> Imperial by researching the corresponding age tech at
// the Town Hall. Each age unlocks new buildings, units, and techs (see the
// minAge field on the respective configs).
//
// Advancement is a single linear track per player. There is no branching, and
// you cannot skip ages. Once advanced you cannot go back.

export type AgeId = 'dark' | 'feudal' | 'castle' | 'imperial'

export interface AgeConfig {
	id: AgeId
	label: string
	order: number
	// Cost paid when starting the age-up research. Null for the starting age.
	advanceCost: { gold: number; wood: number; stone?: number } | null
	// Duration of the age-up research, in milliseconds. Null for the starting age.
	advanceResearchMs: number | null
	// Tagline shown beside the Town Hall advance button.
	tagline: string
}

export const AGES: AgeConfig[] = [
	{
		id: 'dark',
		label: 'Dark Age',
		order: 0,
		advanceCost: null,
		advanceResearchMs: null,
		tagline: 'The starting age. Build an economy before the wolves arrive.',
	},
	{
		id: 'feudal',
		label: 'Feudal Age',
		order: 1,
		advanceCost: { gold: 200, wood: 200 },
		advanceResearchMs: 60_000,
		tagline: 'Unlocks ranged units, the market, and the first wave of upgrades.',
	},
	{
		id: 'castle',
		label: 'Castle Age',
		order: 2,
		advanceCost: { gold: 400, wood: 300, stone: 100 },
		advanceResearchMs: 120_000,
		tagline: 'Knights, stone walls, and the Castle itself.',
	},
	{
		id: 'imperial',
		label: 'Imperial Age',
		order: 3,
		advanceCost: { gold: 800, wood: 500, stone: 300 },
		advanceResearchMs: 180_000,
		tagline: 'Trebuchets, monasteries, and every civilization’s signature tech.',
	},
]

const BY_ID = new Map(AGES.map((a) => [a.id, a]))

export function getAge(id: AgeId): AgeConfig {
	const a = BY_ID.get(id)
	if (!a) throw new Error(`Unknown age: ${id}`)
	return a
}

export const STARTING_AGE: AgeId = 'dark'

export function getAgeOrder(id: AgeId): number {
	return getAge(id).order
}

export function isAgeAtLeast(actual: AgeId, required: AgeId): boolean {
	return getAgeOrder(actual) >= getAgeOrder(required)
}

export function getNextAge(id: AgeId): AgeId | null {
	const order = getAgeOrder(id)
	const next = AGES.find((a) => a.order === order + 1)
	return next ? next.id : null
}
