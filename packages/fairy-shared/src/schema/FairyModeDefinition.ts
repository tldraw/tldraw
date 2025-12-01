import { AgentAction } from '../types/AgentAction'
import { FairyMemoryLevel } from '../types/FairyMemoryLevel'
import { FairyPose } from '../types/FairyPose'
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
			/** The memory level of the fairy mode. */
			memoryLevel: FairyMemoryLevel
			/** The prompt parts that the fairy mode allows the fairy to see. Inferred from active: if active is false, parts must be null; if active is true, parts can be a function. */
			parts(work: FairyWork): PromptPart['type'][]
			/** The actions that the fairy mode allows the fairy to take. */
			actions(work: FairyWork): AgentAction['_type'][]
			/** The pose to display when the fairy is in this mode (Unless overriden by the current action) */
			pose: FairyPose
	  }
	| {
			/** Whether the fairy mode is active in this mode. */
			active: false
			/** The memory level of the fairy mode. */
			memoryLevel: FairyMemoryLevel
			/** The pose to display when the fairy is in this mode. */
			pose: FairyPose
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

export type FairyModeDefinitionType = FairyModeDefinition['type']

/**
 * Definitions of fairy modes — states that fairies can be in.
 */
export const FAIRY_MODE_DEFINITIONS = [
	{
		type: 'idling',
		memoryLevel: 'fairy',
		active: false,
		pose: 'idle',
	},
	{
		type: 'sleeping',
		memoryLevel: 'fairy',
		active: false,
		pose: 'sleeping',
	},
	{
		type: 'one-shotting',
		memoryLevel: 'fairy',
		active: true,
		pose: 'active',
		parts: (_work: FairyWork) => [
			'sign',
			'messages',
			'modelName',
			'mode',
			'screenshot',
			'userViewportBounds',
			'agentViewportBounds',
			'canvasLints',
			'blurryShapes',
			'peripheralShapes',
			'chatHistory',
			'personalTodoList',
			'otherFairies', //maybe not this one
			'debug',
		],
		actions: (_work: FairyWork) => [
			'message',
			'think',
			'fly-to-bounds',
			'upsert-personal-todo-item',
			'delete-personal-todo-items',
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
		type: 'one-shotting-pausing',
		memoryLevel: 'fairy',
		active: false,
		pose: 'idle',
	},
	{
		type: 'soloing',
		memoryLevel: 'fairy',
		active: true,
		pose: 'active',
		parts: (_work: FairyWork) => [
			'modelName',
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
			// 'pages',
			'otherFairies',
			'sign',
			'debug',
		],
		actions: (_work: FairyWork) => [
			'message',
			'think',
			'create-task',
			'start-task',
			'fly-to-bounds',
			// 'change-page',
			// 'create-page',
		],
	},
	{
		type: 'working-drone',
		memoryLevel: 'task',
		active: true,
		pose: 'active',
		parts: (_work: FairyWork) => [
			'modelName',
			'mode',
			'messages',
			// 'personalTodoList',
			'currentProjectDrone',
			'agentViewportBounds',
			'screenshot',
			'blurryShapes',
			'chatHistory',
			'workingTasks',
			'sign',
			'debug',
		],
		actions: (_work: FairyWork) => [
			'mark-my-task-done',
			// 'upsert-personal-todo-item',
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
		memoryLevel: 'task',
		active: true,
		pose: 'active',
		parts: (_work: FairyWork) => [
			'modelName',
			'mode',
			'messages',
			// 'personalTodoList',
			'agentViewportBounds',
			'screenshot',
			'blurryShapes',
			'chatHistory',
			'workingTasks',
			'sign',
			'debug',
		],
		actions: (_work: FairyWork) => [
			'mark-task-done',
			// 'upsert-personal-todo-item',
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
		memoryLevel: 'project',
		active: false,
		pose: 'active',
	},
	{
		type: 'orchestrating-active',
		memoryLevel: 'project',
		active: true,
		pose: 'active',
		parts: () => [
			'modelName',
			'mode',
			'messages',
			'screenshot',
			'userViewportBounds',
			'agentViewportBounds',
			'blurryShapes',
			'peripheralShapes',
			'selectedShapes',
			'canvasLints',
			'chatHistory',
			'userActionHistory',
			'time',
			// 'pages',
			'otherFairies',
			'sign',
			'currentProjectOrchestrator',
			'debug',
		],
		actions: () => [
			'message',
			'think',
			// 'review',
			'fly-to-bounds',
			// 'start-task',
			// 'change-page',
			// 'create-page',

			// Project management
			'start-project',
			'end-project',
			'create-project-task',
			'delete-project-task',
			'direct-to-start-project-task',
			'await-tasks-completion',
		],
	},
	{
		type: 'orchestrating-waiting',
		memoryLevel: 'project',
		active: false,
		pose: 'waiting',
	},
	{
		type: 'duo-orchestrating-active',
		memoryLevel: 'project',
		active: true,
		pose: 'active',
		parts: () => [
			'modelName',
			'mode',
			'messages',
			'screenshot',
			'userViewportBounds',
			'agentViewportBounds',
			'blurryShapes',
			'peripheralShapes',
			'selectedShapes',
			'canvasLints',
			'chatHistory',
			'userActionHistory',
			'time',
			// 'pages',
			'otherFairies',
			'sign',
			'currentProjectOrchestrator',
			'debug',
		],
		actions: () => [
			'message',
			'think',
			// 'review',
			'fly-to-bounds',
			// 'start-task',
			// 'change-page',
			// 'create-page',

			// Duo project management
			'start-duo-project',
			'end-duo-project',
			'create-duo-task',
			'delete-project-task',
			'direct-to-start-duo-task',
			'start-duo-task',
			'await-duo-tasks-completion',
		],
	},
	{
		type: 'duo-orchestrating-waiting',
		memoryLevel: 'project',
		active: false,
		pose: 'waiting',
	},
	{
		type: 'working-orchestrator',
		memoryLevel: 'task',
		active: true,
		pose: 'active',
		parts: (_work: FairyWork) => [
			'modelName',
			'mode',
			'messages',
			// 'personalTodoList',
			'currentProjectDrone',
			'agentViewportBounds',
			'screenshot',
			'blurryShapes',
			'chatHistory',
			'workingTasks',
			// 'sign',
			'debug',
		],
		actions: (_work: FairyWork) => [
			'mark-duo-task-done',
			// 'upsert-personal-todo-item',
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
