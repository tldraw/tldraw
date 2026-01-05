import { TodoListAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

export class TodoListActionUtil extends AgentActionUtil<TodoListAction> {
	static override type = 'update-todo-list' as const

	override getInfo() {
		// Don't show todo actions in the chat history because we show them in the dedicated todo list UI
		return null
	}

	override applyAction(action: Streaming<TodoListAction>) {
		if (!action.complete) return
		if (!this.agent) return

		const todoItem = {
			id: action.id,
			status: action.status,
			text: action.text,
		}

		this.agent.$todoList.update((todoItems) => {
			const index = todoItems.findIndex((item) => item.id === action.id)
			if (index !== -1) {
				return [...todoItems.slice(0, index), todoItem, ...todoItems.slice(index + 1)]
			} else {
				return [...todoItems, todoItem]
			}
		})
	}
}
