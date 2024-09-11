'use client'

import { Command } from 'cmdk'
import { useEffect, useState } from 'react'
import { useSearchBox } from 'react-instantsearch'

export function SearchInput() {
	const { refine } = useSearchBox()
	const [search, setSearch] = useState('')

	useEffect(() => {
		refine(search)
	}, [search, refine])

	return (
		<Command.Input
			className="h-full w-full mr-4 focus:outline-none text-black dark:text-white bg-transparent"
			value={search}
			onValueChange={setSearch}
			autoFocus
		/>
	)
}
