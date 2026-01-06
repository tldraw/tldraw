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

	// Sync scroll position between textarea and highlight overlay
	const handleScroll = () => {
		if (textareaRef.current && highlightRef.current) {
			highlightRef.current.scrollTop = textareaRef.current.scrollTop
			highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
		}
	}

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

			<div className="code-editor-wrapper">
				{/* Syntax highlighted overlay */}
				<div className="code-highlight-container" ref={highlightRef} aria-hidden="true">
					<Highlight theme={themes.vsDark} code={code} language="javascript">
						{({ className, style, tokens, getLineProps, getTokenProps }) => (
							<pre className={className} style={{ ...style, margin: 0, padding: 16 }}>
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
					onScroll={handleScroll}
					spellCheck={false}
					autoCapitalize="off"
					autoComplete="off"
					autoCorrect="off"
				/>
			</div>
		</div>
	)
}
