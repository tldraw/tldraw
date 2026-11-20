import { type ButtonHTMLAttributes, useMemo, useState } from 'react'
import {
	defineMessages,
	useTranslation,
	useValue,
	type TLLibrary,
	type TLLibraryItemId,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { LibraryItems } from './library-items'
import { searchLibraries } from './panel-search'
import type { PrepareItemContent } from './save-shapes'
import { useItemOrdering } from './use-item-ordering'

const messages = defineMessages({
	noResults: { id: 'libraries.search.no-results', defaultMessage: 'No items found' },
})

export interface SearchResultsProps {
	source: LibrarySource
	libraries: TLLibrary[]
	query: string
	getItemProps(itemId: TLLibraryItemId): ButtonHTMLAttributes<HTMLButtonElement>
	placeItem(itemId: TLLibraryItemId): void
	prepareItemContent?: PrepareItemContent
}

/** The panel's matches for a search, under the name of the library each is from. */
export function SearchResults({ source, libraries, query, ...itemProps }: SearchResultsProps) {
	const msg = useTranslation()
	const results = useValue(
		'library search results',
		() => searchLibraries(libraries, (library) => source.getItems(library.id), query),
		[source, libraries, query]
	)

	if (results.length === 0) {
		return <p className="tlui-libraries-panel__empty">{msg(messages.noResults)}</p>
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
	const { ordering, reversed } = useItemOrdering(source, library.id)
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
