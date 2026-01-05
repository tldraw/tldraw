import { useState } from 'react'
import { examples } from '../lib/examples'

interface ToolbarProps {
	onRun: () => void
	onClear: () => void
	onLoadExample: (code: string) => void
	isExecuting: boolean
	generatedShapeCount: number
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
}: ToolbarProps) {
	const [selectedExample, setSelectedExample] = useState<string>('')
	const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC')
	const shortcut = isMac ? '⌘+Enter' : 'Ctrl+Enter'

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
				Clear {generatedShapeCount > 0 && `(${generatedShapeCount})`}
			</button>

			<select
				className="toolbar-select"
				value={selectedExample}
				onChange={(e) => {
					const exampleName = e.target.value
					if (exampleName && examples[exampleName]) {
						setSelectedExample(exampleName)
						onLoadExample(examples[exampleName])
					}
				}}
			>
				<option value="" disabled>
					Load example...
				</option>
				{Object.keys(examples).map((name) => (
					<option key={name} value={name}>
						{name}
					</option>
				))}
			</select>

			<div className="toolbar-hint">{shortcut} to run</div>
		</div>
	)
}
