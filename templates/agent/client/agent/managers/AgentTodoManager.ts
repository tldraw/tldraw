import { Atom, atom } from 'tldraw'
import { TodoId } from '../../../shared/types/ids-schema'
import { TodoItem } from '../../../shared/types/TodoItem'
import type { TldrawAgent } from '../TldrawAgent'
import { BaseAgentManager } from './BaseAgentManager'

/**
 * Manages the todo list for an agent.
 * Each agent maintains its own todo list for tracking tasks.
 */
export class AgentTodoManager extends BaseAgentManager {
	/**
	 * An atom containing the agent's todo list.
	 */
	private $todoList: Atom<TodoItem[]>

	/**
	 * Creates a new todo manager for the given agent.
	 * Initializes with an empty todo list.
	 */
	constructor(agent: TldrawAgent) {
		super(agent)
		this.$todoList = atom('todoList', [])
	}

	/**
	 * Reset the todo manager to its initial state.
	 * Clears all todo items from the list.
	 */
	reset(): void {
		this.$todoList.set([])
	}

	/**
	 * Get the current todo list.
	 * @returns An array of todo items.
	 */
	getTodos() {
		return this.$todoList.get()
	}

	/**
	 * Set the todo list directly.
	 * Primarily used for loading persisted state.
	 * @param todos - The todo items to set.
	 */
	setTodos(todos: TodoItem[]) {
		this.$todoList.set(todos)
	}

	/**
	 * Add a todo item to the agent's todo list.
	 * @param id - The id of the todo item.
	 * @param text - The text of the todo item.
	 * @returns The id of the todo item.
	 */
	push(id: TodoId, text: string) {
		this.$todoList.update((todoItems) => {
			return [
				...todoItems,
				{
					id,
					status: 'todo' as const,
					text,
				},
			]
		})
		return id
	}

	/**
	 * Update a todo item's status and optionally its text.
	 * @param params - The update parameters
	 */
	update(params: { id: number; status: TodoItem['status']; text?: string }) {
		const { id, status, text } = params
		this.$todoList.update((todoItems) => {
			const index = todoItems.findIndex((item) => item.id === id)
			if (index !== -1) {
				return [
					...todoItems.slice(0, index),
					{ ...todoItems[index], status, ...(text !== undefined && { text }) },
					...todoItems.slice(index + 1),
				]
			}
			return todoItems
		})
	}

	/**
	 * Delete specific todo items by their ids.
	 * @param ids - The ids of the todos to delete
	 */
	delete(ids: number[]) {
		const idsSet = new Set(ids)
		this.$todoList.update((todoItems) => {
			return todoItems.filter((item) => !idsSet.has(item.id))
		})
	}

	/**
	 * Remove all completed todo items from the todo list.
	 */
	flush() {
		this.$todoList.update((todoItems) => {
			return todoItems.filter((item) => item.status !== 'done')
		})
	}
}
