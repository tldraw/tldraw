import { ClaimTodoItemAction, Streaming } from '@tldraw/fairy-shared'
import { $sharedTodoList } from '../SharedTodoList'
import { AgentActionUtil } from './AgentActionUtil'

export class ClaimTodoItemActionUtil extends AgentActionUtil<ClaimTodoItemAction> {
	static override type = 'claim-todo-item' as const

	override getInfo(action: Streaming<ClaimTodoItemAction>) {
		const text = action.complete
			? `Claimed todo item ${action.todoItemId}.`
			: `Claiming todo item ${action.todoItemId}...`

		return {
			icon: 'pencil' as const,
			description: text,
		}
	}

	override applyAction(action: Streaming<ClaimTodoItemAction>) {
		if (!action.complete) return
		if (!this.agent || !this.editor) return

		const { todoItemId } = action

		const todoItem = $sharedTodoList.get().find((item) => item.id === todoItemId)
		if (!todoItem) {
			this.agent.cancel()
			this.agent.schedule(
				`Todo item with id ${todoItemId} not found. Maybe there was a typo or it's been deleted.`
			)
			return
		}

		const assignedById = this.agent.id
		if (todoItem.assignedById && todoItem.assignedById !== assignedById) {
			this.agent.cancel()
			this.agent.schedule(
				`Todo item with id ${todoItemId} is already claimed by fairy with id ${todoItem.assignedById}.`
			)
			return
		}

		// Update the shared todo list with the new assignedById
		$sharedTodoList.update((items) => {
			return items.map((item) => (item.id === todoItemId ? { ...item, assignedById } : item))
		})
	}
}
