import { AgentAction } from '../types/AgentAction'
import { FairyWork } from '../types/FairyWork'
import { PromptPart } from '../types/PromptPart'

/**
 * What a fairy can see and do when in a given mode.
 */
type BaseFairyModeDefinition = {
	/** A unique identifier for the fairy mode. */
	type: string
} & (
	| {
			/** Whether the fairy mode is active in this mode. */
			active: true
			/** The prompt parts that the fairy mode allows the fairy to see. Inferred from active: if active is false, parts must be null; if active is true, parts can be a function. */
			parts(work: FairyWork): PromptPart['type'][]
			/** The actions that the fairy mode allows the fairy to take. */
			actions(work: FairyWork): AgentAction['_type'][]
	  }
	| {
			/** Whether the fairy mode is active in this mode. */
			active: false
	  }
)

/**
 * A fairy mode defines what a fairy agent can see and do.
 */
export type FairyModeDefinition = (typeof FAIRY_MODE_DEFINITIONS)[number]

/**
 * A fairy mode where the fairy is active.
 */
export type ActiveFairyModeDefinition = (typeof ACTIVE_FAIRY_MODE_DEFINITIONS)[number]

/**
 * Definitions of fairy modes — states that fairies can be in.
 */
export const FAIRY_MODE_DEFINITIONS = [
	{
		type: 'idling',
		active: false,
	},
	{
		type: 'soloing',
		active: true,
		parts: (_work: FairyWork) => [
			'mode',
			'messages',
			'screenshot',
			'viewportBounds',
			'blurryShapes',
			'peripheralShapes',
			'selectedShapes',
			'chatHistory',
			// 'userActionHistory',
			'soloTasks',
			'time',
			'pages',
			'otherFairies',
			'personality',
			'debug',
		],
		actions: (_work: FairyWork) => ['message', 'think', 'create-task', 'start-task', 'sleep'],
	},
	{
		type: 'working',
		active: true,
		parts: () => [
			// 'mode',
			// 'messages',
			// 'screenshot',
			// 'blurryShapes',
			// 'chatHistory',
			// // 'workingTasks',
			// 'personality',
			// 'debug',
		],
		actions: () => [],
	},
	{
		type: 'standing-by',
		active: false,
	},
	{
		type: 'orchestrating',
		active: true,
		parts: () => [],
		actions: () => [],
	},
] as const satisfies BaseFairyModeDefinition[]

export const ACTIVE_FAIRY_MODE_DEFINITIONS = FAIRY_MODE_DEFINITIONS.filter((mode) => mode.active)
export const FAIRY_MODE_TYPES = FAIRY_MODE_DEFINITIONS.map((mode) => mode.type)
export const FAIRY_MODE_TYPES_MAP = Object.fromEntries(
	FAIRY_MODE_DEFINITIONS.map((mode) => [mode.type, mode])
)

export function getFairyModeDefinition(type: FairyModeDefinition['type']): FairyModeDefinition {
	const mode = FAIRY_MODE_TYPES_MAP[type]
	if (!mode) throw new Error(`Unknown fairy mode: ${type}`)
	return mode
}

export function getActiveFairyModeDefinition(
	type: ActiveFairyModeDefinition['type']
): ActiveFairyModeDefinition {
	const mode = ACTIVE_FAIRY_MODE_DEFINITIONS.find((mode) => mode.type === type)
	if (!mode) throw new Error(`Unknown active fairy mode: ${type}`)
	return mode
}
