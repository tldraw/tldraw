import { FairyTodoItem } from '@tldraw/fairy-shared'
import { atom, Atom } from 'tldraw'
import { FairyAgent } from '../FairyAgent'

/**
 * Manages the personal todo list for a fairy agent.
 * Each agent maintains its own todo list separate from project tasks.
 */
export class FairyAgentTodoManager {
	/**
	 * An atom containing the agent's personal todo list.
	 */
	$personalTodoList: Atom<FairyTodoItem[]>

	constructor(public agent: FairyAgent) {
		this.$personalTodoList = atom('personalTodoList', [])
	}

	/**
	 * Add a todo item to the agent's todo list.
	 * @param id - The id of the todo item.
	 * @param text - The text of the todo item.
	 * @returns The id of the todo item.
	 */
	addPersonalTodo(id: string, text: string) {
		this.$personalTodoList.update((personalTodoItems) => {
			return [
				...personalTodoItems,
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
	updatePersonalTodo(params: { id: string; status: FairyTodoItem['status']; text?: string }) {
		const { id, status, text } = params
		this.$personalTodoList.update((todoItems) => {
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
	deletePersonalTodos(ids: string[]) {
		const idsSet = new Set(ids)
		this.$personalTodoList.update((todoItems) => {
			return todoItems.filter((item) => !idsSet.has(item.id))
		})
	}

	/**
	 * Delete all personal todo items.
	 */
	deleteAllPersonalTodos() {
		this.$personalTodoList.set([])
	}

	/**
	 * Remove all completed todo items from the todo list.
	 */
	flushTodoList() {
		this.$personalTodoList.update((personalTodoItems) => {
			return personalTodoItems.filter((item) => item.status !== 'done')
		})
	}

	/**
	 * Get the current personal todo list.
	 */
	getPersonalTodos() {
		return this.$personalTodoList.get()
	}

	/**
	 * Serialize the todo list state to a plain object for persistence.
	 */
	serializeState() {
		return this.$personalTodoList.get()
	}

	/**
	 * Load previously persisted todo list into the manager.
	 */
	loadState(personalTodoList: FairyTodoItem[]) {
		this.$personalTodoList.set(personalTodoList)
	}
}
