import { useCallback } from 'react'
import { useValue, type TLLibraryId } from 'tldraw'
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
 * The order the current user chose for a library's items in the panel's sort menu, and setters
 * for it. The choice is kept per source and library in this browser, so every layout showing the
 * library shares it.
 * @public
 */
export function useLibraryItemOrder(
	source: LibrarySource,
	libraryId: TLLibraryId
): LibraryItemOrder {
	const sourceId = source.id
	const choice = useValue('item order', () => getItemOrderChoice(sourceId, libraryId), [
		sourceId,
		libraryId,
	])
	const setOrdering = useCallback(
		(ordering: TLLibraryItemOrdering) => {
			const current = getItemOrderChoice(sourceId, libraryId)
			setItemOrderChoice(sourceId, libraryId, { ...current, orderingId: ordering })
		},
		[sourceId, libraryId]
	)
	const setReversed = useCallback(
		(reversed: boolean) => {
			const current = getItemOrderChoice(sourceId, libraryId)
			setItemOrderChoice(sourceId, libraryId, { ...current, reversed })
		},
		[sourceId, libraryId]
	)
	return {
		ordering: getItemOrdering(choice.orderingId).id,
		reversed: choice.reversed,
		setOrdering,
		setReversed,
	}
}
