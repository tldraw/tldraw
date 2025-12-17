import {
	AgentId,
	createAgentTask,
	FairyTask,
	FairyTaskStatus,
	ProjectId,
	TaskId,
} from '@tldraw/fairy-shared'
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
		// Normalize bounds for backwards compatibility with older persisted tasks
		this.$tasks.set(
			tasks.map((task) => ({
				...task,
				x: task.x ?? 0,
				y: task.y ?? 0,
				w: task.w ?? 0,
				h: task.h ?? 0,
			}))
		)
	}

	/**
	 * Create a new task.
	 */
	createTask(
		newTask: Partial<FairyTask> & {
			id: TaskId
			title: string
			x: number
			y: number
			w: number
			h: number
		}
	) {
		this.$tasks.update((tasks) => {
			const { id, title, x, y, w, h, ...rest } = newTask
			const task = createAgentTask({
				id,
				title,
				text: '',
				projectId: null,
				assignedTo: null,
				status: 'todo',
				pageId: undefined,
				x,
				y,
				w,
				h,
				...rest,
			})
			return [...tasks, task]
		})
	}

	/**
	 * Delete a task by ID.
	 */
	deleteTask(id: TaskId) {
		this.$tasks.update((tasks) => tasks.filter((t) => t.id !== id))
	}

	/**
	 * Get a task by ID.
	 */
	getTaskById(id: TaskId): FairyTask | undefined {
		return this.$tasks.get().find((t) => t.id === id)
	}

	/**
	 * Set a task's status.
	 */
	setTaskStatus(id: TaskId, status: FairyTaskStatus) {
		this.$tasks.update((tasks) => tasks.map((t) => (t.id === id ? { ...t, status } : t)))
	}

	/**
	 * Set a task's status and notify waiting agents if completed.
	 */
	setTaskStatusAndNotify(id: TaskId, status: FairyTaskStatus) {
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
	 * Filters out tasks from soft deleted projects.
	 */
	getTasksByProjectId(projectId: ProjectId | null): FairyTask[] {
		if (projectId === null) {
			return this.$tasks.get().filter((t) => t.projectId === null)
		}
		// Check if the project is soft deleted
		const project = this.fairyApp.projects.getProjectById(projectId)
		if (!project) {
			// Project doesn't exist or is soft deleted, return empty array
			return []
		}
		return this.$tasks.get().filter((t) => t.projectId === projectId)
	}

	/**
	 * Get tasks assigned to a specific agent.
	 */
	getTasksByAgentId(agentId: AgentId | null): FairyTask[] {
		return this.$tasks.get().filter((t) => t.assignedTo === agentId)
	}

	/**
	 * Assign a fairy to a task.
	 */
	assignFairyToTask(taskId: TaskId, fairyId: AgentId | null, agents: FairyAgent[]) {
		if (fairyId !== null) {
			const agent = agents.find((a) => a.id === fairyId)
			if (!agent) return
		}
		this.$tasks.update((tasks) =>
			tasks.map((t) => (t.id === taskId ? { ...t, assignedTo: fairyId } : t))
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
