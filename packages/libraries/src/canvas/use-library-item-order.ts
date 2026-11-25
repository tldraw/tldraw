import { useCallback } from 'react'
import { useValue } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import {
	getItemOrderChoice,
	getItemOrdering,
	setItemOrderChoice,
	type TLLibraryItemOrdering,
} from './item-order'

/** @public */
export interface LibraryItemOrder {
	ordering: TLLibraryItemOrdering
	reversed: boolean
	setOrdering(ordering: TLLibraryItemOrdering): void
	setReversed(reversed: boolean): void
}

/**
 * The order the current user chose for a source's items in the panel's "Sort by" menu, and setters
 * for it. One choice orders every library's items. It's kept per source in this browser, so every
 * layout showing the source's libraries shares it.
 * @public
 */
export function useLibraryItemOrder(source: LibrarySource): LibraryItemOrder {
	const sourceId = source.id
	const choice = useValue('item order', () => getItemOrderChoice(sourceId), [sourceId])
	const setOrdering = useCallback(
		(ordering: TLLibraryItemOrdering) => {
			const current = getItemOrderChoice(sourceId)
			setItemOrderChoice(sourceId, { ...current, orderingId: ordering })
		},
		[sourceId]
	)
	const setReversed = useCallback(
		(reversed: boolean) => {
			const current = getItemOrderChoice(sourceId)
			setItemOrderChoice(sourceId, { ...current, reversed })
		},
		[sourceId]
	)
	return {
		ordering: getItemOrdering(choice.orderingId).id,
		reversed: choice.reversed,
		setOrdering,
		setReversed,
	}
}
