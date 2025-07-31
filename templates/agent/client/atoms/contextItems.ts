import { atom, Box, structuredClone, Vec } from 'tldraw'
import { ContextItem } from '../types/ContextItem'

export const $contextItems = atom<ContextItem[]>('context items', [])
export const $pendingContextItems = atom<ContextItem[]>('pending context items', [])

export function addToContext(item: ContextItem) {
	$contextItems.update((items) => {
		const existingItem = items.find((v) => areContextItemsEquivalent(v, item))
		if (existingItem) return items
		return [...items, structuredClone(item)]
	})
}

export function removeFromContext(item: ContextItem) {
	$contextItems.update((items) => items.filter((v) => !areContextItemsEquivalent(v, item)))
}

export function areContextItemsEquivalent(a: ContextItem, b: ContextItem) {
	if (a.type !== b.type) {
		return false
	}
	if (a.type === 'shape' && b.type === 'shape') {
		return a.shape.id === b.shape.id
	}
	if (a.type === 'area' && b.type === 'area') {
		return Box.Equals(a.bounds, b.bounds)
	}
	if (a.type === 'point' && b.type === 'point') {
		return Vec.Equals(a.point, b.point)
	}

	throw new Error('Unknown context item type')
}
