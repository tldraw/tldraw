import { Wand, WAND_TYPES } from './Wand'

interface BaseFairyMode {
	id: string
	availableWands: Wand['type'][]
	defaultWand: Wand['type']
}

export type FairyMode = (typeof FAIRY_MODE_DEFINITIONS)[number]

export const FAIRY_MODE_DEFINITIONS = [
	{
		id: 'default',
		availableWands: WAND_TYPES.filter((wand) => wand !== 'orchestrator' && wand !== 'drone'),
		defaultWand: 'default',
	},
	{
		id: 'orchestrator',
		availableWands: ['orchestrator'],
		defaultWand: 'orchestrator',
	},
	{
		id: 'drone',
		availableWands: ['drone'],
		defaultWand: 'drone',
	},
] as const satisfies BaseFairyMode[]

export const FAIRY_MODE_IDS = FAIRY_MODE_DEFINITIONS.map((mode) => mode.id)
export const FAIRY_MODE_DEFINITIONS_MAP = Object.fromEntries(
	FAIRY_MODE_DEFINITIONS.map((mode) => [mode.id, mode])
)

export function getFairyMode(id: FairyMode['id']): FairyMode {
	const mode = FAIRY_MODE_DEFINITIONS_MAP[id]
	return mode ?? FAIRY_MODE_DEFINITIONS_MAP.default
}
