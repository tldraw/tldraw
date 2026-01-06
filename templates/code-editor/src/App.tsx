import { useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Editor, useValue } from 'tldraw'
import { CanvasPanel } from './components/CanvasPanel'
import { CodeEditor } from './components/CodeEditor'
import { executeCode } from './lib/code-executor'

/**
 * Main app component with split-view layout.
 * Manages editor state and coordinates between code panel and canvas.
 */
export default function App() {
	const [editor, setEditor] = useState<Editor | null>(null)
	const [isExecuting, setIsExecuting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Get count of generated shapes reactively
	const generatedShapeCount = useValue(
		'generated shape count',
		() => {
			if (!editor) return 0
			return editor.getCurrentPageShapes().filter((shape) => shape.meta.generated === true).length
		},
		[editor]
	)

	// Handle editor mount
	const handleEditorMount = (mountedEditor: Editor) => {
		setEditor(mountedEditor)

		// Configure editor to NOT automatically mark shapes as generated
		// Only shapes created via the API will have meta.generated = true
		// This ensures hand-drawn shapes remain unmarked
	}

	// Execute user code
	const handleRun = async (code: string) => {
		if (!editor || isExecuting) return

		setIsExecuting(true)
		setError(null)
		try {
			// Clear generated shapes before each run
			const generatedShapes = editor
				.getCurrentPageShapes()
				.filter((shape) => shape.meta.generated === true)

			if (generatedShapes.length > 0) {
				editor.deleteShapes(generatedShapes.map((s) => s.id))
			}

			const result = await executeCode(code, editor)
			if (!result.success && result.error) {
				setError(result.error)
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setIsExecuting(false)
		}
	}

	// Clear all generated shapes
	const handleClear = () => {
		if (!editor) return

		const generatedShapes = editor
			.getCurrentPageShapes()
			.filter((shape) => shape.meta.generated === true)

		if (generatedShapes.length > 0) {
			// Confirm if there are many shapes
			if (
				generatedShapes.length > 10 &&
				!confirm(`Clear ${generatedShapes.length} generated shapes?`)
			) {
				return
			}

			editor.deleteShapes(generatedShapes.map((s) => s.id))
		}
	}

	return (
		<div className="editor-container">
			<PanelGroup direction="horizontal">
				<Panel defaultSize={40} minSize={30} maxSize={80}>
					<CodeEditor
						onRun={handleRun}
						onClear={handleClear}
						isExecuting={isExecuting}
						generatedShapeCount={generatedShapeCount}
						error={error}
						onDismissError={() => setError(null)}
					/>
				</Panel>
				<PanelResizeHandle className="resize-handle" />
				<Panel minSize={20}>
					<CanvasPanel onMount={handleEditorMount} />
				</Panel>
			</PanelGroup>
		</div>
	)
}
