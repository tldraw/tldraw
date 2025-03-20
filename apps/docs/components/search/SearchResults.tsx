'use client'
import { getSearchIndexName, SearchEntry } from '@/utils/algolia'
import { searchClient } from '@/utils/search-api'
import { Combobox, ComboboxItem, ComboboxProvider, VisuallyHidden } from '@ariakit/react'

import { MagnifyingGlassIcon } from '@heroicons/react/24/solid'
import * as Dialog from '@radix-ui/react-dialog'
import { Hit } from 'instantsearch.js'
import { SendEventForHits } from 'instantsearch.js/es/lib/utils'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Fragment, startTransition, useEffect, useState } from 'react'
import { Highlight, useHits, useSearchBox } from 'react-instantsearch'
import { InstantSearchNext } from 'react-instantsearch-nextjs'
import { twJoin } from 'tailwind-merge'
import { debounce } from 'tldraw'
import { ContentHighlight } from './ContentHighlight'

export function SearchResults() {
	return (
		<InstantSearchNext
			indexName={getSearchIndexName('docs')}
			searchClient={searchClient}
			insights={true}
			future={{ preserveSharedStateOnUnmount: true }}
		>
			<InstantSearchInner onClose={() => {}} />
		</InstantSearchNext>
	)
}

function InstantSearchInner({ onClose }: { onClose(): void }) {
	const { items, sendEvent } = useHits<SearchEntry>()
	const { refine } = useSearchBox()
	const router = useRouter()

	const searchParams = useSearchParams()
	const query = searchParams.get('query') || ''

	useEffect(() => {
		refine(query)
	}, [query])

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

interface AutocompleteProps {
	items: Hit<SearchEntry>[]
	onChange(value: string): void
	onInputChange(value: string): void
	onClose(): void
	sendEvent: SendEventForHits
}

function SearchAutocomplete({
	items,
	onInputChange,
	onChange,
	onClose,
	sendEvent,
}: AutocompleteProps) {
	const [open, setOpen] = useState(true)
	const searchParams = useSearchParams()
	const query = searchParams.get('query') || ''
	const [value, setValue] = useState(query)

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			onClose()
		}
		setOpen(open)
	}

	return (
		<ComboboxProvider<string>
			defaultSelectedValue=""
			open={open}
			setOpen={setOpen}
			resetValueOnHide
			includesBaseElement={false}
			setValue={(newValue) => {
				startTransition(() => {
					setValue(newValue)
					onInputChange(newValue)
				})
			}}
			setSelectedValue={(newValue) => onChange(newValue)}
		>
			<div
				className={
					twJoin()
					// 'left-0 top-14 sm:top-[6.5rem] md:top-0 z-40'
					// 'bg-white/90 dark:bg-zinc-950/90 pointer-events-none'
				}
			>
				{/* <SearchDialog onOpenChange={handleOpenChange}> */}
				<div className="w-full mb-12">
					<div
						className={twJoin(
							'pointer-events-auto bg-zinc-50 dark:bg-zinc-900 rounded-lg',
							'overflow-hidden'
						)}
					>
						<SearchInput value={value} />
						<Results items={items} sendEvent={sendEvent} />
					</div>
				</div>
				{/* </SearchDialog> */}
			</div>
		</ComboboxProvider>
	)
}

function SearchInput({ value }: { value: string }) {
	const router = useRouter()
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key !== 'Enter') return
		router.push(`/search?query=${encodeURIComponent(value.trim())}`)
	}
	return (
		<div className="w-full h-10 flex items-center px-4">
			<div className="flex h-full grow items-center gap-3">
				<MagnifyingGlassIcon className="h-4 shrink-0" />
				<Combobox
					className="h-full w-full mr-4 focus:outline-none text-black dark:text-white bg-transparent"
					value={value}
					autoFocus
					placeholder="Search..."
					onKeyDown={handleKeyDown}
				/>
			</div>
			{/* <span className="hidden md:block text-xs shrink-0">ESC</span> */}
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
		<div className={twJoin(' p-4 pt-0', 'border-t border-zinc-100 dark:border-zinc-800')}>
			{items.length === 0 && (
				<div className="text-center py-8 text-zinc-400 dark:text-zinc-600">No results found.</div>
			)}
			{items.length !== 0 && renderedItems}
		</div>
	)
}

function SearchDialog({
	children,
	onOpenChange,
}: {
	children: React.ReactNode
	onOpenChange(open: boolean): void
}) {
	return (
		<Dialog.Root open onOpenChange={onOpenChange}>
			<Dialog.Portal>
				{/* <Dialog.Overlay /> */}
				<Dialog.Content className="fixed inset-0 z-50" style={{ pointerEvents: 'none' }}>
					<VisuallyHidden>
						<Dialog.Title>Search</Dialog.Title>
						<Dialog.Description>Search dialog</Dialog.Description>
					</VisuallyHidden>
					{children}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
