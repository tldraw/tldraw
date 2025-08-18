import { EditorAtom } from 'tldraw'
import { AgentPrompt, AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUtil'

export class TodoListPromptPartUtil extends PromptPartUtil<TodoList> {
	static override type = 'todoList' as const

	override getPriority() {
		return 10
	}

	override async getPart(options: AgentPromptOptions) {
		const { editor } = options
		return $todoList.get(editor)
	}

	override buildContent(part: TodoList, _prompt: AgentPrompt): string[] {
		if (part.length === 0)
			return [
				'You have no todos yet. Use the `update-todo-list` event with a new id to create a todo.',
			]
		return [`Here is your current todo list:`, JSON.stringify(part)]
	}
}

export const $todoList = new EditorAtom<TodoList>('todoList', (_editor) => [])

interface TodoListItem {
	id: number
	text: string
	status: 'todo' | 'in-progress' | 'done'
}

type TodoList = TodoListItem[]
