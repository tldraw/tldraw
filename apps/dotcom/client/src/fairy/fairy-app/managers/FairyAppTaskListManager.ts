import { createAgentTask, FairyTask, FairyTaskStatus } from '@tldraw/fairy-shared'
import { atom, Atom } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { BaseFairyAppManager } from './BaseFairyAppManager'

/**
 * Manager for fairy task list - CRUD operations on tasks.
 *
 * This duplicates functionality from fairy-task-list.ts
 * but in a class-based form tied to FairyApp.
 */
export class FairyAppTaskListManager extends BaseFairyAppManager {
	/**
	 * Atom containing the current list of tasks.
	 */
	private $tasks: Atom<FairyTask[]> = atom('fairyAppTasks', [])

	/**
	 * Get all tasks.
	 */
	getTasks(): FairyTask[] {
		return this.$tasks.get()
	}

	/**
	 * Set all tasks (used during state loading).
	 */
	setTasks(tasks: FairyTask[]) {
		this.$tasks.set(tasks)
	}

	/**
	 * Create a new task.
	 */
	createTask(newPartialTask: Partial<FairyTask> & { id: string }) {
		this.$tasks.update((tasks) => {
			const task = createAgentTask({
				title: newPartialTask.title || '',
				text: '',
				projectId: null,
				assignedTo: null,
				status: 'todo',
				pageId: undefined,
				...newPartialTask,
			})
			return [...tasks, task]
		})
	}

	/**
	 * Delete a task by ID.
	 */
	deleteTask(id: string) {
		this.$tasks.update((tasks) => tasks.filter((t) => t.id !== id))
	}

	/**
	 * Get a task by ID.
	 */
	getTaskById(id: string): FairyTask | undefined {
		return this.$tasks.get().find((t) => t.id === id)
	}

	/**
	 * Set a task's status.
	 */
	setTaskStatus(id: string, status: FairyTaskStatus) {
		this.$tasks.update((tasks) => tasks.map((t) => (t.id === id ? { ...t, status } : t)))
	}

	/**
	 * Set a task's status and notify waiting agents if completed.
	 */
	setTaskStatusAndNotify(id: string, status: FairyTaskStatus) {
		this.setTaskStatus(id, status)
		// Notify waiting agents if task is done
		if (status === 'done') {
			const task = this.getTaskById(id)
			if (task) {
				this.fairyApp.waits.notifyTaskCompleted(task)
			}
		}
	}

	/**
	 * Get tasks for a specific project.
	 */
	getTasksByProjectId(projectId: string): FairyTask[] {
		return this.$tasks.get().filter((t) => t.projectId === projectId)
	}

	/**
	 * Get tasks assigned to a specific agent.
	 */
	getTasksByAgentId(agentId: string): FairyTask[] {
		return this.$tasks.get().filter((t) => t.assignedTo === agentId)
	}

	/**
	 * Assign a fairy to a task.
	 */
	assignFairyToTask(taskId: string, fairyId: string, agents: FairyAgent[]) {
		const agent = agents.find((a) => a.id === fairyId)
		if (fairyId !== '' && !agent) return
		this.$tasks.update((tasks) =>
			tasks.map((t) => (t.id === taskId ? { ...t, assignedTo: fairyId || null } : t))
		)
	}

	/**
	 * Clear all tasks and projects.
	 */
	clearTasksAndProjects() {
		this.$tasks.set([])
		this.fairyApp.projects.clearProjects()
	}

	/**
	 * Reset the manager to its initial state.
	 */
	reset() {
		this.$tasks.set([])
	}
}
