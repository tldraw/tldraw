import { SharedTodoItem } from '@tldraw/fairy-shared'
import { atom } from 'tldraw'

export const $sharedTodoList = atom<SharedTodoItem[]>('sharedTodoList', [])

export function addSharedTodoItem(text: string) {
	$sharedTodoList.update((todos) => {
		const maxId = todos.length === 0 ? 0 : Math.max(...todos.map((t) => t.id))
		return [
			...todos,
			{
				id: maxId + 1,
				text,
				status: 'todo',
				claimedBy: '',
			},
		]
	})
}

export function deleteSharedTodoItem(id: number) {
	$sharedTodoList.update((todos) => todos.filter((t) => t.id !== id))
}

export function clearSharedTodoList() {
	$sharedTodoList.set([])
}
