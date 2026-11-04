import {
	atom,
	defineMessages,
	getFromLocalStorage,
	setInLocalStorage,
	type Atom,
} from '@tldraw/editor'
import type { TLCollectionItem } from '../lib/schema'

const messages = defineMessages({
	default: { id: 'collections.item-order.default', defaultMessage: 'Default' },
	newest: { id: 'collections.item-order.newest', defaultMessage: 'Newest' },
	name: { id: 'collections.item-order.name', defaultMessage: 'Name' },
})

/** A way to order a collection's items. Leave out `compare` for the source's own order. */
export interface ItemOrdering {
	id: string
	label: string
	compare?(a: TLCollectionItem, b: TLCollectionItem): number
}

const sourceItemOrder: ItemOrdering = {
	id: 'source',
	label: messages.default.id,
}

/** Newest first; items without a save date come last. */
const newestItemOrder: ItemOrdering = {
	id: 'newest',
	label: messages.newest.id,
	compare: (a, b) => (b.createdAt ?? -Infinity) - (a.createdAt ?? -Infinity),
}

/** A to Z by name; unnamed items come last. */
const nameItemOrder: ItemOrdering = {
	id: 'name',
	label: messages.name.id,
	compare: (a, b) => {
		if (a.name === undefined || b.name === undefined) {
			return (a.name === undefined ? 1 : 0) - (b.name === undefined ? 1 : 0)
		}
		return a.name.localeCompare(b.name)
	},
}

/** The orderings offered in the panel's sort menu; the first is the default. */
export const itemOrderings = [sourceItemOrder, newestItemOrder, nameItemOrder]

/** The current user's choice of ordering, kept in this browser. */
export interface ItemOrderChoice {
	orderingId: string
	reversed: boolean
}

const DEFAULT_CHOICE: ItemOrderChoice = { orderingId: sourceItemOrder.id, reversed: false }

const choicesBySource = new Map<string, Atom<ItemOrderChoice>>()

function storageKey(sourceId: string) {
	return `tldraw-collections-item-order:${sourceId}`
}

function getChoiceAtom(sourceId: string) {
	let choice = choicesBySource.get(sourceId)
	if (!choice) {
		let stored = DEFAULT_CHOICE
		try {
			const parsed = JSON.parse(getFromLocalStorage(storageKey(sourceId)) ?? 'null')
			if (typeof parsed?.orderingId === 'string' && typeof parsed?.reversed === 'boolean') {
				stored = { orderingId: parsed.orderingId, reversed: parsed.reversed }
			}
		} catch {
			// A corrupt entry falls back to the default.
		}
		choice = atom('item order', stored)
		choicesBySource.set(sourceId, choice)
	}
	return choice
}

/** The current user's ordering for a source's items. Reactive. */
export function getItemOrderChoice(sourceId: string) {
	return getChoiceAtom(sourceId).get()
}

export function setItemOrderChoice(sourceId: string, choice: ItemOrderChoice) {
	getChoiceAtom(sourceId).set(choice)
	setInLocalStorage(storageKey(sourceId), JSON.stringify(choice))
}

/** Items in the given ordering, reversed if asked. Items the ordering ties keep the source's order. */
export function sortItems(items: TLCollectionItem[], ordering: ItemOrdering, reversed: boolean) {
	const { compare } = ordering
	const sorted = compare
		? items
				.map((item, index) => ({ item, index }))
				.sort((a, b) => compare(a.item, b.item) || a.index - b.index)
				.map(({ item }) => item)
		: items
	return reversed ? [...sorted].reverse() : sorted
}
