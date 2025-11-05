/* eslint-disable local/no-export-star */

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
export type * from './types/FairyConfig'
export type * from './types/PersistedFairyConfig'
export type * from './types/PersistedFairyState'
export type * from './types/PromptPart'
export type * from './types/Streaming'
export type * from './types/TodoItem'
export type * from './types/WikipediaArticle'

// Schemas and definitions
export * from './schema/actions/ActionSchemas'
export * from './schema/buildResponseSchema'
export * from './schema/parts/PartSchemas'
export * from './schema/PromptPartRegistry'
export * from './types/FairyEntity'
export * from './types/FairyOutfit'
export * from './types/FairyPose'
export * from './types/FairyVariant'

// Constants / Defaults
export * from './constants'
export * from './schema/FairyMode'
export * from './schema/FairySchema'
export * from './schema/Wand'

// Icons
export * from './icons/AgentIcon'
export * from './icons/AtIcon'
export * from './icons/BrainIcon'
export * from './icons/ChevronDownIcon'
export * from './icons/ChevronRightIcon'
export * from './icons/CommentIcon'
export * from './icons/CrossIcon'
export * from './icons/CursorIcon'
export * from './icons/EllipsisIcon'
export * from './icons/EyeIcon'
export * from './icons/NoteIcon'
export * from './icons/PencilIcon'
export * from './icons/RefreshIcon'
export * from './icons/SearchIcon'
export * from './icons/SmallSpinner'
export * from './icons/TargetIcon'
export * from './icons/TickIcon'
export * from './icons/TrashIcon'

// shared todo List
export type * from './types/SharedTodoItem'

// Fairy Project
export * from './schema/FairyProject'

// Proximity Chat
export type * from './schema/ProximityChat'
