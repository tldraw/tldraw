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
	available: boolean
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
 * The default prompt part set is the set of prompt parts that are available to all wands.
 */
const ALL_PROMPT_PARTS_SET = PROMPT_PART_TYPES

// const DEFAULT_PROMPT_PARTS_SET = ALL_PROMPT_PARTS_SET.filter

/**
 * The all agent actions set is the set of every possible agent action.
 */
const ALL_AGENT_ACTIONS_SET = AGENT_ACTION_TYPES

/**
 * The default agent action set is the set of agent actions that are available to all wands.
 * Project-related actions are excluded as they are only available to the orchestrator wand.
 */
const DEFAULT_AGENT_ACTION_SET = ALL_AGENT_ACTIONS_SET.filter(
	(action) => action !== 'start-project' && action !== 'end-current-project'
)

/**
 * Wand definitions determine what wands are available to the agent.
 */
export const WAND_DEFINITIONS = [
	{
		type: 'god',
		name: 'Almighty Wand',
		description: 'A wand that allows the fairy to perform any action.',
		available: true,
		parts: ALL_PROMPT_PARTS_SET,
		actions: ALL_AGENT_ACTIONS_SET, // Includes all actions, including project actions
	},
	{
		type: 'default',
		name: 'Default Wand',
		description: 'A wand that allows the fairy to perform default actions.',
		available: true,
		parts: ALL_PROMPT_PARTS_SET,
		actions: DEFAULT_AGENT_ACTION_SET,
	},
	{
		type: 'orchestrator',
		name: 'Orchestrator Wand',
		description: 'A wand that allows the fairy to orchestrate other fairies.',
		available: true,
		parts: ALL_PROMPT_PARTS_SET,
		actions: [
			'message',
			'think',
			'review',
			'update-todo-list',
			'fly-to-bounds',
			'assign-todo-item',
			'start-project',
			'end-current-project',
			'change-page',
			'create-page',
		],
	},
	{
		type: 'drone',
		name: 'Drone Wand',
		description: 'A wand that allows the fairy to perform simple actions.',
		available: true,
		parts: [
			'messages',
			'personality',
			'wand',
			'blurryShapes',
			'screenshot',
			'viewportBounds',
			'chatHistory',
			'sharedTodoList',
			'currentProject',
		],
		actions: DEFAULT_AGENT_ACTION_SET.filter(
			(action) => action !== 'assign-todo-item' && action !== 'enter-orchestration-mode'
		),
	},
	{
		type: 'personality',
		name: 'Personality Wand',
		available: false,
		description:
			"A wand for taking a user prompt and imbuing it with the fairy's personality. Used internally.",
		parts: ALL_PROMPT_PARTS_SET,
		actions: ['think', 'imbue-personality'],
	},
	{
		type: 'pen',
		name: 'Pen Wand',
		description: 'A wand for drawing pictures with a pen.',
		available: true,
		parts: ALL_PROMPT_PARTS_SET,
		actions: [
			'message',
			'think',
			'review',
			'update-todo-list',
			'fly-to-bounds',
			'pen',
			'delete',
			'update',
			'move',
			'bring-to-front',
			'send-to-back',
			'rotate',
			'resize',
			'change-page',
			'create-page',
		],
	},
	{
		type: 'destroy',
		name: 'The Destroyer',
		description: 'A wand that can only delete.',
		available: true,
		parts: ALL_PROMPT_PARTS_SET,
		actions: ['message', 'think', 'review', 'update-todo-list', 'fly-to-bounds', 'delete'],
	},
	{
		type: 'mouth',
		name: 'Mouth Wand',
		description:
			"A wand with a mouth on the end. With this wand, your fairy will speak with you, but won't be able to edit the canvas.",
		available: true,
		parts: ALL_PROMPT_PARTS_SET,
		actions: ['message', 'think', 'review', 'update-todo-list', 'fly-to-bounds'],
	},
	{
		type: 'diagram',
		name: 'Diagramming Wand',
		description:
			'A wand for creating diagrams. It can manipulate shapes, but cannot draw with the pen.',
		available: true,
		parts: ALL_PROMPT_PARTS_SET,
		actions: [
			'message',
			'think',
			'review',
			'update-todo-list',
			'fly-to-bounds',
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
			'change-page',
			'create-page',
		] as const,
	},
	{
		type: 'blindfold',
		name: 'Blindfolded Wand',
		description:
			'A wand that allows the fairy to perform any action, but prevents the fairy from seeing anything.',
		available: true,
		parts: ['wand', 'messages'],
		actions: DEFAULT_AGENT_ACTION_SET,
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
