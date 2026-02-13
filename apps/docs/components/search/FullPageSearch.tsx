'use client'
import { getSearchIndexName, SearchEntry } from '@/utils/algolia'
import { searchClient } from '@/utils/search-api'
import { Combobox, ComboboxItem, ComboboxProvider } from '@ariakit/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { Hit } from 'instantsearch.js'
import { SendEventForHits } from 'instantsearch.js/es/lib/utils'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createRef, Fragment, useCallback, useEffect, useState } from 'react'
import { Configure, Highlight, InstantSearch, useHits, useSearchBox } from 'react-instantsearch'
import { twJoin } from 'tailwind-merge'
import { debounce } from 'tldraw'
import { ContentHighlight } from './ContentHighlight'

export function FullPageSearch({ indexName }: { indexName: 'docs' | 'blog' }) {
	return (
		<InstantSearch
			indexName={getSearchIndexName(indexName)}
			searchClient={searchClient}
			insights={true}
			future={{ preserveSharedStateOnUnmount: true }}
		>
			<Configure distinct={4} hitsPerPage={40} />
			<InstantSearchInner indexName={indexName} />
		</InstantSearch>
	)
}

function InstantSearchInner({ indexName }: { indexName: 'docs' | 'blog' }) {
	const { items, sendEvent } = useHits<SearchEntry>()
	const { refine } = useSearchBox()
	const router = useRouter()
	const [open, setOpen] = useState(true)

	const searchParams = useSearchParams()
	const urlQuery = searchParams.get('query') || ''

	const handleChange = (path: string) => {
		setOpen(false)
		router.push(path)
	}

	const updateSearchQuery = debounce((value: string) => refine(value), 500)

	useEffect(() => {
		refine(urlQuery)
	}, [urlQuery, refine])

	return (
		open && (
			<SearchAutocomplete
				items={items}
				onInputChange={updateSearchQuery}
				onChange={handleChange}
				sendEvent={sendEvent}
				defaultValue={urlQuery}
				indexName={indexName}
			/>
		)
	)
}

interface AutocompleteProps {
	items: Hit<SearchEntry>[]
	onChange(value: string): void
	onInputChange(value: string): void
	defaultValue: string
	sendEvent: SendEventForHits
	indexName: 'docs' | 'blog'
}

function SearchAutocomplete({
	items,
	defaultValue,
	onInputChange,
	onChange,
	sendEvent,
	indexName,
}: AutocompleteProps) {
	return (
		<ComboboxProvider<string>
			defaultSelectedValue=""
			defaultValue={defaultValue}
			includesBaseElement={true}
			setValue={(newValue) => onInputChange(newValue)}
			setSelectedValue={(newValue) => onChange(newValue)}
		>
			<div className="w-full mb-12 h-full">
				<div className="pointer-events-auto min-h-full">
					<SearchInput indexName={indexName} />
					<Results items={items} sendEvent={sendEvent} />
				</div>
			</div>
		</ComboboxProvider>
	)
}

function SearchInput({ indexName }: { indexName: 'docs' | 'blog' }) {
	const comboboxRef = createRef<HTMLInputElement>()
	const router = useRouter()
	const pathname = usePathname()
	const capitalizedIndexName = indexName.charAt(0).toUpperCase() + indexName.slice(1)

	const updateUrl = useCallback(() => {
		const queryParam = comboboxRef.current?.value || ''
		router.push(`${pathname}?query=${encodeURIComponent(queryParam.trim())}`)
	}, [comboboxRef, router, pathname])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key !== 'Enter') return
			updateUrl()
		},
		[updateUrl]
	)

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				comboboxRef.current?.focus()
				comboboxRef.current?.setSelectionRange(0, comboboxRef.current.value.length)
			}
		}

		document.addEventListener('keydown', onKeyDown)
		return () => document.removeEventListener('keydown', onKeyDown)
	}, [comboboxRef])

	return (
		<div className="md:sticky bg-white dark:bg-zinc-950 w-full md:top-4 flex items-center z-20 md:pb-4">
			<div className="flex h-10 grow items-center gap-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg px-4 focus-within:ring-blue-500 focus-within:ring-2 min-w-full">
				<MagnifyingGlassIcon className="h-4 shrink-0 text-black dark:text-white" />
				<Combobox
					ref={comboboxRef}
					className="h-full w-full mr-4 focus:outline-none text-black dark:text-white bg-transparent"
					placeholder={`Search ${capitalizedIndexName}...`}
					onKeyDown={handleKeyDown}
				/>
			</div>
		</div>
	)
}

function Results({ items, sendEvent }: { items: Hit<SearchEntry>[]; sendEvent: SendEventForHits }) {
	let section = ''
	const renderedItems = items.map((hit) => {
		const showChapter = hit.section !== section
		section = hit.section

		const href = hit.headingSlug ? `${hit.path}#${hit.headingSlug}` : hit.path

		return (
			<Fragment key={hit.objectID}>
				{showChapter && (
					<div className="text-black dark:text-white font-semibold mt-6 mb-4">{section}</div>
				)}

				<ComboboxItem
					className={twJoin(
						'px-4 pt-2.5 pb-3 bg-zinc-100 dark:bg-zinc-800 mt-2',
						'rounded-md cursor-pointer data-[active-item=true]:bg-blue-500',
						'dark:data-[active-item=true]:bg-blue-500 data-[active-item=true]:text-blue-200',
						'[&_mark]:bg-transparent [&_mark]:font-bold',
						'[&_mark]:text-black [&_mark]:data-[active-item=true]:text-white',
						'dark:[&_mark]:text-white',
						'[&_.ais-Highlight-nonHighlighted]:data-[active-item=true]:text-white',
						'hover:text-zinc-800 dark:hover:text-zinc-200'
					)}
					value={href}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							sendEvent('click', hit, 'Hit clicked via keyboard')
						}
					}}
				>
					<Link href={href} onClick={() => sendEvent('click', hit, 'Hit clicked')}>
						<Highlight attribute="title" hit={hit} />
						<ContentHighlight hit={hit} />
					</Link>
				</ComboboxItem>
			</Fragment>
		)
	})

	return items.length === 0 ? (
		<div className="sticky top-[4.5rem] text-center py-8 text-zinc-400 dark:text-zinc-600">
			No results found.
		</div>
	) : (
		renderedItems
	)
}
