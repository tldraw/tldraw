import * as EditorExports from '@tldraw/editor'
import console from 'console'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createShapeId, Editor, Tldraw } from 'tldraw'
import './App.css'

const DEFAULT_CODE = `// Welcome to the tldraw code editor!
// Use the 'editor' object to create shapes and interact with the canvas.
// All editor exports are available under the '_' namespace.

// Create a rectangle
editor.createShape({
	id: createShapeId(),
	type: 'geo',
	x: 100,
	y: 100,
	props: {
		w: 200,
		h: 100,
		geo: 'rectangle',
		color: 'blue',
		fill: 'solid'
	}
})

// Create a circle
editor.createShape({
	id: createShapeId(),
	type: 'geo',
	x: 350,
	y: 150,
	props: {
		w: 120,
		h: 120,
		geo: 'ellipse',
		color: 'red',
		fill: 'semi'
	}
})

// Example using _ namespace for editor utilities
console.log('Available editor utilities:', Object.keys(_))
// Try: _.toRichText('**bold** text'), _.Vec.angle({x:0,y:0}, {x:100,y:100})

// Your code is automatically saved to localStorage and restored on reload!

// Zoom to fit all shapes
editor.zoomToFit()
editor.resetZoom()
`

const CHEAT_SHEET = [
	{
		title: 'Create Rectangle',
		code: `editor.createShape({ id: createShapeId(), type: 'geo', x: 100, y: 100, props: { w: 200, h: 100, geo: 'rectangle', color: 'blue', fill: 'solid' } })`,
	},
	{
		title: 'Create Circle',
		code: `editor.createShape({ id: createShapeId(), type: 'geo', x: 100, y: 100, props: { w: 100, h: 100, geo: 'ellipse', color: 'red' } })`,
	},
	{
		title: 'Create Text',
		code: `editor.createShape({ id: createShapeId(), type: 'text', x: 100, y: 100, props: { text: 'Hello world', size: 'm' } })`,
	},
	{
		title: 'Create Arrow',
		code: `editor.createShape({ id: createShapeId(), type: 'arrow', x: 100, y: 100, props: { start: { x: 0, y: 0 }, end: { x: 100, y: 100 } } })`,
	},
	{ title: 'Get All Shapes', code: `editor.getCurrentPageShapes()` },
	{ title: 'Delete Shape', code: `editor.deleteShape(shapeId)` },
	{ title: 'Zoom to Fit', code: `editor.zoomToFit()` },
	{ title: 'Clear Canvas', code: `editor.deleteShapes(editor.getCurrentPageShapeIds())` },
	{ title: 'Rich Text Helper', code: `_.toRichText('Hello **bold** text!')` },
	{
		title: 'Geometry Utils',
		code: `_.Box.includes(_.Box.fromPoints([{x:0,y:0}, {x:100,y:100}]), {x:50,y:50})`,
	},
]

const DOC_LINKS = [
	{ title: 'Editor API', url: 'https://tldraw.dev/reference/editor/Editor' },
	{ title: 'Creating Shapes', url: 'https://tldraw.dev/docs/shapes' },
	{ title: 'Shape Types', url: 'https://tldraw.dev/reference/tlschema' },
	{ title: 'Examples', url: 'https://tldraw.dev/examples' },
]

const STORAGE_KEY_CODE = 'tldraw-code-editor-code'
const STORAGE_KEY_SPLIT_RATIO = 'tldraw-code-editor-split-ratio'

