import {
	atom,
	defineMessages,
	getFromLocalStorage,
	setInLocalStorage,
	type Atom,
} from '@tldraw/editor'
import type { TLLibraryItem } from '../lib/schema'

const messages = defineMessages({
	default: { id: 'libraries.item-order.default', defaultMessage: 'Default' },
	newest: { id: 'libraries.item-order.newest', defaultMessage: 'Newest' },
	name: { id: 'libraries.item-order.name', defaultMessage: 'Name' },
})

/** A way to order a library's items. Leave out `compare` for the source's own order. */
export interface ItemOrdering {
	id: string
	label: string
	compare?(a: TLLibraryItem, b: TLLibraryItem): number
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

/** The current user's choice of ordering for one library, kept in this browser. */
export interface ItemOrderChoice {
	orderingId: string
	reversed: boolean
}

const DEFAULT_CHOICE: ItemOrderChoice = { orderingId: sourceItemOrder.id, reversed: false }

const choices = new Map<string, Atom<ItemOrderChoice>>()

function choiceKey(sourceId: string, libraryId: string) {
	return `${sourceId}:${libraryId}`
}

function storageKey(key: string) {
	return `tldraw-libraries-item-order:${key}`
}

function getChoiceAtom(key: string) {
	let choice = choices.get(key)
	if (!choice) {
		let stored = DEFAULT_CHOICE
		try {
			const parsed = JSON.parse(getFromLocalStorage(storageKey(key)) ?? 'null')
			if (typeof parsed?.orderingId === 'string' && typeof parsed?.reversed === 'boolean') {
				stored = { orderingId: parsed.orderingId, reversed: parsed.reversed }
			}
		} catch {
			// A corrupt entry falls back to the default.
		}
		choice = atom('item order', stored)
		choices.set(key, choice)
	}
	return choice
}

/** The current user's ordering for a library's items. Reactive. */
export function getItemOrderChoice(sourceId: string, libraryId: string) {
	return getChoiceAtom(choiceKey(sourceId, libraryId)).get()
}

export function setItemOrderChoice(sourceId: string, libraryId: string, choice: ItemOrderChoice) {
	const key = choiceKey(sourceId, libraryId)
	getChoiceAtom(key).set(choice)
	setInLocalStorage(storageKey(key), JSON.stringify(choice))
}

/** Items in the given ordering, reversed if asked. Items the ordering ties keep the source's order. */
export function sortItems(items: TLLibraryItem[], ordering: ItemOrdering, reversed: boolean) {
	const { compare } = ordering
	const sorted = compare
		? items
				.map((item, index) => ({ item, index }))
				.sort((a, b) => compare(a.item, b.item) || a.index - b.index)
				.map(({ item }) => item)
		: items
	return reversed ? [...sorted].reverse() : sorted
}
