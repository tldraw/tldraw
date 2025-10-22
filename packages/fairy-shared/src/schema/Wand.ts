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
 * Wand definitions determine what wands are available to the agent.
 */
export const WAND_DEFINITIONS = [
	{
		type: 'god',
		name: 'Almighty Wand',
		description: 'A wand that allows the agent to perform any action. Use with caution.',
		isAvailableInConfig: false,
		availableParts: PROMPT_PART_TYPES,
		availableActions: AGENT_ACTION_TYPES,
	},
	{
		type: 'personality',
		name: 'Personality Wand',
		isAvailableInConfig: false,
		description:
			"A wand for taking a user prompt and imbuing it with the fairy's personality. Used internally.",
		availableParts: PROMPT_PART_TYPES,
		availableActions: ['think', 'imbue-personality'],
	},
	{
		type: 'pen',
		name: 'Pen Wand',
		description: 'A wand well-suited for drawing pictures with the pen.',
		isAvailableInConfig: true,
		availableParts: PROMPT_PART_TYPES,
		availableActions: [
			'message',
			'think',
			'review',
			'update-todo-list',
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
		availableParts: PROMPT_PART_TYPES,
		availableActions: [
			'message',
			'think',
			'review',
			'update-todo-list',
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
		availableParts: PROMPT_PART_TYPES,
		availableActions: [
			'message',
			'think',
			'review',
			'update-todo-list',
			'fly-to-bounds',
			'note-to-self',
		],
	},
	{
		type: 'diagram',
		name: 'Diagram Wand',
		description: 'A wand well-suited for creating diagrams.',
		isAvailableInConfig: true,
		availableParts: PROMPT_PART_TYPES,
		availableActions: [
			'message',
			'think',
			'review',
			'update-todo-list',
			'fly-to-bounds',
			'note-to-self',
		],
	},
] as const satisfies BaseWand[]
