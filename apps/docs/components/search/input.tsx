'use client'

import { Command } from 'cmdk'
import { useEffect, useState } from 'react'
import { useSearchBox } from 'react-instantsearch'

export const SearchInput = () => {
	const { refine } = useSearchBox()
	const [search, setSearch] = useState('')

	useEffect(() => {
		refine(search)
	}, [search])

	return (
		<Command.Input
			className="h-full w-full mr-4 focus:outline-none text-black bg-transparent"
			value={search}
			onValueChange={setSearch}
			autoFocus
		/>
	)
}
