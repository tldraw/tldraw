'use client'

import { SEARCH_TYPE, SearchResult } from '@/types/search-types'
import { debounce } from '@/utils/debounce'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Autocomplete, DropdownOption } from './Autocomplete'

const HOST_URL = typeof location !== 'undefined' ? location.origin : 'https://tldraw.dev'

export function Search() {
	const [searchType, setSearchType] = useState<SEARCH_TYPE>(SEARCH_TYPE.NORMAL)
	const [isLoading, setIsLoading] = useState(false)
	const [searchResults, setSearchResults] = useState<DropdownOption[]>([])
	const [query, setQuery] = useState('')
	const [platform, setPlatform] = useState<'mac' | 'nonMac' | null>()
	const rInput = useRef<HTMLInputElement>(null)
	const router = useRouter()

	const handleInputChange = debounce((query: string) => setQuery(query), 200)

	useEffect(() => {
		async function handleFetchResults() {
			if (!query) {
				return
			}

			setIsLoading(true)

			try {
				const endPoint =
					searchType === SEARCH_TYPE.AI
						? `${HOST_URL}/api/ai?q=${query}`
						: `${HOST_URL}/api/search?q=${query}`
				const res = await fetch(endPoint)
				if (res.ok) {
					const json = await res.json()
					const topExamples = json.results.examples.slice(0, 5)
					const topArticles = json.results.articles.slice(0, 10)
					const topAPI = json.results.apiDocs.slice(0, 20)
					const allResults = topExamples.concat(topArticles).concat(topAPI)

					if (allResults.length) {
						setSearchResults(
							allResults.map((result: SearchResult) => ({
								label: result.title,
								value: result.url,
								group: result.sectionType,
							}))
						)
					} else {
						setSearchResults([{ label: 'No results found.', value: '#', group: 'docs' }])
					}
				}
			} catch (err) {
				console.error(err)
			}

			setIsLoading(false)
		}

		handleFetchResults()
	}, [query, searchType])

	const handleChange = (url: string) => {
		router.push(url.startsWith('/') ? url : `/${url}`)
	}

	// AI is turned off for now.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const handleSearchTypeChange = () => {
		setSearchResults([])
		setSearchType(searchType === SEARCH_TYPE.AI ? SEARCH_TYPE.NORMAL : SEARCH_TYPE.AI)
		handleInputChange(query)
	}

	useEffect(() => {
		setPlatform(
			// TODO(mime): we should have a standard hook for this.
			// And also, we should navigator.userAgentData.platform where available.
			// eslint-disable-next-line deprecation/deprecation
			typeof window !== 'undefined' && /mac/i.test(window.navigator.platform) ? 'mac' : 'nonMac'
		)
	}, [])

	useHotkeys('meta+k,ctrl+k', (e) => {
		e.preventDefault()
		rInput.current?.focus()
		rInput.current?.select()
	})

	return (
		<div className="search__wrapper">
			<Autocomplete
				ref={rInput}
				// customUI={
				// 	<button className="search__ai-toggle" onClick={handleSearchTypeChange}>
				// 		{searchType === SEARCH_TYPE.NORMAL ? '✨ Search using AI' : '⭐ Search without AI'}
				// 	</button>
				// }
				groups={['docs', 'examples', 'reference']}
				groupsToLabel={{ examples: 'Examples', docs: 'Articles', reference: 'Reference' }}
				options={searchResults}
				isLoading={isLoading}
				onInputChange={handleInputChange}
				onChange={handleChange}
			/>
			{platform && (
				<span className="search__keyboard">
					<kbd data-platform={platform === 'mac' ? 'mac' : 'win'}>
						<span>{platform === 'mac' ? '⌘' : 'Ctrl'}</span>
						<span>K</span>
					</kbd>
				</span>
			)}
		</div>
	)
}
