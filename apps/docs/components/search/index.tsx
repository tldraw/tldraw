'use client'

import { SearchEntry, SearchIndexName, getSearchIndexName } from '@/utils/algolia'
import { debounce } from '@/utils/debounce'
import { searchClient } from '@/utils/search-api'
import { useRouter } from 'next/navigation'
import { useHits, useSearchBox } from 'react-instantsearch'
import { InstantSearchNext } from 'react-instantsearch-nextjs'
import SearchAutocomplete from './SearchAutocomplete'

export function Search({ type, onClose }: { type: SearchIndexName; onClose(): void }) {
	return (
		<InstantSearchNext
			indexName={getSearchIndexName(type)}
			searchClient={searchClient}
			insights={true}
			future={{ preserveSharedStateOnUnmount: true }}
		>
			<InstantSearchInner onClose={onClose} />
		</InstantSearchNext>
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
