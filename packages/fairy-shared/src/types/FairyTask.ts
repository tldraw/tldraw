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
}

export type FairyTaskStatus = 'todo' | 'in-progress' | 'done'
