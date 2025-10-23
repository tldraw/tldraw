import { SharedTodoListAction, Streaming } from '@tldraw/fairy-shared'
import { $sharedTodoList } from '../SharedTodoList'
import { AgentActionUtil } from './AgentActionUtil'

export class SharedTodoListActionUtil extends AgentActionUtil<SharedTodoListAction> {
	static override type = 'update-shared-todo-list' as const

	override getInfo(action: Streaming<SharedTodoListAction>) {
		return {
			icon: 'pencil' as const,
			description: 'Update shared todo list',
			summary: action.complete
				? `Updated shared todo item ${action.id}: "${action.text}", with status "${action.status}", ${action.claimedBy ? `claimed by ${action.claimedBy}` : ''}`
				: 'Updating shared todo list...',
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<SharedTodoListAction>) {
		if (!action.complete) return
		if (!this.agent) return

		const todoItem = {
			id: action.id,
			status: action.status,
			text: action.text,
			claimedBy: action.claimedBy,
		}

		$sharedTodoList.update((sharedTodoItems) => {
			const index = sharedTodoItems.findIndex((item) => item.id === action.id)
			if (index !== -1) {
				return [...sharedTodoItems.slice(0, index), todoItem, ...sharedTodoItems.slice(index + 1)]
			} else {
				return [...sharedTodoItems, todoItem]
			}
		})
	}
}
