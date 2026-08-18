import { Atom, atom } from 'tldraw'
import { TodoId } from '../../../shared/types/ids-schema'
import { TodoItem } from '../../../shared/types/TodoItem'
import type { TldrawAgent } from '../TldrawAgent'
import { BaseAgentManager } from './BaseAgentManager'

export class AgentTodoManager extends BaseAgentManager {
	private $todoList: Atom<TodoItem[]>

	constructor(agent: TldrawAgent) {
		super(agent)
		this.$todoList = atom('todoList', [])
	}

	reset(): void {
		this.$todoList.set([])
	}

	getTodos() {
		return this.$todoList.get()
	}

	setTodos(todos: TodoItem[]) {
		this.$todoList.set(todos)
	}

	push(id: TodoId, text: string) {
		this.$todoList.update((todoItems) => [...todoItems, { id, status: 'todo' as const, text }])
		return id
	}

	update({ id, status, text }: { id: number; status: TodoItem['status']; text?: string }) {
		this.$todoList.update((todoItems) =>
			todoItems.map((item) =>
				item.id === id ? { ...item, status, ...(text !== undefined && { text }) } : item
			)
		)
	}

	delete(ids: number[]) {
		const idsSet = new Set(ids)
		this.$todoList.update((todoItems) => todoItems.filter((item) => !idsSet.has(item.id)))
	}

	/** Remove all completed todo items. */
	flush() {
		this.$todoList.update((todoItems) => todoItems.filter((item) => item.status !== 'done'))
	}
}
