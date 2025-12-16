import { VecModel } from '@tldraw/tlschema'
import { ChatHistoryItem } from './ChatHistoryItem'
import { FairyEntity } from './FairyEntity'
import { FairyProject } from './FairyProject'
import { FairyTask, FairyTodoItem } from './FairyTask'

/**
 * Serialized representation of a wait condition (without the matcher function).
 * Used for persistence.
 */
export interface SerializedWaitCondition {
	eventType: string
	id: string
	metadata?: Record<string, any>
}

/**
 * The persisted state for a single fairy agent.
 */
export interface PersistedFairyAgentState {
	fairyEntity: FairyEntity
	chatHistory: ChatHistoryItem[]
	chatOrigin: VecModel
	personalTodoList: FairyTodoItem[]
	waitingFor?: SerializedWaitCondition[]
}

/**
 * The persisted state for all fairy agents in a file, keyed by agent ID.
 * This is stored as JSON in the file_state table in the database.
 */
export interface PersistedFairyState {
	agents: Record<string, PersistedFairyAgentState>
	fairyTaskList: FairyTask[]
	projects: FairyProject[]
}
