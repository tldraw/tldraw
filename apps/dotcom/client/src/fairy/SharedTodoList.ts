import { SharedTodoItem } from '@tldraw/fairy-shared'
import { atom } from 'tldraw'

export const $sharedTodoList = atom<SharedTodoItem[]>('sharedTodoList', [])

export function addSharedTodoItem(text: string) {
	$sharedTodoList.update((todos) => [
		...todos,
		{
			id: todos.length + 1,
			text,
			status: 'todo',
			claimedBy: '',
		},
	])
}

export function deleteSharedTodoItem(id: number) {
	$sharedTodoList.update((todos) => todos.filter((t) => t.id !== id))
}

export function clearSharedTodoList() {
	$sharedTodoList.set([])
}
