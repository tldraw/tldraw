import { z } from 'zod'
import { $todoItems } from '../../client/atoms/todoItems'
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

type ITodoListAction = z.infer<typeof TodoListAction>

export class TodoListActionUtil extends AgentActionUtil<ITodoListAction> {
	static override type = 'update-todo-list' as const

	override getSchema() {
		return TodoListAction
	}

	override getDescription() {
		return null
	}

	override applyEvent(event: Streaming<ITodoListAction>) {
		if (!event.complete) return

		const todoItem = {
			id: event.id,
			status: event.status,
			text: event.text,
		}

		$todoItems.update((todoItems) => {
			const index = todoItems.findIndex((item) => item.id === event.id)
			if (index !== -1) {
				return [...todoItems.slice(0, index), todoItem, ...todoItems.slice(index + 1)]
			} else {
				return [...todoItems, todoItem]
			}
		})
	}
}
