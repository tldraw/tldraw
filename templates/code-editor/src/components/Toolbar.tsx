import { ReactNode } from 'react'

interface ToolbarProps {
	onRun: () => void
	isExecuting: boolean
	isLiveMode: boolean
	children?: ReactNode
}

/**
 * Toolbar component with Run button on left, other controls on right.
 */
export function Toolbar({ onRun, isExecuting, isLiveMode, children }: ToolbarProps) {
	return (
		<div className="code-toolbar">
			<button
				className="toolbar-button toolbar-button-primary"
				onClick={onRun}
				disabled={isExecuting && !isLiveMode}
				title="Run code"
			>
				{isExecuting && !isLiveMode ? '...' : '▶'}
			</button>

			<div className="toolbar-buttons">{children}</div>
		</div>
	)
}
