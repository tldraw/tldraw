import { ReactNode, useEffect, useRef, useState } from 'react'
import { examples } from '../lib/examples'

interface ToolbarProps {
	onRun: () => void
	onClear: () => void
	onLoadExample: (code: string) => void
	isExecuting: boolean
	generatedShapeCount: number
	currentCode: string
	children?: ReactNode
}

// Find which example matches the current code, or null if none match
function findMatchingExample(code: string): string | null {
	for (const [name, exampleCode] of Object.entries(examples)) {
		if (code === exampleCode) return name
	}
	return null
}

/**
 * Toolbar component with Run, Clear buttons and examples dropdown.
 */
export function Toolbar({
	onRun,
	onClear,
	onLoadExample,
	isExecuting,
	generatedShapeCount,
	currentCode,
	children,
}: ToolbarProps) {
	const matchingExample = findMatchingExample(currentCode)
	const [isDropdownOpen, setIsDropdownOpen] = useState(false)
	const dropdownRef = useRef<HTMLDivElement>(null)
	const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
	const shortcut = isMac ? '⌘+Enter' : 'Ctrl+Enter'

	useEffect(() => {
		if (!isDropdownOpen) return
		function handleClickOutside(e: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setIsDropdownOpen(false)
			}
		}
		document.addEventListener('click', handleClickOutside)
		return () => document.removeEventListener('click', handleClickOutside)
	}, [isDropdownOpen])

	return (
		<div className="code-toolbar">
			<button
				className="toolbar-button toolbar-button-primary"
				onClick={onRun}
				disabled={isExecuting}
				title={`Run code (${shortcut})`}
			>
				{isExecuting ? 'Running...' : 'Run'}
			</button>

			<button
				className="toolbar-button"
				onClick={onClear}
				disabled={generatedShapeCount === 0}
				title={`Clear generated shapes (${generatedShapeCount} shapes)`}
			>
				Clear
			</button>

			<div className="toolbar-dropdown" ref={dropdownRef}>
				<button
					className="toolbar-dropdown-trigger"
					onClick={() => setIsDropdownOpen(!isDropdownOpen)}
				>
					{matchingExample ?? 'Examples'}
					<svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor">
						<path d="M0 0l4 5 4-5z" />
					</svg>
				</button>
				{isDropdownOpen && (
					<div className="toolbar-dropdown-menu">
						{Object.keys(examples).map((name) => (
							<button
								key={name}
								className={`toolbar-dropdown-item ${name === matchingExample ? 'selected' : ''}`}
								onClick={(e) => {
									e.stopPropagation()
									onLoadExample(examples[name])
									setIsDropdownOpen(false)
								}}
							>
								{name}
							</button>
						))}
					</div>
				)}
			</div>

			{children}

			<div className="toolbar-hint">{shortcut} to run</div>
		</div>
	)
}
