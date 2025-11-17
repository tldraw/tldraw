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
			'userViewportBounds',
			'agentViewportBounds',
			'blurryShapes',
			'peripheralShapes',
			'selectedShapes',
			'chatHistory',
			'userActionHistory',
			'soloTasks',
			'time',
			'pages',
			'otherFairies',
			'personality',
			'debug',
		],
		actions: (_work: FairyWork) => [
			'message',
			'think',
			'create-task',
			'start-task',
			'fly-to-bounds',
			'change-page',
			'create-page',
			'sleep',
		],
	},
	{
		type: 'working-drone',
		active: true,
		parts: (_work: FairyWork) => [
			'mode',
			'messages',
			'personalTodoList',
			'currentProject',
			'agentViewportBounds',
			'screenshot',
			'blurryShapes',
			'chatHistory',
			'workingTasks',
			'personality',
			'debug',
		],
		actions: (_work: FairyWork) => [
			'mark-my-task-done',
			'update-personal-todo-list',
			'think',
			'create',
			'delete',
			'update',
			'label',
			'move',
			'place',
			'bring-to-front',
			'send-to-back',
			'rotate',
			'resize',
			'align',
			'distribute',
			'stack',
			'pen',
		],
	},
	{
		type: 'working-solo',
		active: true,
		parts: (_work: FairyWork) => [
			'mode',
			'messages',
			'personalTodoList',
			'currentProject',
			'agentViewportBounds',
			'screenshot',
			'blurryShapes',
			'chatHistory',
			'workingTasks',
			'personality',
			'debug',
		],
		actions: (_work: FairyWork) => [
			'mark-task-done',
			'update-personal-todo-list',
			'think',
			'create',
			'delete',
			'update',
			'label',
			'move',
			'place',
			'bring-to-front',
			'send-to-back',
			'rotate',
			'resize',
			'align',
			'distribute',
			'stack',
			'pen',
		],
	},
	{
		type: 'standing-by',
		active: false,
	},
	{
		type: 'orchestrating',
		active: true,
		parts: () => [
			'mode',
			'messages',
			'screenshot',
			'userViewportBounds',
			'agentViewportBounds',
			'blurryShapes',
			'peripheralShapes',
			'selectedShapes',
			'chatHistory',
			'userActionHistory',
			// 'soloTasks',
			'time',
			// 'pages',
			'otherFairies',
			'personality',
			'currentProject',
			'debug',
		],
		actions: () => [
			'message',
			'think',
			'review',
			'fly-to-bounds',
			'sleep',
			// 'start-task',
			// 'change-page',
			// 'create-page',

			// Project management
			'start-project',
			'end-project',
			'create-project-task',
			'direct-to-start-project-task',
			'await-tasks-completion',
		],
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
