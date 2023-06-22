import { SearchResult } from '@/types/search-types'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

export function Search({ activeId }: { activeId: string | null }) {
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<SearchResult[]>([])
	const rResultsList = useRef<HTMLOListElement>(null)
	const [isDisabled, setIsDisabled] = useState(false)

	const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setQuery(e.target.value)
	}, [])

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const sendQuery = useCallback(
		throttle(async (query: string) => {
			const res = await fetch(`/api/search?q=${query}&s=${activeId}`)
			const json = await res.json()
			setResults(json.results)
		}, 150),
		[activeId]
	)

	useEffect(() => {
		const query = rInput.current!.value
		if (query.length > 2) {
			sendQuery(query)
		} else {
			setResults([])
		}
	}, [sendQuery])

	const hasQuery = query.length > 0
	const hasResults = query.length > 0

	useEffect(() => {
		function handleKeyUp(e: KeyboardEvent) {
			if (e.key === 'Escape' && hasResults) {
				setResults([])
			}
		}

		function handleMouseUp(e: MouseEvent) {
			if (rResultsList.current && !rResultsList.current.contains(e.target as Node)) {
				setResults([])
			}
		}

		document.body.addEventListener('mouseup', handleMouseUp)
		document.body.addEventListener('keyup', handleKeyUp)
		return () => {
			document.body.removeEventListener('mouseup', handleMouseUp)
			document.body.removeEventListener('keyup', handleKeyUp)
		}
	}, [hasResults])

	const rInput = useRef<HTMLInputElement>(null)

	const router = useRouter()

	useEffect(() => {
		setQuery('')
		setResults([])
		setIsDisabled(false)
	}, [router.asPath])

	const handleFocus = useCallback(() => {
		if (hasQuery && !hasResults) {
			sendQuery(rInput.current!.value)
		}
	}, [sendQuery, hasQuery, hasResults])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter') {
				setIsDisabled(true)
				router.push(`/search-results?q=${rInput.current!.value}`)
			}
		},
		[router]
	)

	return (
		<div className="search__wrapper">
			<div className="search">
				<Icon className="search__icon" icon="search" />
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
			{results.length > 0 && (
				<div className="search__results__wrapper">
					<div className="search__results">
						<ol ref={rResultsList} className="search__results__list">
							{results.map((result) => (
								<Link key={result.id} href={result.url}>
									<li className="sidebar__article search__results__article">
										<h4>{result.subtitle}</h4>
										<h3>{result.title}</h3>
									</li>
								</Link>
							))}
						</ol>
					</div>
				</div>
			)}
		</div>
	)
}

function throttle<T extends (...args: any) => any>(
	func: T,
	limit: number
): (...args: Parameters<T>) => ReturnType<T> {
	let inThrottle: boolean
	let lastResult: ReturnType<T>
	return function (this: any, ...args: any[]): ReturnType<T> {
		if (!inThrottle) {
			inThrottle = true
			setTimeout(() => (inThrottle = false), limit)
			lastResult = func(...args)
		}
		return lastResult
	}
}
