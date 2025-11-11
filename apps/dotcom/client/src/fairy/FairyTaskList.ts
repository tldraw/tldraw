import { FairyTask, FairyTaskStatus } from '@tldraw/fairy-shared'
import { atom } from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { clearProjects } from './FairyProjects'

export const $fairyTasks = atom<FairyTask[]>('fairyTasks', [])
export const $showCanvasFairyTasks = atom<boolean>('showCanvasFairyTasks', false)

export function createFairyTask(partial: Partial<Omit<FairyTask, 'id'>>) {
	$fairyTasks.update((tasks) => {
		const maxId = tasks.length === 0 ? 0 : Math.max(...tasks.map((t) => t.id))
		const task: FairyTask = {
			id: maxId + 1,
			text: '',
			projectId: null,
			assignedTo: null,
			status: 'todo' as const,
			pageId: undefined,
			...partial,
		}
		return [...tasks, task]
	})
}

export function deleteFairyTask(id: number) {
	$fairyTasks.update((todos) => todos.filter((t) => t.id !== id))
}

export function setFairyTaskStatus(id: number, status: FairyTaskStatus) {
	$fairyTasks.update((todos) => todos.map((t) => (t.id === id ? { ...t, status } : t)))
}

export function getFairyTaskById(id: number): FairyTask | undefined {
	return $fairyTasks.get().find((t) => t.id === id)
}

export function clearFairyTasks() {
	$fairyTasks.set([])

	// Clear all projects
	clearProjects()
}

export function assignFairyToTask(taskId: number, fairyId: string, agents: FairyAgent[]) {
	const agent = agents.find((a) => a.id === fairyId)
	if (!agent && fairyId !== '') return
	$fairyTasks.update((todos) =>
		todos.map((t) => (t.id === taskId ? { ...t, assignedTo: fairyId } : t))
	)
}
