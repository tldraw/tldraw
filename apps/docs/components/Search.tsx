'use client'

import { SEARCH_TYPE, SearchResult } from '@/types/search-types'
import { debounce } from '@/utils/debounce'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import Autocomplete, { DropdownOption } from './Autocomplete'

const HOST_URL =
	process.env.NODE_ENV === 'development'
		? 'http://localhost:3001'
		: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tldraw.dev'

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
					const topArticles = json.results.articles.slice(0, 10)
					const topAPI = json.results.apiDocs.slice(0, 10)
					const topExamples = json.results.examples.slice(0, 10)
					const allResults = topExamples.concat(topArticles).concat(topAPI)
					setSearchResults(
						allResults.map((result: SearchResult) => ({
							label: result.title,
							value: result.url,
							group: result.sectionType,
						}))
					)
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

	const handleSearchTypeChange = () => {
		setSearchType(searchType === SEARCH_TYPE.AI ? SEARCH_TYPE.NORMAL : SEARCH_TYPE.AI)
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
				customUI={
					<button className="search__ai-toggle" onClick={handleSearchTypeChange}>
						{searchType === SEARCH_TYPE.NORMAL ? '✨ Search using AI' : '⭐ Search without AI'}
					</button>
				}
				groups={['examples', 'docs', 'reference']}
				groupsToLabel={{ examples: 'Examples', docs: 'Articles', reference: 'Reference' }}
				groupsToIcon={{ examples: CodeIcon, docs: DocIcon, reference: ReferenceIcon }}
				options={searchResults}
				isLoading={isLoading}
				onInputChange={handleInputChange}
				onChange={handleChange}
			/>
			{platform && (
				<span className="search__keyboard">
					{platform === 'mac' && <kbd data-platform="mac">⌘</kbd>}
					{platform === 'nonMac' && <kbd data-platform="win">Ctrl</kbd>}
					<kbd>K</kbd>
				</span>
			)}
		</div>
	)
}

/*!
 * Author: Dazzle UI
 * License: https://www.svgrepo.com/page/licensing/#CC%20Attribution
 */
const CodeIcon = ({ className }: { className?: string }) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d="M9.95305 16.9123L8.59366 18.3608L2.03125 12.2016L8.19037 5.63922L9.64868 7.00791L4.85826 12.112L9.95254 16.8932L9.95305 16.9123Z"
			fill="#000000"
		/>
		<path
			d="M14.0478 16.9123L15.4072 18.3608L21.9696 12.2016L15.8105 5.63922L14.3522 7.00791L19.1426 12.112L14.0483 16.8932L14.0478 16.9123Z"
			fill="#000000"
		/>
	</svg>
)

/*!
 * Author: Solar Icons
 * License: https://www.svgrepo.com/page/licensing/#CC%20Attribution
 */
const DocIcon = ({ className }: { className?: string }) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d="M3 10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2H13C16.7712 2 18.6569 2 19.8284 3.17157C21 4.34315 21 6.22876 21 10V14C21 17.7712 21 19.6569 19.8284 20.8284C18.6569 22 16.7712 22 13 22H11C7.22876 22 5.34315 22 4.17157 20.8284C3 19.6569 3 17.7712 3 14V10Z"
			stroke="#000"
			stroke-width="1.5"
		/>
		<path d="M8 12H16" stroke="#000" stroke-width="1.5" stroke-linecap="round" />
		<path d="M8 8H16" stroke="#000" stroke-width="1.5" stroke-linecap="round" />
		<path d="M8 16H13" stroke="#000" stroke-width="1.5" stroke-linecap="round" />
	</svg>
)

/*!
 * Author: Konstantin Filatov
 * License: https://www.svgrepo.com/page/licensing/#CC%20Attribution
 */
const ReferenceIcon = ({ className }: { className?: string }) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			fill-rule="evenodd"
			clip-rule="evenodd"
			d="M19 23H7C4.27504 23 2 20.7055 2 18V6C2 3.23858 4.23858 1 7 1H19C20.6569 1 22 2.34315 22 4V20C22 21.6569 20.6569 23 19 23ZM7 3C5.34315 3 4 4.34315 4 6V14.9996C4.83566 14.3719 5.87439 14 7 14H19C19.3506 14 19.6872 14.0602 20 14.1707V4C20 3.44772 19.5523 3 19 3H18V9C18 9.3688 17.797 9.70765 17.4719 9.88167C17.1467 10.0557 16.7522 10.0366 16.4453 9.83205L14 8.20185L11.5547 9.83205C11.2478 10.0366 10.8533 10.0557 10.5281 9.88167C10.203 9.70765 10 9.3688 10 9V3H7ZM12 3H16V7.13148L14.5547 6.16795C14.2188 5.94402 13.7812 5.94402 13.4453 6.16795L12 7.13148V3ZM19 16C19.5523 16 20 16.4477 20 17V20C20 20.5523 19.5523 21 19 21H7C5.5135 21 4.04148 19.9162 4.04148 18.5C4.04148 17.0532 5.5135 16 7 16H19Z"
			fill="#000"
		/>
	</svg>
)
