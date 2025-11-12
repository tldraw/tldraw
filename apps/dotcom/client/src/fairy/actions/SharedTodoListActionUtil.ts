import { SharedTodoListAction, Streaming } from '@tldraw/fairy-shared'
import { $fairyTasks } from '../FairyTaskList'
import { AgentActionUtil } from './AgentActionUtil'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'

export class SharedTodoListActionUtil extends AgentActionUtil<SharedTodoListAction> {
	static override type = 'update-todo-list' as const

	override getInfo(action: Streaming<SharedTodoListAction>) {
		return {
			icon: 'pencil' as const,
			description: 'Update todo list',
			summary: action.complete
				? `Updated todo item ${action.id}: "${action.text}", with status "${action.status}"`
				: 'Updating todo list...',
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<SharedTodoListAction>, helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		// Remove the offset from coordinates, and only include x and y if they are defined
		const coords =
			action.x !== undefined && action.y !== undefined
				? helpers.removeOffsetFromVec({ x: action.x, y: action.y })
				: undefined

		const existingTask = $fairyTasks.get().find((item) => item.id === action.id)
		const project = this.agent.getProject()

		// Only allow updating todo items that are in the current project
		if (existingTask && existingTask.projectId !== project?.id) {
			this.agent.cancel()
			this.agent.schedule(
				`Task with id ${action.id} is not in your project so you aren't allowed to update it.`
			)
			return
		}

		const proposedTask = {
			id: action.id,
			status: action.status,
			text: action.text,
			assignedTo: existingTask?.assignedTo ?? null,
			projectId: project?.id ?? null,
			x: coords?.x,
			y: coords?.y,
			pageId: existingTask?.pageId,
		}

		if (existingTask) {
			$fairyTasks.update((tasks) => {
				return tasks.map((item) => (item.id === action.id ? proposedTask : item))
			})
		} else {
			$fairyTasks.update((tasks) => [...tasks, proposedTask])
		}
	}
}
