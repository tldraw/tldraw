import { FairyTodoItem, TaskId } from '@tldraw/fairy-shared'
import { atom, Atom } from 'tldraw'
import { FairyAgent } from '../FairyAgent'
import { BaseFairyAgentManager } from './BaseFairyAgentManager'

/**
 * Manages the personal todo list for a fairy agent.
 * Each agent maintains its own todo list separate from project tasks.
 */
export class FairyAgentTodoManager extends BaseFairyAgentManager {
	/**
	 * An atom containing the agent's personal todo list.
	 * @private
	 */
	private $personalTodoList: Atom<FairyTodoItem[]>

	/**
	 * Creates a new todo manager for the given fairy agent.
	 * Initializes with an empty todo list.
	 */
	constructor(public agent: FairyAgent) {
		super(agent)
		this.$personalTodoList = atom('personalTodoList', [])
	}

	/**
	 * Reset the todo manager to its initial state.
	 * Clears all todo items from the list.
	 */
	reset(): void {
		this.$personalTodoList.set([])
	}

	/**
	 * Add a todo item to the agent's todo list.
	 * @param id - The id of the todo item.
	 * @param text - The text of the todo item.
	 * @returns The id of the todo item.
	 */
	push(id: TaskId, text: string) {
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
	update(params: { id: TaskId; status: FairyTodoItem['status']; text?: string }) {
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
	delete(ids: TaskId[]) {
		const idsSet = new Set(ids)
		this.$personalTodoList.update((todoItems) => {
			return todoItems.filter((item) => !idsSet.has(item.id))
		})
	}

	/**
	 * Remove all completed todo items from the todo list.
	 */
	flush() {
		this.$personalTodoList.update((personalTodoItems) => {
			return personalTodoItems.filter((item) => item.status !== 'done')
		})
	}

	/**
	 * Get the current personal todo list.
	 * @returns An array of todo items.
	 */
	getTodos() {
		return this.$personalTodoList.get()
	}

	/**
	 * Serialize the todo list state to a plain object for persistence.
	 * @returns An array of todo items that can be saved and restored later.
	 */
	serializeState() {
		return this.$personalTodoList.get()
	}

	/**
	 * Load previously persisted todo list into the manager.
	 * @param personalTodoList - An array of todo items to restore.
	 */
	loadState(personalTodoList: FairyTodoItem[]) {
		this.$personalTodoList.set(personalTodoList)
	}
}
