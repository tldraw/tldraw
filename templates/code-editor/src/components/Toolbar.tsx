import { ReactNode } from 'react'

interface ToolbarProps {
	onRun: () => void
	onClear: () => void
	onOpenExamples: () => void
	isExecuting: boolean
	isLiveMode: boolean
	generatedShapeCount: number
	selectedExample: string | null
	children?: ReactNode
}

/**
 * Toolbar component with Run, Clear buttons and examples sidebar trigger.
 */
export function Toolbar({
	onRun,
	onClear,
	onOpenExamples,
	isExecuting,
	isLiveMode,
	generatedShapeCount,
	selectedExample,
	children,
}: ToolbarProps) {
	const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
	const shortcut = isMac ? '⌘+Enter' : 'Ctrl+Enter'

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

			<button
				className="toolbar-button examples-button"
				onClick={onOpenExamples}
				title="Browse examples"
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				>
					<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
					<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
				</svg>
				{selectedExample ?? 'Examples'}
			</button>

			{children}

			<div className="toolbar-hint">{shortcut} to run</div>
		</div>
	)
}
