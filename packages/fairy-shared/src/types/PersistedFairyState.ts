import { VecModel } from '@tldraw/tlschema'
import { FairyProject } from '../schema/FairyProject'
import { FairyTask } from '../schema/FairyTask'
import { ChatHistoryItem } from './ChatHistoryItem'
import { FairyEntity } from './FairyEntity'
import { TodoItem } from './TodoItem'

/**
 * The persisted state for a single fairy agent.
 */
export interface PersistedFairyAgentState {
	fairyEntity: FairyEntity
	chatHistory: ChatHistoryItem[]
	chatOrigin: VecModel
	todoList: TodoItem[]
}

/**
 * The persisted state for all fairy agents in a file, keyed by agent ID.
 * This is stored as JSON in the file_state table in the database.
 */
export interface PersistedFairyState {
	agents: Record<string, PersistedFairyAgentState>
	sharedTodoList: FairyTask[]
	showCanvasTodos: boolean
	projects: FairyProject[]
}
