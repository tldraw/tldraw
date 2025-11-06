export interface FairyTask {
	id: number
	projectId: string | null
	assignedTo: string | null
	status: 'todo' | 'in-progress' | 'done'
	text: string
	x?: number
	y?: number
	w?: number
	h?: number
}
