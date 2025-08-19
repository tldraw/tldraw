import { z } from 'zod'
import { AgentTransform } from '../AgentTransform'
import { $todoList } from '../parts/TodoListPromptPart'
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

	override getIcon() {
		return 'note' as const
	}

	override getDescription(event: Streaming<IAgentTodoListEvent>) {
		return `Updated todo list item ${event.id} to ${event.text} with status ${event.status}`
	}

	override applyEvent(event: Streaming<IAgentTodoListEvent>, transform: AgentTransform) {
		const { editor } = transform

		const existingTodoListItem = $todoList.get(editor).find((item) => item.id === event.id)
		if (existingTodoListItem) {
			$todoList.update(editor, (todoList) => {
				const index = todoList.findIndex((item) => item.id === event.id)
				if (index !== -1) {
					todoList[index] = {
						...existingTodoListItem,
						text: event.text ?? existingTodoListItem.text,
						status: event.status ?? existingTodoListItem.status,
					}
				}
				return todoList
			})
		} else {
			$todoList.update(editor, (todoList) => {
				const { id, text, status } = event
				if (!id || !text || !status) return todoList
				todoList.push({ id, text, status })
				return todoList
			})
		}
	}
}
