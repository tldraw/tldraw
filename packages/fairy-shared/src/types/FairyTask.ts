import { AgentId, ProjectId, TaskId } from '../schema/id-schemas'

export interface FairyTask {
	id: TaskId
	title: string
	text: string
	projectId: ProjectId | null
	assignedTo: AgentId | null
	status: FairyTaskStatus
	x: number
	y: number
	w: number
	h: number
	pageId?: string
}

export type FairyTaskStatus = 'todo' | 'in-progress' | 'done'

// todos are personal, tasks are high level
export type FairyTodoItem = Pick<FairyTask, 'id' | 'text' | 'status'>
