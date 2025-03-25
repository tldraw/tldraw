'use client'
import { getSearchIndexName, SearchEntry } from '@/utils/algolia'
import { searchClient } from '@/utils/search-api'
import { Combobox, ComboboxItem, ComboboxProvider } from '@ariakit/react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid'
import { Hit } from 'instantsearch.js'
import { SendEventForHits } from 'instantsearch.js/es/lib/utils'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createRef, Fragment, useCallback, useEffect, useState } from 'react'
import { Configure, Highlight, useHits, useSearchBox } from 'react-instantsearch'
import { InstantSearchNext } from 'react-instantsearch-nextjs'
import { twJoin } from 'tailwind-merge'
import { debounce } from 'tldraw'
import { ContentHighlight } from './ContentHighlight'

export function FullPageSearch() {
	const searchParams = useSearchParams()
	const indexName = searchParams.get('index') || 'docs'
	if (indexName !== 'docs' && indexName !== 'blog') {
		throw new Error(`Invalid search index name: ${indexName}`)
	}
	return (
		<InstantSearchNext
			indexName={getSearchIndexName(indexName)}
			searchClient={searchClient}
			insights={true}
			future={{ preserveSharedStateOnUnmount: true }}
		>
			<Configure distinct={4} hitsPerPage={40} />
			<InstantSearchInner />
		</InstantSearchNext>
	)
}

function InstantSearchInner() {
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
}

function SearchAutocomplete({
	items,
	defaultValue,
	onInputChange,
	onChange,
	sendEvent,
}: AutocompleteProps) {
	return (
		<ComboboxProvider<string>
			defaultSelectedValue=""
			defaultValue={defaultValue}
			includesBaseElement={true}
			setValue={(newValue) => onInputChange(newValue)}
			setSelectedValue={(newValue) => onChange(newValue)}
		>
			<div className="w-full mb-12">
				<div
					className={twJoin(
						'pointer-events-auto bg-zinc-50 dark:bg-zinc-900 rounded-lg overflow-hidden'
						// 'focus-within:ring-2 focus-within:ring-blue-500'
					)}
				>
					<SearchInput />
					<Results items={items} sendEvent={sendEvent} />
				</div>
			</div>
		</ComboboxProvider>
	)
}

function SearchInput() {
	const comboboxRef = createRef<HTMLInputElement>()
	const router = useRouter()
	const searchParams = useSearchParams()
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key !== 'Enter') return
			const indexQuery = searchParams.get('index') === 'blog' ? 'index=blog&' : ''
			const query = comboboxRef.current?.value || ''
			router.push(`/search?${indexQuery}query=${encodeURIComponent(query.trim())}`)
		},
		[router, searchParams, comboboxRef]
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
		<div className="w-full h-10 flex items-center px-4">
			<div className="flex h-full grow items-center gap-3">
				<MagnifyingGlassIcon className="h-4 shrink-0" />
				<Combobox
					ref={comboboxRef}
					className="h-full w-full mr-4 focus:outline-none text-black dark:text-white bg-transparent"
					placeholder="Search..."
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
						'[&_.ais-Highlight-nonHighlighted]:data-[active-item=true]:text-white'
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

	return (
		<div className="p-4 pt-0 border-t border-zinc-100 dark:border-zinc-800">
			{items.length === 0 && (
				<div className="text-center py-8 text-zinc-400 dark:text-zinc-600">No results found.</div>
			)}
			{items.length !== 0 && renderedItems}
		</div>
	)
}
