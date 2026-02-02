import { TodoId } from './ids-schema'

export interface TodoItem {
	id: TodoId
	text: string
	status: 'todo' | 'in-progress' | 'done'
}
