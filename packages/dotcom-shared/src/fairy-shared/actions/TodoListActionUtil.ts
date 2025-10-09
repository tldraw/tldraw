import { z } from 'zod'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const TodoListAction = z
	.object({
		_type: z.literal('update-todo-list'),
		id: z.number(),
		status: z.enum(['todo', 'in-progress', 'done']),
		text: z.string(),
	})
	.meta({
		title: 'Update Todo List',
		description: 'The AI updates a current todo list item or creates a new one',
	})

type TodoListAction = z.infer<typeof TodoListAction>

export class TodoListActionUtil extends AgentActionUtil<TodoListAction> {
	static override type = 'update-todo-list' as const

	override getSchema() {
		return TodoListAction
	}

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
