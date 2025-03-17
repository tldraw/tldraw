'use client'

import { SearchEntry, SearchIndexName, getSearchIndexName } from '@/utils/algolia'
import { debounce } from '@/utils/debounce'
import algoliasearch from 'algoliasearch/lite'
import { useRouter } from 'next/navigation'
import { InstantSearch, useHits, useSearchBox } from 'react-instantsearch'
import SearchAutocomplete from './SearchAutocomplete'

const searchClient = algoliasearch(
	process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
	process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
)

export function Search({ type, onClose }: { type: SearchIndexName; onClose(): void }) {
	return (
		<InstantSearch indexName={getSearchIndexName(type)} searchClient={searchClient} insights={true}>
			<InstantSearchInner onClose={onClose} />
		</InstantSearch>
	)
}

function InstantSearchInner({ onClose }: { onClose(): void }) {
	const { items, sendEvent } = useHits<SearchEntry>()
	const { refine } = useSearchBox()
	const router = useRouter()

	const handleChange = (path: string) => {
		router.push(path)
		onClose()
	}
	const handleInputChange = debounce((query: string) => refine(query), 500)

	return (
		<SearchAutocomplete
			items={items}
			onInputChange={handleInputChange}
			onChange={handleChange}
			onClose={onClose}
			sendEvent={sendEvent}
		/>
	)
}
