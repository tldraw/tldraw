import { $todoItems } from '../../client/atoms/todoItems'
import { AgentPrompt } from '../types/AgentPrompt'
import { TodoItem } from '../types/TodoItem'
import { PromptPartUtil } from './PromptPartUtil'

export class TodoListPromptPartUtil extends PromptPartUtil<TodoItem[]> {
	static override type = 'todoList' as const

	override getPriority() {
		return 10
	}

	override async getPart() {
		return $todoItems.get()
	}

	override buildContent(part: TodoItem[], _prompt: AgentPrompt): string[] {
		if (part.length === 0)
			return [
				'You have no todos yet. Use the `update-todo-list` event with a new id to create a todo.',
			]
		return [`Here is your current todo list:`, JSON.stringify(part)]
	}
}
