export interface TodoItem {
	id: number
	text: string
	status: 'todo' | 'in-progress' | 'done'
}
