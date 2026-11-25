import { type ButtonHTMLAttributes, useEffect, useMemo, useState } from 'react'
import {
	defineMessages,
	useTranslation,
	useValue,
	type TLLibrary,
	type TLLibraryItemId,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { LibraryItems } from './library-items'
import { getLibrariesToSearch, searchLibraries } from './panel-search'
import type { PrepareItemContent } from './save-shapes'
import { useItemOrdering } from './use-item-ordering'

const messages = defineMessages({
	noResults: { id: 'libraries.search.no-results', defaultMessage: 'No items found' },
	searching: { id: 'libraries.search.searching', defaultMessage: 'Searching…' },
})

export interface SearchResultsProps {
	source: LibrarySource
	libraries: TLLibrary[]
	query: string
	getItemProps(itemId: TLLibraryItemId): ButtonHTMLAttributes<HTMLButtonElement>
	placeItem(itemId: TLLibraryItemId): void
	prepareItemContent?: PrepareItemContent
}

/**
 * The panel's matches for a search, under the name of the library each is from, folded or not.
 * Asks the source to load the items of each library the search looks in (see
 * {@link getLibrariesToSearch}), so that a source that fetches them separately is searched in full.
 */
export function SearchResults({ source, libraries, query, ...itemProps }: SearchResultsProps) {
	const msg = useTranslation()
	const searched = useValue(
		'libraries to search',
		() => getLibrariesToSearch(source, libraries, query),
		[source, libraries, query]
	)
	const results = useValue(
		'library search results',
		() => searchLibraries(searched, (library) => source.getItems(library.id), query),
		[source, searched, query]
	)
	const loading = useValue(
		'library search loading',
		() => {
			const isLoadingItems = source.isLoadingItems
			return !!isLoadingItems && searched.some((l) => isLoadingItems.call(source, l.id))
		},
		[source, searched]
	)

	useEffect(() => {
		const { loadItems } = source
		if (!loadItems) return
		for (const library of searched) loadItems.call(source, library.id)
	}, [source, searched])

	if (results.length === 0) {
		return (
			<p className="tlui-libraries-panel__empty">
				{msg(loading ? messages.searching : messages.noResults)}
			</p>
		)
	}

	return results.map(({ library, items }) => (
		<SearchResultGroup
			key={library.id}
			source={source}
			library={library}
			itemIds={items.map((item) => item.id)}
			{...itemProps}
		/>
	))
}

function SearchResultGroup({
	source,
	library,
	itemIds,
	getItemProps,
	placeItem,
	prepareItemContent,
}: Omit<SearchResultsProps, 'libraries' | 'query'> & {
	library: TLLibrary
	itemIds: TLLibraryItemId[]
}) {
	const [element, setElement] = useState<HTMLElement | null>(null)
	const { ordering, reversed } = useItemOrdering(source)
	const key = itemIds.join()
	const itemFilter = useMemo(() => {
		const ids = new Set(key.split(','))
		return (item: { id: string }) => ids.has(item.id)
	}, [key])

	return (
		<section ref={setElement} className="tlui-libraries-section" aria-label={library.name}>
			<h3 className="tlui-libraries-panel__group-label">{library.name}</h3>
			<LibraryItems
				source={source}
				library={library}
				container={element}
				getItemProps={getItemProps}
				placeItem={placeItem}
				ordering={ordering}
				reversed={reversed}
				itemFilter={itemFilter}
				prepareItemContent={prepareItemContent}
			/>
		</section>
	)
}
