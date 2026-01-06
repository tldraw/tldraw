import { ReactNode, useEffect, useRef, useState } from 'react'
import { examples } from '../lib/examples'

interface ToolbarProps {
	onRun: () => void
	onClear: () => void
	onLoadExample: (name: string, code: string) => void
	isExecuting: boolean
	isLiveMode: boolean
	generatedShapeCount: number
	selectedExample: string | null
	children?: ReactNode
}

/**
 * Toolbar component with Run, Clear buttons and examples dropdown.
 */
export function Toolbar({
	onRun,
	onClear,
	onLoadExample,
	isExecuting,
	isLiveMode,
	generatedShapeCount,
	selectedExample,
	children,
}: ToolbarProps) {
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
				disabled={isExecuting && !isLiveMode}
				title={`Run code (${shortcut})`}
			>
				{isExecuting && !isLiveMode ? 'Running...' : 'Run'}
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
					{selectedExample ?? 'Examples'}
					<svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor">
						<path d="M0 0l4 5 4-5z" />
					</svg>
				</button>
				{isDropdownOpen && (
					<div className="toolbar-dropdown-menu">
						{Object.keys(examples).map((name) => (
							<button
								key={name}
								className={`toolbar-dropdown-item ${name === selectedExample ? 'selected' : ''}`}
								onClick={(e) => {
									e.stopPropagation()
									onLoadExample(name, examples[name])
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
