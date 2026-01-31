import { useEffect, useRef, useState } from 'react'
import { Example, examples } from '../lib/examples/index'

interface ExamplesSidebarProps {
	isOpen: boolean
	onClose: () => void
	onLoadExample: (name: string, code: string) => void
	selectedExample: string | null
}

/**
 * Collapsible sidebar showing all available examples.
 * Opens from the left side of the code panel.
 */
export function ExamplesSidebar({
	isOpen,
	onClose,
	onLoadExample,
	selectedExample,
}: ExamplesSidebarProps) {
	const sidebarRef = useRef<HTMLDivElement>(null)
	const [searchQuery, setSearchQuery] = useState('')

	// Close on escape key
	useEffect(() => {
		if (!isOpen) return
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				onClose()
			}
		}
		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [isOpen, onClose])

	// Close when clicking outside
	useEffect(() => {
		if (!isOpen) return
		function handleClickOutside(e: MouseEvent) {
			if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
				onClose()
			}
		}
		// Use timeout to avoid immediate close from the button click that opened it
		const timeout = setTimeout(() => {
			document.addEventListener('click', handleClickOutside)
		}, 0)
		return () => {
			clearTimeout(timeout)
			document.removeEventListener('click', handleClickOutside)
		}
	}, [isOpen, onClose])

	// Filter examples by search query
	const filteredExamples = examples.filter((example) =>
		example.name.toLowerCase().includes(searchQuery.toLowerCase())
	)

	// Group examples by category based on naming patterns
	const categorizedExamples = categorizeExamples(filteredExamples)

	return (
		<div className={`examples-sidebar ${isOpen ? 'open' : ''}`} ref={sidebarRef}>
			<div className="examples-sidebar-header">
				<h2>Examples</h2>
				<button className="examples-sidebar-close" onClick={onClose} title="Close (Esc)">
					<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
						<path d="M1.4 14L0 12.6L5.6 7L0 1.4L1.4 0L7 5.6L12.6 0L14 1.4L8.4 7L14 12.6L12.6 14L7 8.4L1.4 14Z" />
					</svg>
				</button>
			</div>

			<div className="examples-sidebar-search">
				<input
					type="text"
					placeholder="Search examples..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					autoFocus
				/>
			</div>

			<div className="examples-sidebar-content">
				{Object.entries(categorizedExamples).map(([category, categoryExamples]) => (
					<div key={category} className="examples-category">
						<div className="examples-category-header">{category}</div>
						<div className="examples-category-list">
							{categoryExamples.map((example) => (
								<button
									key={example.name}
									className={`examples-item ${example.name === selectedExample ? 'selected' : ''}`}
									onClick={() => {
										onLoadExample(example.name, example.code)
										onClose()
									}}
								>
									{example.name}
								</button>
							))}
						</div>
					</div>
				))}
				{filteredExamples.length === 0 && <div className="examples-empty">No examples found</div>}
			</div>
		</div>
	)
}

/**
 * Categorize examples based on their names
 */
function categorizeExamples(examplesList: Example[]): Record<string, Example[]> {
	const categories: Record<string, Example[]> = {
		'Getting started': [],
		'3D & Graphics': [],
		Games: [],
		Physics: [],
		'Math & Algorithms': [],
		Interactive: [],
		'Time & Utilities': [],
		Other: [],
	}

	for (const example of examplesList) {
		const name = example.name.toLowerCase()

		if (
			name.includes('modify') ||
			name.includes('color') ||
			name.includes('camera') ||
			name.includes('bezier') ||
			name.includes('gallery')
		) {
			categories['Getting started'].push(example)
		} else if (
			name.includes('3d') ||
			name.includes('sphere') ||
			name.includes('cube') ||
			name.includes('torus') ||
			name.includes('starfield') ||
			name.includes('watercolor')
		) {
			categories['3D & Graphics'].push(example)
		} else if (
			name.includes('invaders') ||
			name.includes('tetris') ||
			name.includes('pong') ||
			name.includes('snake') ||
			name.includes('whack') ||
			name.includes('pool')
		) {
			categories['Games'].push(example)
		} else if (
			name.includes('physics') ||
			name.includes('cloth') ||
			name.includes('rope') ||
			name.includes('pendulum') ||
			name.includes('particle') ||
			name.includes('bouncing')
		) {
			categories['Physics'].push(example)
		} else if (
			name.includes('fractal') ||
			name.includes('lissajous') ||
			name.includes('lorenz') ||
			name.includes('turing') ||
			name.includes('game of life') ||
			name.includes('maze') ||
			name.includes('spiral')
		) {
			categories['Math & Algorithms'].push(example)
		} else if (
			name.includes('mouse') ||
			name.includes('click') ||
			name.includes('zoom') ||
			name.includes('attract')
		) {
			categories['Interactive'].push(example)
		} else if (
			name.includes('clock') ||
			name.includes('timer') ||
			name.includes('calendar') ||
			name.includes('stopwatch') ||
			name.includes('year') ||
			name.includes('pomodoro')
		) {
			categories['Time & Utilities'].push(example)
		} else {
			categories['Other'].push(example)
		}
	}

	// Filter out empty categories
	const result: Record<string, Example[]> = {}
	for (const [category, items] of Object.entries(categories)) {
		if (items.length > 0) {
			result[category] = items
		}
	}

	return result
}
