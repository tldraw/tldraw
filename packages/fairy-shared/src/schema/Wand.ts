import { AgentAction } from '../types/AgentAction'
import { PromptPart } from '../types/PromptPart'
import { AGENT_ACTION_TYPES, PROMPT_PART_TYPES } from './FairySchema'

/**
 * The base type for a wand.
 */
interface BaseWand {
	/** A unique identifier for the wand. */
	type: string
	/** The prompt parts that the wand allows the fairy to see. */
	parts: PromptPart['type'][]
	/** The actions that the wand allows the fairy to take. */
	actions: AgentAction['_type'][]
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
		type: 'default',
		parts: PROMPT_PART_TYPES.filter((part) => part !== 'heardMessages'),
		actions: AGENT_ACTION_TYPES.filter(
			(action) =>
				action !== 'end-current-project' &&
				action !== 'assign-todo-item' &&
				action !== 'proximity-chat'
		),
	},
	{
		type: 'orchestrator',
		parts: PROMPT_PART_TYPES.filter((part) => part !== 'heardMessages'),
		actions: [
			'message',
			'proximity-chat',
			'think',
			'review',
			'fly-to-bounds',
			'update-todo-list',
			'assign-todo-item',
			'start-project',
			'end-current-project',
			'change-page',
			'create-page',
			'activate-fairy',
		],
	},
	{
		type: 'drone',
		parts: [
			'messages',
			'personality',
			'heardMessages',
			'otherFairies',
			'wand',
			'blurryShapes',
			'screenshot',
			'viewportBounds',
			'chatHistory',
			'sharedTodoList',
			'currentProject',
		],
		actions: AGENT_ACTION_TYPES.filter(
			(action) =>
				action !== 'assign-todo-item' &&
				action !== 'start-project' &&
				action !== 'end-current-project' &&
				action !== 'proximity-chat'
		),
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
