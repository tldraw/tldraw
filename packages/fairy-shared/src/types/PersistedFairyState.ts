import { VecModel } from '@tldraw/tlschema'
import { ChatHistoryItem } from './ChatHistoryItem'
import { ContextItem } from './ContextItem'
import { FairyEntity } from './FairyEntity'
import { SharedTodoItem } from './SharedTodoItem'
import { TodoItem } from './TodoItem'

/**
 * The persisted state for a single fairy agent.
 */
export interface PersistedFairyAgentState {
	fairyEntity: FairyEntity
	chatHistory: ChatHistoryItem[]
	chatOrigin: VecModel
	todoList: TodoItem[]
	contextItems: ContextItem[]
}

/**
 * The persisted state for all fairy agents in a file, keyed by agent ID.
 * This is stored as JSON in the file_state table in the database.
 */
export interface PersistedFairyState {
	agents: Record<string, PersistedFairyAgentState>
	sharedTodoList: SharedTodoItem[]
}
