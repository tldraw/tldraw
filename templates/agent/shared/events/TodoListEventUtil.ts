import { z } from 'zod'
import { $todoItems } from '../../client/atoms/todoItems'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

const AgentTodoListEvent = z
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

type IAgentTodoListEvent = z.infer<typeof AgentTodoListEvent>

export class TodoListEventUtil extends AgentEventUtil<IAgentTodoListEvent> {
	static override type = 'update-todo-list' as const

	override getSchema() {
		return AgentTodoListEvent
	}

	override getDescription() {
		return null
	}

	override applyEvent(event: Streaming<IAgentTodoListEvent>) {
		const existingTodoListItem = $todoItems.get().find((item) => item.id === event.id)
		if (existingTodoListItem) {
			$todoItems.update((todoItems) => {
				const index = todoItems.findIndex((item) => item.id === event.id)
				if (index !== -1) {
					todoItems[index] = {
						...existingTodoListItem,
						text: event.text ?? existingTodoListItem.text,
						status: event.status ?? existingTodoListItem.status,
					}
				}
				return todoItems
			})
		} else {
			$todoItems.update((todoItems) => {
				const { id, text, status } = event
				if (!id || !text || !status) return todoItems
				todoItems.push({ id, text, status })
				return todoItems
			})
		}
	}
}
