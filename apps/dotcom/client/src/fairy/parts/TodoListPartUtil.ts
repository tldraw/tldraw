import { BasePromptPart, TodoItem } from '@tldraw/fairy-shared'
import { PromptPartUtil } from './PromptPartUtil'

export interface TodoListPart extends BasePromptPart<'todoList'> {
	items: TodoItem[]
}

export class TodoListPartUtil extends PromptPartUtil<TodoListPart> {
	static override type = 'todoList' as const

	override getPart(): TodoListPart {
		return {
			type: 'todoList',
			items: this.agent.$todoList.get(),
		}
	}

	// override buildContent({ items }: TodoListPart): string[] {
	// 	if (items.length === 0)
	// 		return [
	// 			'You have no todos yet. Use the `update-todo-list` event with a new id to create a todo.',
	// 		]
	// 	return [`Here is your current todo list:`, JSON.stringify(items)]
	// }
}
