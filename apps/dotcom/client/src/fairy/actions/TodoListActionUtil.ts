import { Streaming, TodoListAction } from '@tldraw/fairy-shared'
import { AgentActionUtil } from './AgentActionUtil'

export class TodoListActionUtil extends AgentActionUtil<TodoListAction> {
	static override type = 'update-personal-todo-list' as const

	override getInfo(action: Streaming<TodoListAction>) {
		if (!action.complete) {
			return {
				icon: 'note' as const,
				description: 'Updating personal todo list...',
				pose: 'thinking' as const,
			}
		}

		if (action.id) {
			return {
				icon: 'note' as const,
				description: `Updated personal todo item ${action.id} with status "${action.status}"`,
				pose: 'thinking' as const,
			}
		} else {
			return {
				icon: 'note' as const,
				description: `Created new personal todo item: "${action.text}"`,
				pose: 'thinking' as const,
			}
		}
	}

	override applyAction(action: Streaming<TodoListAction>) {
		if (!action.complete) return
		if (!this.agent) return

		const { id, text, status } = action

		if (id) {
			const index = this.agent.$todoList.get().findIndex((item) => item.id === id)
			if (index !== -1) {
				this.agent.updateTodo({ id, text, status })
			} else {
				this.agent.cancel()
				this.agent.schedule(
					`You tried to update a todo item with id ${id} but it was not found. If you're trying to create a new todo item, please don't provide an id.`
				)
			}
		} else {
			this.agent.addTodo(text)
		}
	}
}
