import { SharedTodoItem, SharedTodoListAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { $sharedTodoList } from '../SharedTodoList'
import { AgentActionUtil } from './AgentActionUtil'

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

		const existingTodoItem = $sharedTodoList.get().find((item) => item.id === action.id)
		const project = this.agent.getCurrentProject()

		// Only allow updating todo items that are in the current project
		if (existingTodoItem && existingTodoItem.projectId !== project?.id) {
			this.agent.cancel()
			this.agent.schedule(
				`Todo item with id ${action.id} is not in your project so you aren't allowed to update it.`
			)
			return
		}

	const proposedTodoItem: SharedTodoItem = {
		id: action.id,
		status: action.status,
		text: action.text,
		assignedById: existingTodoItem?.assignedById,
		projectId: project?.id,
		x: coords?.x,
		y: coords?.y,
		pageId: existingTodoItem?.pageId,
	}

		if (existingTodoItem) {
			$sharedTodoList.update((sharedTodoItems) => {
				return sharedTodoItems.map((item) => (item.id === action.id ? proposedTodoItem : item))
			})
		} else {
			$sharedTodoList.update((sharedTodoItems) => [...sharedTodoItems, proposedTodoItem])
		}
	}
}
