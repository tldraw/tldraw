import type { LibrarySource } from '../lib/LibrarySource'
import { getItemOrdering, itemOrderings } from './item-order'
import { useLibraryItemOrder } from './use-library-item-order'

/** The user's ordering for the source's items, and the sort menu's options for changing it. */
export function useItemOrdering(source: LibrarySource) {
	const order = useLibraryItemOrder(source)
	const sort = {
		options: itemOrderings.map(({ id, label }) => ({ id, label })),
		value: order.ordering,
		onValueChange: (orderingId: string) => order.setOrdering(getItemOrdering(orderingId).id),
		reversed: order.reversed,
		onReversedChange: order.setReversed,
	}
	return { ordering: order.ordering, reversed: order.reversed, sort }
}
