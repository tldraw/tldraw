'use client'

import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import algoliasearch from 'algoliasearch/lite'
import { Command } from 'cmdk'
import { InstantSearch } from 'react-instantsearch'
import { Hits } from './hits'
import { SearchInput } from './input'

const searchClient = algoliasearch(
	process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
	process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
)

export function Search({ type }: { type: 'blog' | 'docs' }) {
	return (
		<InstantSearch indexName={type} searchClient={searchClient}>
			<Command
				shouldFilter={false}
				className="pointer-events-auto bg-zinc-50 dark:bg-zinc-900 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500"
			>
				<div className="w-full h-10 flex items-center px-4">
					<div className="flex h-full grow items-center gap-3">
						<MagnifyingGlassIcon className="h-4 shrink-0" />
						<SearchInput />
					</div>
					<span className="hidden md:block text-xs shrink-0">ESC</span>
				</div>
				<Hits />
			</Command>
		</InstantSearch>
	)
}
