/* eslint-disable local/no-export-star */

import { TLShapeId } from 'tldraw'
import { AgentId, ProjectId, SimpleShapeId, TaskId } from './schema/id-schemas'
import { AgentAction } from './types/AgentAction'
import { AgentActionInfo } from './types/AgentActionInfo'
import { FairyTask } from './types/FairyTask'

// Format
export type * from './format/BlurryShape'
export * from './format/convertFocusedShapeToTldrawShape'
export * from './format/convertTldrawShapesToPeripheralShapes'
export * from './format/convertTldrawShapeToBlurryShape'
export * from './format/convertTldrawShapeToFocusedShape'
export * from './format/FocusColor'
export * from './format/FocusedShape'
export * from './format/FocusFill'
export * from './format/FocusFontSize'
export * from './schema/id-schemas'
export * from './types/FairyConfig'

// Types (these are type-only exports)
export type * from './format/OtherFairy'
export type * from './format/PeripheralCluster'
export type * from './types/AgentAction'
export type * from './types/AgentActionInfo'
export type * from './types/AgentInput'
export type * from './types/AgentMessage'
export type * from './types/AgentPrompt'
export type * from './types/AgentRequest'
export type * from './types/BaseAgentAction'
export type * from './types/BasePromptPart'
export type * from './types/ChatHistoryItem'
export type * from './types/ContextItem'
export type * from './types/FairyCanvasLint'
export type * from './types/FairyMemoryLevel'
export type * from './types/FairyProject'
export type * from './types/FairyTask'
export type * from './types/FairyWaitCondition'
export type * from './types/FairyWork'
export type * from './types/PersistedFairyConfig'
export type * from './types/PersistedFairyState'
export type * from './types/PromptPart'
export type * from './types/Streaming'
export type * from './types/WikipediaArticle'

// Schemas and definitions
export * from './schema/AgentActionSchemas'
export * from './schema/buildResponseSchema'
export * from './schema/PromptPartDefinitions'
export * from './schema/PromptPartRegistry'
export * from './types/FairyEntity'
export * from './types/FairyOutfit'
export * from './types/FairyPose'
export * from './types/FairyVariant'

// Constants / Defaults
export * from './constants'
export * from './models'
export * from './schema/FairyModeDefinition'
export * from './schema/FairySchema'

// Icons
export * from './icons/ActivityIcon'
export * from './icons/AgentIcon'
export * from './icons/AtIcon'
export * from './icons/BrainIcon'
export * from './icons/CancelIcon'
export * from './icons/ChevronDownIcon'
export * from './icons/ChevronRightIcon'
export * from './icons/CommentIcon'
export * from './icons/CrossIcon'
export * from './icons/CursorIcon'
export * from './icons/EllipsisIcon'
export * from './icons/EyeIcon'
export * from './icons/IndentIcon'
export * from './icons/LipsIcon'
export * from './icons/NoteIcon'
export * from './icons/PencilIcon'
export * from './icons/RefreshIcon'
export * from './icons/SearchIcon'
export * from './icons/SmallSpinner'
export * from './icons/TargetIcon'
export * from './icons/TickIcon'
export * from './icons/TrashIcon'

export function createAgentAction<T extends AgentAction>(action: T): T {
	return action
}

export function createAgentActionInfo<T extends Partial<AgentActionInfo>>(info: T): T {
	return info
}

export function createAgentTask<T extends FairyTask>(task: T): T {
	return task
}

export function toSimpleShapeId(id: string): SimpleShapeId {
	if (id.startsWith('shape:')) throw new Error('Invalid simple shape id')
	return id as SimpleShapeId
}

export function toTldrawShapeId(id: string): TLShapeId {
	if (!id.startsWith('shape:')) throw new Error('Invalid simple shape id')
	return id as TLShapeId
}

export function toAgentId(id: string): AgentId {
	return id as AgentId
}

export function toProjectId(id: string): ProjectId {
	return id as ProjectId
}

export function toTaskId(id: string): TaskId {
	return id as TaskId
}
