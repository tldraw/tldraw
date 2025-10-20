/* eslint-disable local/no-export-star */

// Parts
export * from './parts/BlurryShapesPartUtil'
export * from './parts/ChatHistoryPartUtil'
export * from './parts/ContextItemsPartUtil'
export * from './parts/DataPartUtil'
export * from './parts/MessagesPartUtil'
export * from './parts/PeripheralShapesPartUtil'
export * from './parts/PromptPartUtil'
export * from './parts/ScreenshotPartUtil'
export * from './parts/SelectedShapesPartUtil'
export * from './parts/TimePartUtil'
export * from './parts/TodoListPartUtil'
export * from './parts/UserActionHistoryPartUtil'
export * from './parts/ViewportBoundsPartUtil'

// Format
export type * from './format/BlurryShape'
export * from './format/convertFocusedShapeToTldrawShape'
export * from './format/convertTldrawShapesToPeripheralShapes'
export * from './format/convertTldrawShapeToBlurryShape'
export * from './format/convertTldrawShapeToFocusedShape'
export * from './format/FocusedShape'
export type * from './format/PeripheralShapesCluster'
export * from './format/SimpleColor'
export * from './format/SimpleFill'
export * from './format/SimpleFontSize'
export * from './format/SimpleGeoShapeType'

// Types (these are type-only exports)
export type * from './types/AgentAction'
export type * from './types/AgentActionInfo'
export type * from './types/AgentActionSchema'
export type * from './types/AgentInput'
export type * from './types/AgentMessage'
export type * from './types/AgentPrompt'
export type * from './types/AgentRequest'
export type * from './types/BaseAgentAction'
export type * from './types/BasePromptPart'
export type * from './types/ChatHistoryItem'
export type * from './types/ContextItem'
export type * from './types/FairyEntity'
export type * from './types/PromptPart'
export type * from './types/Streaming'
export type * from './types/TldrawFairyAgent'
export type * from './types/TodoItem'
export type * from './types/WikipediaArticle'

export * from './types/FairyPose'

// Utils and Helpers
export * from './AgentHelpers'

// Models
export * from './models'

// Constants / Defaults
export * from './constants'
export * from './FairySchema'

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
