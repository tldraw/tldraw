import { FairyTask, FairyTaskStatus } from '@tldraw/fairy-shared'
import { Editor } from 'tldraw'
import { FairyAgent } from './fairy-agent/FairyAgent'
import { $fairyTasks } from './fairy-globals'
import { clearProjects } from './fairy-projects'
import { notifyTaskCompleted } from './fairy-wait-notifications'

export function createFairyTask(newPartialTask: Partial<FairyTask> & { id: string }) {
	$fairyTasks.update((tasks) => {
		const task: FairyTask = {
			title: newPartialTask.title || '',
			text: '',
			projectId: null,
			assignedTo: null,
			status: 'todo' as const,
			pageId: undefined,
			...newPartialTask,
		}
		return [...tasks, task]
	})
}

export function deleteFairyTask(id: string) {
	$fairyTasks.update((todos) => todos.filter((t) => t.id !== id))
}

export function setFairyTaskStatus(id: string, status: FairyTaskStatus) {
	$fairyTasks.update((todos) => todos.map((t) => (t.id === id ? { ...t, status } : t)))
}

export function setFairyTaskStatusAndNotifyCompletion(
	id: string,
	status: FairyTaskStatus,
	editor: Editor
) {
	setFairyTaskStatus(id, status)
	// Notify waiting agents if task is done
	if (status === 'done' && editor) {
		const task = getFairyTaskById(id)
		if (task) {
			notifyTaskCompleted(task, editor)
		}
	}
}

export function getFairyTaskById(id: string): FairyTask | undefined {
	return $fairyTasks.get().find((t) => t.id === id)
}

export function clearFairyTasksAndProjects() {
	$fairyTasks.set([])
	clearProjects()
}

export function getFairyTasksByProjectId(projectId: string): FairyTask[] {
	return $fairyTasks.get().filter((t) => t.projectId === projectId)
}

export function assignFairyToTask(taskId: string, fairyId: string, agents: FairyAgent[]) {
	const agent = agents.find((a) => a.id === fairyId)
	if (fairyId !== '' && !agent) return
	$fairyTasks.update((todos) =>
		todos.map((t) => (t.id === taskId ? { ...t, assignedTo: fairyId || null } : t))
	)
}
