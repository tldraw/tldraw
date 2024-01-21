'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Icon } from './Icon'

export function Search({
	prevType = 'n',
	prevQuery = '',
}: {
	activeId: string | null
	prevType?: string
	prevQuery?: string
}) {
	const [query, setQuery] = useState(prevQuery)
	const [isDisabled, setIsDisabled] = useState(false)

	const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setQuery(e.target.value)
	}, [])

	const rInput = useRef<HTMLInputElement>(null)

	const pathName = usePathname()
	const router = useRouter()

	useHotkeys('meta+k,ctrl+k', (e) => {
		e.preventDefault()
		rInput.current?.focus()
		rInput.current?.select()
	})

	useEffect(() => {
		setIsDisabled(false)
	}, [pathName])

	const handleFocus = useCallback(() => {
		// focus input and select all
		rInput.current!.focus()
		rInput.current!.select()
	}, [])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			const currentQuery = rInput.current!.value
			if (e.key === 'Enter' && currentQuery !== prevQuery) {
				setIsDisabled(true)
				router.push(`/search-results?q=${currentQuery}&t=${prevType}`)
			} else if (e.key === 'Escape') {
				rInput.current!.blur()
			}
		},
		[router, prevQuery, prevType]
	)

	return (
		<div className="search__wrapper">
			<div className="search">
				<Icon className="search__icon" icon="search" small />
				<input
					ref={rInput}
					type="text"
					className="search__input"
					placeholder="Search..."
					value={query}
					onChange={handleChange}
					onFocus={handleFocus}
					onKeyDown={handleKeyDown}
					autoCapitalize="off"
					autoComplete="off"
					autoCorrect="off"
					disabled={isDisabled}
				/>
			</div>
		</div>
	)
}
