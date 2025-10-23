import { AgentAction } from '../types/AgentAction'
import { PromptPart } from '../types/PromptPart'
import { AGENT_ACTION_TYPES, PROMPT_PART_TYPES } from './FairySchema'

/**
 * The base type for a wand.
 */
interface BaseWand {
	/** A unique identifier for the wand. */
	type: string
	/** The name of the wand. */
	name: string
	/** A brief description of the wand can do. */
	description: string
	/** Whether the wand is available in the user-facing config. */
	isAvailableInConfig: boolean
	// TODO: Enable prompt part sets too
	/** The prompt parts that the wand allows the fairy to see. */
	availableParts: PromptPart['type'][]
	/** The actions that the wand allows the fairy to take. */
	availableActions: AgentAction['_type'][]
}

/**
 * A wand defines what a fairy agent can see and do.
 */
export type Wand = (typeof WAND_DEFINITIONS)[number]

/**
 * The default prompt part set is the set of prompt parts that are available to all wands.
 */
const DEFAULT_PROMPT_PART_SET = PROMPT_PART_TYPES.filter((type) => type !== 'todoList')

/**
 * The default agent action set is the set of agent actions that are available to all wands.
 */
const DEFAULT_AGENT_ACTION_SET = AGENT_ACTION_TYPES.filter(
	(action) => action !== 'update-todo-list' && action !== 'note-to-self'
)

/**
 * Wand definitions determine what wands are available to the agent.
 */
export const WAND_DEFINITIONS = [
	{
		type: 'god',
		name: 'Almighty Wand',
		description: 'A wand that allows the agent to perform any action. Use with caution.',
		isAvailableInConfig: false,
		availableParts: DEFAULT_PROMPT_PART_SET,
		availableActions: DEFAULT_AGENT_ACTION_SET,
	},
	{
		type: 'blindfold',
		name: 'Blindfold Wand',
		description:
			'A wand that allows the agent to perform any action, but without any letting it see anything.',
		isAvailableInConfig: false,
		availableParts: ['wand', 'messages'],
		availableActions: DEFAULT_AGENT_ACTION_SET,
	},
	{
		type: 'personality',
		name: 'Personality Wand',
		isAvailableInConfig: false,
		description:
			"A wand for taking a user prompt and imbuing it with the fairy's personality. Used internally.",
		availableParts: DEFAULT_PROMPT_PART_SET,
		availableActions: ['think', 'imbue-personality'],
	},
	{
		type: 'pen',
		name: 'Pen Wand',
		description: 'A wand well-suited for drawing pictures with the pen.',
		isAvailableInConfig: true,
		availableParts: DEFAULT_PROMPT_PART_SET,
		availableActions: [
			'message',
			'think',
			'review',
			// 'update-todo-list',
			'update-shared-todo-list',
			'fly-to-bounds',
			'note-to-self',
			'pen',
			'delete',
			'update',
			'move',
			'bring-to-front',
			'send-to-back',
			'rotate',
			'resize',
		],
	},
	{
		type: 'destroy',
		name: 'The Destroyer',
		description: 'A wand for deleting only.',
		isAvailableInConfig: true,
		availableParts: DEFAULT_PROMPT_PART_SET,
		availableActions: [
			'message',
			'think',
			'review',
			// 'update-todo-list',
			'update-shared-todo-list',
			'fly-to-bounds',
			'note-to-self',
			'delete',
		],
	},
	{
		type: 'mouth',
		name: 'Mouth Wand',
		description:
			"A wand with a mouth on the end. With this wand, your fairy will speak with you, but won't be able to edit the canvas.",
		isAvailableInConfig: true,
		availableParts: DEFAULT_PROMPT_PART_SET,
		availableActions: [
			'message',
			'think',
			'review',
			// 'update-todo-list',
			'update-shared-todo-list',
			'fly-to-bounds',
			'note-to-self',
		],
	},
	{
		type: 'diagram',
		name: 'Diagram Wand',
		description: 'A wand well-suited for creating diagrams.',
		isAvailableInConfig: true,
		availableParts: DEFAULT_PROMPT_PART_SET,
		availableActions: [
			'message',
			'think',
			'review',
			// 'update-todo-list',
			'update-shared-todo-list',
			'fly-to-bounds',
			'note-to-self',
			'create',
			'delete',
			'update',
			'move',
			'bring-to-front',
			'send-to-back',
			'rotate',
			'resize',
			'align',
			'distribute',
			'stack',
		] as const,
	},
] as const satisfies BaseWand[]

export const WAND_TYPES = WAND_DEFINITIONS.map((wand) => wand.type)
export const WAND_DEFINITIONS_MAP = Object.fromEntries(
	WAND_DEFINITIONS.map((wand) => [wand.type, wand])
)

export function getWand(type: Wand['type']): Wand {
	const wand = WAND_DEFINITIONS_MAP[type]
	if (!wand) throw new Error(`Unknown wand: ${type}`)
	return wand
}
