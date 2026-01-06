import { Highlight, themes } from 'prism-react-renderer'
import { useEffect, useRef, useState } from 'react'
import { defaultCode } from '../lib/examples'
import { Toolbar } from './Toolbar'

interface CodeEditorProps {
	onRun: (code: string) => Promise<void>
	onClear: () => void
	isExecuting: boolean
	generatedShapeCount: number
	error: string | null
	onDismissError: () => void
}

const STORAGE_KEY = 'code-editor-code'

/**
 * Code editor panel with syntax highlighting and keyboard shortcuts.
 * Persists code to localStorage between sessions.
 */
export function CodeEditor({
	onRun,
	onClear,
	isExecuting,
	generatedShapeCount,
	error,
	onDismissError,
}: CodeEditorProps) {
	// Load code from localStorage or use default
	const [code, setCode] = useState(() => {
		try {
			return localStorage.getItem(STORAGE_KEY) || defaultCode
		} catch {
			return defaultCode
		}
	})

	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const highlightRef = useRef<HTMLDivElement>(null)
	const wrapperRef = useRef<HTMLDivElement>(null)

	const preRef = useRef<HTMLPreElement>(null)

	// Sync overlay position using transform (no separate scroll)
	const syncPosition = () => {
		if (textareaRef.current && preRef.current) {
			const { scrollTop, scrollLeft } = textareaRef.current
			preRef.current.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`
		}
	}

	// Match overlay width to textarea's content width (offsetWidth - scrollbar)
	const syncWidth = () => {
		if (textareaRef.current && highlightRef.current) {
			const scrollbarWidth = textareaRef.current.offsetWidth - textareaRef.current.clientWidth
			highlightRef.current.style.width = `calc(100% - ${scrollbarWidth}px)`
		}
	}

	// Re-sync on resize
	useEffect(() => {
		const wrapper = wrapperRef.current
		if (!wrapper) return

		const observer = new ResizeObserver(() => {
			requestAnimationFrame(syncWidth)
		})

		observer.observe(wrapper)
		syncWidth()

		return () => observer.disconnect()
	}, [])

	// Save code to localStorage when it changes
	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, code)
		} catch (error) {
			console.warn('Failed to save code to localStorage:', error)
		}
	}, [code])

	// Auto-focus textarea on mount
	useEffect(() => {
		textareaRef.current?.focus()
	}, [])

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Handle Cmd/Ctrl+Enter to run code
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault()
			onRun(code)
			return
		}

		// Handle Tab key to insert spaces instead of switching focus
		if (e.key === 'Tab') {
			e.preventDefault()
			const target = e.currentTarget
			const start = target.selectionStart
			const end = target.selectionEnd

			// Insert 2 spaces
			const newCode = code.substring(0, start) + '  ' + code.substring(end)
			setCode(newCode)

			// Move cursor after the inserted spaces
			setTimeout(() => {
				target.selectionStart = target.selectionEnd = start + 2
			}, 0)
		}
	}

	const handleLoadExample = (exampleCode: string) => {
		setCode(exampleCode)
		textareaRef.current?.focus()
	}

	return (
		<div className="code-panel">
			<Toolbar
				onRun={() => onRun(code)}
				onClear={onClear}
				onLoadExample={handleLoadExample}
				isExecuting={isExecuting}
				generatedShapeCount={generatedShapeCount}
			/>

			{error && (
				<div className="error-banner">
					<span className="error-message">{error}</span>
					<button className="error-dismiss" onClick={onDismissError} aria-label="Dismiss error">
						×
					</button>
				</div>
			)}

			<div className="code-editor-wrapper" ref={wrapperRef}>
				{/* Syntax highlighted overlay */}
				<div className="code-highlight-container" ref={highlightRef} aria-hidden="true">
					<Highlight theme={themes.vsDark} code={code} language="javascript">
						{({ className, style, tokens, getLineProps, getTokenProps }) => (
							<pre ref={preRef} className={className} style={{ ...style, margin: 0, padding: 16 }}>
								{tokens.map((line, i) => (
									<div key={i} {...getLineProps({ line })}>
										{line.map((token, key) => (
											<span key={key} {...getTokenProps({ token })} />
										))}
									</div>
								))}
							</pre>
						)}
					</Highlight>
				</div>

				{/* Actual textarea for editing */}
				<textarea
					ref={textareaRef}
					className="code-editor"
					value={code}
					onChange={(e) => setCode(e.target.value)}
					onKeyDown={handleKeyDown}
					onScroll={syncPosition}
					spellCheck={false}
					autoCapitalize="off"
					autoComplete="off"
					autoCorrect="off"
				/>
			</div>
		</div>
	)
}
