import { AgentHelpers } from '../AgentHelpers'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { TodoItem } from '../types/TodoItem'
import { PromptPartUtil } from './PromptPartUtil'

export interface TodoListPart extends BasePromptPart<'todoList'> {
	items: TodoItem[]
}

export class TodoListPartUtil extends PromptPartUtil<TodoListPart> {
	static override type = 'todoList' as const

	override getPriority() {
		return 10
	}

	override getPart(_request: AgentRequest, helpers: AgentHelpers): TodoListPart {
		return {
			type: 'todoList',
			items: helpers.agent.$todoList.get(),
		}
	}

	override buildContent({ items }: TodoListPart): string[] {
		if (items.length === 0)
			return [
				'You have no todos yet. Use the `update-todo-list` event with a new id to create a todo.',
			]
		return [`Here is your current todo list:`, JSON.stringify(items)]
	}
}
