export interface FairyTask {
	id: number
	projectId: string | null
	assignedTo: string | null
	status: FairyTaskStatus
	text: string
	x?: number
	y?: number
	w?: number
	h?: number
	pageId?: string
}

export type FairyTaskStatus = 'todo' | 'in-progress' | 'done'

// todos are personal, tasks are high level
export type FairyTodoItem = Pick<FairyTask, 'id' | 'text' | 'status'>