function App() {
	const [code, setCode] = useState(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY_CODE)
			return saved !== null ? saved : DEFAULT_CODE
		} catch {
			return DEFAULT_CODE
		}
	})
	const [editor, setEditor] = useState<Editor | null>(null)
	const [generatedShapeIds, setGeneratedShapeIds] = useState<Set<string>>(new Set())
	const [isRunning, setIsRunning] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [showCheatSheet, setShowCheatSheet] = useState(false)
	const [splitRatio, setSplitRatio] = useState(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY_SPLIT_RATIO)
			return saved !== null ? parseFloat(saved) : 0.4
		} catch {
			return 0.4
		}
	})
	const [isDragging, setIsDragging] = useState(false)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	// Expose editor globally for code execution
	useEffect(() => {
		if (editor) {
			;(window as any).editor = editor
			;(window as any).createShapeId = createShapeId
			;(window as any)._ = EditorExports
		}
	}, [editor])

	// Persist code to localStorage
	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY_CODE, code)
		} catch (error) {
			console.warn('Failed to save code to localStorage:', error)
		}
	}, [code])

	// Persist split ratio to localStorage
	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY_SPLIT_RATIO, splitRatio.toString())
		} catch (error) {
			console.warn('Failed to save split ratio to localStorage:', error)
		}
	}, [splitRatio])

	// Handle mouse drag for resizing
	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault()
		setIsDragging(true)
	}, [])

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isDragging || !containerRef.current) return

			const containerRect = containerRef.current.getBoundingClientRect()
			const newRatio = Math.max(
				0.2,
				Math.min(0.8, (e.clientX - containerRect.left) / containerRect.width)
			)
			setSplitRatio(newRatio)
		}

		const handleMouseUp = () => {
			setIsDragging(false)
		}

		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove)
			document.addEventListener('mouseup', handleMouseUp)
			document.body.style.cursor = 'col-resize'
			document.body.style.userSelect = 'none'
		}

		return () => {
			document.removeEventListener('mousemove', handleMouseMove)
			document.removeEventListener('mouseup', handleMouseUp)
			document.body.style.cursor = ''
			document.body.style.userSelect = ''
		}
	}, [isDragging])

	// Track shapes created during execution
	const trackGeneratedShape = useCallback((shapeId: string) => {
		setGeneratedShapeIds((prev) => new Set([...prev, shapeId]))
	}, [])

	// Clear generated shapes
	const clearGeneratedShapes = useCallback(() => {
		if (!editor) return

		const shapesToDelete = Array.from(generatedShapeIds).filter((id) => editor.getShape(id as any))

		if (shapesToDelete.length > 0) {
			editor.deleteShapes(shapesToDelete as any)
		}

		setGeneratedShapeIds(new Set())
	}, [editor, generatedShapeIds])

	// Execute code
	const runCode = useCallback(async () => {
		if (!editor || isRunning) return

		setIsRunning(true)
		setError(null)

		try {
			// Clear previously generated shapes
			clearGeneratedShapes()

			// Override createShape to track generated shapes
			const originalCreateShape = editor.createShape.bind(editor)
			editor.createShape = ((shape: any) => {
				const result = originalCreateShape(shape)
				if (shape?.id) {
					trackGeneratedShape(shape.id)
				}
				return result
			}) as any

			// Execute user code
			const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
			const func = new AsyncFunction('editor', 'createShapeId', code)
			func(editor, createShapeId)

			// Restore original createShape
			editor.createShape = originalCreateShape
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
			setError(errorMessage)
			console.error('Code execution error:', err)
		} finally {
			setIsRunning(false)
		}
	}, [code, editor, isRunning, clearGeneratedShapes, trackGeneratedShape])

	// Handle keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
				e.preventDefault()
				runCode()
			}
			if (e.key === 'Escape' && textareaRef.current) {
				textareaRef.current.blur()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [runCode])

	const copyToClipboard = useCallback((text: string) => {
		navigator.clipboard.writeText(text)
	}, [])

	const resetToDefault = useCallback(() => {
		if (confirm('Reset to default code? This will overwrite your current code.')) {
			setCode(DEFAULT_CODE)
		}
	}, [])

	return (
		<div ref={containerRef} className="app-container">
			<div className="code-panel" style={{ width: `${splitRatio * 100}%` }}>
				<div className="code-header">
					<div className="code-title">Code Editor</div>
					<div className="code-controls">
						<button
							onClick={() => setShowCheatSheet(!showCheatSheet)}
							className="control-button"
							title="Toggle cheat sheet"
						>
							?
						</button>
						<button
							onClick={resetToDefault}
							className="control-button"
							title="Reset to default code"
						>
							↻
						</button>
						<button
							onClick={clearGeneratedShapes}
							className="control-button clear-button"
							disabled={generatedShapeIds.size === 0}
							title="Clear generated shapes"
						>
							Clear
						</button>
						<button
							onClick={runCode}
							className="control-button run-button"
							disabled={isRunning}
							title="Run code (Cmd/Ctrl + Enter)"
						>
							{isRunning ? 'Running...' : 'Run'}
						</button>
					</div>
				</div>

				{showCheatSheet && (
					<div className="cheat-sheet">
						<div className="cheat-sheet-header">
							<h4>Quick Reference</h4>
							<div className="doc-links">
								{DOC_LINKS.map((link) => (
									<a key={link.title} href={link.url} target="_blank" rel="noopener noreferrer">
										{link.title}
									</a>
								))}
							</div>
						</div>
						<div className="cheat-sheet-items">
							{CHEAT_SHEET.map((item, index) => (
								<div key={index} className="cheat-sheet-item">
									<div className="cheat-sheet-title">{item.title}</div>
									<div className="cheat-sheet-code">
										<code>{item.code}</code>
										<button
											onClick={() => copyToClipboard(item.code)}
											className="copy-button"
											title="Copy to clipboard"
										>
											📋
										</button>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				<div className="code-input-container">
					<textarea
						ref={textareaRef}
						value={code}
						onChange={(e) => setCode(e.target.value)}
						className="code-textarea"
						placeholder="Enter your code here..."
						spellCheck={false}
					/>
				</div>

				{error && (
					<div className="error-panel">
						<div className="error-title">Error:</div>
						<div className="error-message">{error}</div>
						<div className="error-hint">Check the console for more details</div>
					</div>
				)}
			</div>

			<div
				className="resize-handle"
				onMouseDown={handleMouseDown}
				style={{ cursor: isDragging ? 'col-resize' : 'col-resize' }}
			/>

			<div className="canvas-panel" style={{ width: `${(1 - splitRatio) * 100}%` }}>
				<Tldraw onMount={setEditor} persistenceKey="code-editor" />
			</div>
		</div>
	)
}

export default App
