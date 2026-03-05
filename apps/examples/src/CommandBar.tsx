import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Example, examples } from './examples'

const allExamples = examples.flatMap((category) =>
	category.value.map((example) => ({ ...example, categoryTitle: category.id }))
)

function matchesFilter(example: (typeof allExamples)[0], terms: string[]): boolean {
	if (!terms.length) return true
	return (
		terms.some((term) => example.title.toLowerCase().includes(term)) ||
		terms.some((term) => example.categoryTitle.toLowerCase().includes(term)) ||
		example.keywords.some((keyword) => terms.some((term) => keyword.toLowerCase().includes(term)))
	)
}

export function CommandBar() {
	const [isOpen, setIsOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [selectedIndex, setSelectedIndex] = useState(0)
	const inputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLUListElement>(null)
	const navigate = useNavigate()

	const filtered = useMemo(() => {
		const excludedWords = ['a', 'the', '', ' ']
		const terms = query
			.toLowerCase()
			.split(' ')
			.filter((t) => !excludedWords.includes(t))
		return allExamples.filter((ex) => matchesFilter(ex, terms))
	}, [query])

	const open = useCallback(() => {
		setIsOpen(true)
		setQuery('')
		setSelectedIndex(0)
	}, [])

	const close = useCallback(() => {
		setIsOpen(false)
		setQuery('')
		setSelectedIndex(0)
	}, [])

	const goTo = useCallback(
		(example: Example) => {
			navigate(example.path)
			close()
		},
		[navigate, close]
	)

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault()
				e.stopPropagation()
				if (isOpen) {
					close()
				} else {
					open()
				}
			}
		}
		window.addEventListener('keydown', handleKeyDown, { capture: true })
		return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
	}, [isOpen, open, close])

	useEffect(() => {
		if (isOpen) {
			requestAnimationFrame(() => inputRef.current?.focus())
		}
	}, [isOpen])

	useEffect(() => {
		setSelectedIndex(0)
	}, [query])

	useEffect(() => {
		if (!listRef.current) return
		const selected = listRef.current.querySelector('[data-selected="true"]')
		if (selected) {
			selected.scrollIntoView({ block: 'nearest' })
		}
	}, [selectedIndex])

	const handleInputKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault()
					setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
					break
				case 'ArrowUp':
					e.preventDefault()
					setSelectedIndex((i) => Math.max(i - 1, 0))
					break
				case 'Enter':
					e.preventDefault()
					if (filtered[selectedIndex]) {
						goTo(filtered[selectedIndex])
					}
					break
				case 'Escape':
					e.preventDefault()
					close()
					break
			}
		},
		[filtered, selectedIndex, goTo, close]
	)

	if (!isOpen) return null

	return (
		<div className="cmdk__overlay" onPointerDown={close}>
			<div className="cmdk__dialog" onPointerDown={(e) => e.stopPropagation()}>
				<div className="cmdk__input-wrapper">
					<SearchIcon />
					<input
						ref={inputRef}
						className="cmdk__input"
						placeholder="Search examples…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={handleInputKeyDown}
					/>
					<kbd className="cmdk__kbd">esc</kbd>
				</div>
				<ul ref={listRef} className="cmdk__list scroll-light">
					{filtered.length === 0 && <li className="cmdk__empty">No results found.</li>}
					{filtered.map((example, i) => (
						<li
							key={example.path}
							className="cmdk__item"
							data-selected={i === selectedIndex}
							onPointerMove={() => setSelectedIndex(i)}
							onClick={() => goTo(example)}
						>
							<span className="cmdk__item-title">{example.title}</span>
							<span className="cmdk__item-category">{example.categoryTitle}</span>
						</li>
					))}
				</ul>
				<div className="cmdk__footer">
					<span>
						<kbd className="cmdk__kbd">↑</kbd>
						<kbd className="cmdk__kbd">↓</kbd>
						navigate
					</span>
					<span>
						<kbd className="cmdk__kbd">↵</kbd>
						open
					</span>
					<span>
						<kbd className="cmdk__kbd">esc</kbd>
						close
					</span>
				</div>
			</div>
		</div>
	)
}

function SearchIcon() {
	return (
		<svg
			className="cmdk__search-icon"
			width="16"
			height="16"
			viewBox="0 0 15 15"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M10 6.5C10 8.433 8.433 10 6.5 10C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5ZM9.30884 10.0159C8.53901 10.6318 7.56251 11 6.5 11C4.01472 11 2 8.98528 2 6.5C2 4.01472 4.01472 2 6.5 2C8.98528 2 11 4.01472 11 6.5C11 7.56251 10.6318 8.53901 10.0159 9.30884L12.8536 12.1464C13.0488 12.3417 13.0488 12.6583 12.8536 12.8536C12.6583 13.0488 12.3417 13.0488 12.1464 12.8536L9.30884 10.0159Z"
				fill="currentColor"
				fillRule="evenodd"
				clipRule="evenodd"
			/>
		</svg>
	)
}
