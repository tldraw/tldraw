import Editor, { BeforeMount, Monaco, OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ExecutionError } from '../lib/code-executor'
import { editorTypeDefinitions } from '../lib/editor-types'
import { defaultCode } from '../lib/examples'
import { Toolbar } from './Toolbar'

interface CodeEditorProps {
	onRun: (code: string) => Promise<void>
	onClear: () => void
	isExecuting: boolean
	generatedShapeCount: number
	error: ExecutionError | null
	onDismissError: () => void
	isDarkTheme: boolean
	onThemeToggle: () => void
}

const STORAGE_KEY = 'code-editor-code'
const LIVE_MODE_STORAGE_KEY = 'code-editor-live-mode'
const SELECTED_EXAMPLE_STORAGE_KEY = 'code-editor-selected-example'
const DEBOUNCE_MS = 500

// Ayu Light theme definition
const ayuLightTheme: editor.IStandaloneThemeData = {
	base: 'vs',
	inherit: false,
	rules: [
		// Base
		{ token: '', foreground: '5c6166', background: 'fafafa' },

		// Comments
		{ token: 'comment', foreground: '787b80', fontStyle: 'italic' },
		{ token: 'comment.js', foreground: '787b80', fontStyle: 'italic' },
		{ token: 'comment.line', foreground: '787b80', fontStyle: 'italic' },
		{ token: 'comment.block', foreground: '787b80', fontStyle: 'italic' },

		// Strings
		{ token: 'string', foreground: '86b300' },
		{ token: 'string.js', foreground: '86b300' },
		{ token: 'string.quoted', foreground: '86b300' },
		{ token: 'string.template', foreground: '86b300' },

		// Numbers
		{ token: 'number', foreground: 'a37acc' },
		{ token: 'number.js', foreground: 'a37acc' },
		{ token: 'constant.numeric', foreground: 'a37acc' },

		// Keywords
		{ token: 'keyword', foreground: 'fa8d3e' },
		{ token: 'keyword.js', foreground: 'fa8d3e' },
		{ token: 'keyword.control', foreground: 'fa8d3e' },
		{ token: 'keyword.operator', foreground: 'ed9366' },
		{ token: 'keyword.other', foreground: 'fa8d3e' },
		{ token: 'storage', foreground: 'fa8d3e' },
		{ token: 'storage.type', foreground: 'fa8d3e' },

		// Operators
		{ token: 'operator', foreground: 'ed9366' },
		{ token: 'delimiter', foreground: '5c616680' },
		{ token: 'delimiter.bracket', foreground: '5c616680' },
		{ token: 'delimiter.parenthesis', foreground: '5c616680' },

		// Functions
		{ token: 'entity.name.function', foreground: 'f2ae49' },
		{ token: 'support.function', foreground: 'f2ae49' },
		{ token: 'function', foreground: 'f2ae49' },
		{ token: 'identifier.js', foreground: '5c6166' },

		// Variables & Identifiers
		{ token: 'variable', foreground: '5c6166' },
		{ token: 'variable.parameter', foreground: 'a37acc' },
		{ token: 'variable.other', foreground: '5c6166' },
		{ token: 'identifier', foreground: '5c6166' },

		// Constants
		{ token: 'constant', foreground: 'a37acc' },
		{ token: 'constant.language', foreground: 'a37acc' },
		{ token: 'constant.language.boolean', foreground: 'a37acc' },
		{ token: 'constant.language.null', foreground: 'a37acc' },
		{ token: 'constant.language.undefined', foreground: 'a37acc' },

		// Types & Classes
		{ token: 'type', foreground: '399ee6' },
		{ token: 'type.identifier', foreground: '399ee6' },
		{ token: 'entity.name.type', foreground: '399ee6' },
		{ token: 'entity.name.class', foreground: '399ee6' },
		{ token: 'class', foreground: '399ee6' },
		{ token: 'interface', foreground: '399ee6' },
		{ token: 'support.class', foreground: '399ee6' },
		{ token: 'support.type', foreground: '399ee6' },

		// HTML/JSX Tags
		{ token: 'tag', foreground: '55b4d4' },
		{ token: 'tag.js', foreground: '55b4d4' },
		{ token: 'metatag', foreground: '55b4d4' },
		{ token: 'attribute.name', foreground: 'f2ae49' },
		{ token: 'attribute.value', foreground: '86b300' },

		// Regex
		{ token: 'regexp', foreground: '4cbf99' },
		{ token: 'string.regexp', foreground: '4cbf99' },

		// Special
		{ token: 'meta.brace', foreground: '5c616680' },
		{ token: 'punctuation', foreground: '5c616680' },
	],
	colors: {
		'editor.background': '#fafafa',
		'editor.foreground': '#5c6166',
		'editor.lineHighlightBackground': '#f0f0f0',
		'editor.lineHighlightBorder': '#f0f0f0',
		'editor.selectionBackground': '#d1e4f4',
		'editor.inactiveSelectionBackground': '#e8e8e8',
		'editorLineNumber.foreground': '#9199a1',
		'editorLineNumber.activeForeground': '#5c6166',
		'editorCursor.foreground': '#ff9940',
		'editorWhitespace.foreground': '#d9d9d9',
		'editorIndentGuide.background': '#e8e8e8',
		'editorIndentGuide.activeBackground': '#d0d0d0',
		'editorGutter.background': '#f3f3f3',
		'editorWidget.background': '#fafafa',
		'editorWidget.border': '#e0e0e0',
		'editorSuggestWidget.background': '#fafafa',
		'editorSuggestWidget.border': '#e0e0e0',
		'editorSuggestWidget.selectedBackground': '#d1e4f4',
		'editorHoverWidget.background': '#fafafa',
		'editorHoverWidget.border': '#e0e0e0',
		'input.background': '#ffffff',
		'input.border': '#e0e0e0',
		focusBorder: '#ff994033',
		'list.activeSelectionBackground': '#d1e4f4',
		'list.hoverBackground': '#e8e8e8',
		'scrollbarSlider.background': '#9199a133',
		'scrollbarSlider.hoverBackground': '#9199a155',
		'scrollbarSlider.activeBackground': '#9199a177',
	},
}

// Ayu Mirage Bordered theme definition
const ayuMirageTheme: editor.IStandaloneThemeData = {
	base: 'vs-dark',
	inherit: false,
	rules: [
		// Base
		{ token: '', foreground: 'cbccc6', background: '1f2430' },

		// Comments
		{ token: 'comment', foreground: '5c6773', fontStyle: 'italic' },
		{ token: 'comment.js', foreground: '5c6773', fontStyle: 'italic' },
		{ token: 'comment.line', foreground: '5c6773', fontStyle: 'italic' },
		{ token: 'comment.block', foreground: '5c6773', fontStyle: 'italic' },

		// Strings
		{ token: 'string', foreground: 'bae67e' },
		{ token: 'string.js', foreground: 'bae67e' },
		{ token: 'string.quoted', foreground: 'bae67e' },
		{ token: 'string.template', foreground: 'bae67e' },

		// Numbers
		{ token: 'number', foreground: 'ffcc66' },
		{ token: 'number.js', foreground: 'ffcc66' },
		{ token: 'constant.numeric', foreground: 'ffcc66' },

		// Keywords
		{ token: 'keyword', foreground: 'ffa759' },
		{ token: 'keyword.js', foreground: 'ffa759' },
		{ token: 'keyword.control', foreground: 'ffa759' },
		{ token: 'keyword.operator', foreground: 'f29e74' },
		{ token: 'keyword.other', foreground: 'ffa759' },
		{ token: 'storage', foreground: 'ffa759' },
		{ token: 'storage.type', foreground: 'ffa759' },

		// Operators
		{ token: 'operator', foreground: 'f29e74' },
		{ token: 'delimiter', foreground: 'cbccc6b3' },
		{ token: 'delimiter.bracket', foreground: 'cbccc6b3' },
		{ token: 'delimiter.parenthesis', foreground: 'cbccc6b3' },

		// Functions
		{ token: 'entity.name.function', foreground: 'ffd580' },
		{ token: 'support.function', foreground: 'ffd580' },
		{ token: 'function', foreground: 'ffd580' },
		{ token: 'identifier.js', foreground: 'cbccc6' },

		// Variables & Identifiers
		{ token: 'variable', foreground: 'cbccc6' },
		{ token: 'variable.parameter', foreground: 'd4bfff' },
		{ token: 'variable.other', foreground: 'cbccc6' },
		{ token: 'identifier', foreground: 'cbccc6' },

		// Constants
		{ token: 'constant', foreground: 'ffcc66' },
		{ token: 'constant.language', foreground: 'ffcc66' },
		{ token: 'constant.language.boolean', foreground: 'ffcc66' },
		{ token: 'constant.language.null', foreground: 'ffcc66' },
		{ token: 'constant.language.undefined', foreground: 'ffcc66' },

		// Types & Classes
		{ token: 'type', foreground: '73d0ff' },
		{ token: 'type.identifier', foreground: '73d0ff' },
		{ token: 'entity.name.type', foreground: '73d0ff' },
		{ token: 'entity.name.class', foreground: '73d0ff' },
		{ token: 'class', foreground: '73d0ff' },
		{ token: 'interface', foreground: '73d0ff' },
		{ token: 'support.class', foreground: '73d0ff' },
		{ token: 'support.type', foreground: '73d0ff' },

		// HTML/JSX Tags
		{ token: 'tag', foreground: '5ccfe6' },
		{ token: 'tag.js', foreground: '5ccfe6' },
		{ token: 'metatag', foreground: '5ccfe6' },
		{ token: 'attribute.name', foreground: 'ffd580' },
		{ token: 'attribute.value', foreground: 'bae67e' },

		// Regex
		{ token: 'regexp', foreground: '95e6cb' },
		{ token: 'string.regexp', foreground: '95e6cb' },

		// Special
		{ token: 'meta.brace', foreground: 'cbccc6b3' },
		{ token: 'punctuation', foreground: 'cbccc6b3' },
	],
	colors: {
		'editor.background': '#1f2430',
		'editor.foreground': '#cbccc6',
		'editor.lineHighlightBackground': '#191e2a',
		'editor.lineHighlightBorder': '#191e2a',
		'editor.selectionBackground': '#34455a',
		'editor.inactiveSelectionBackground': '#2d3b4d',
		'editorLineNumber.foreground': '#707a8c',
		'editorLineNumber.activeForeground': '#cbccc6',
		'editorCursor.foreground': '#ffcc66',
		'editorWhitespace.foreground': '#3e4b59',
		'editorIndentGuide.background': '#3e4b59',
		'editorIndentGuide.activeBackground': '#5c6773',
		'editorGutter.background': '#1a1f29',
		'editorWidget.background': '#1f2430',
		'editorWidget.border': '#101521',
		'editorSuggestWidget.background': '#1f2430',
		'editorSuggestWidget.border': '#101521',
		'editorSuggestWidget.selectedBackground': '#34455a',
		'editorHoverWidget.background': '#1f2430',
		'editorHoverWidget.border': '#101521',
		'input.background': '#1a1f29',
		'input.border': '#101521',
		focusBorder: '#ffcc6633',
		'list.activeSelectionBackground': '#34455a',
		'list.hoverBackground': '#2d3b4d',
		'scrollbarSlider.background': '#707a8c33',
		'scrollbarSlider.hoverBackground': '#707a8c55',
		'scrollbarSlider.activeBackground': '#707a8c77',
	},
}

/**
 * Code editor panel with Monaco editor, TypeScript intellisense, and inline error display.
 * Persists code to localStorage between sessions.
 */
export function CodeEditor({
	onRun,
	onClear,
	isExecuting,
	generatedShapeCount,
	error,
	onDismissError,
	isDarkTheme,
	onThemeToggle,
}: CodeEditorProps) {
	// Load code from localStorage or use default
	const [code, setCode] = useState(() => {
		try {
			return localStorage.getItem(STORAGE_KEY) || defaultCode
		} catch {
			return defaultCode
		}
	})

	// Load live mode preference from localStorage, default to off
	const [isLiveMode, setIsLiveMode] = useState(() => {
		try {
			return localStorage.getItem(LIVE_MODE_STORAGE_KEY) === 'true'
		} catch {
			return false
		}
	})

	// Track which example is selected (null if user has edited code)
	const [selectedExample, setSelectedExample] = useState<string | null>(() => {
		try {
			return localStorage.getItem(SELECTED_EXAMPLE_STORAGE_KEY)
		} catch {
			return 'Basic shapes'
		}
	})

	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
	const monacoRef = useRef<Monaco | null>(null)
	const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null)
	const onRunRef = useRef(onRun)
	onRunRef.current = onRun
	const isLiveModeRef = useRef(isLiveMode)
	isLiveModeRef.current = isLiveMode
	const isExecutingRef = useRef(isExecuting)
	isExecutingRef.current = isExecuting
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const lastExecutedCodeRef = useRef<string | null>(null)

	// Save code to localStorage when it changes
	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, code)
		} catch (error) {
			console.warn('Failed to save code to localStorage:', error)
		}
	}, [code])

	// Live mode: auto-run code when it changes and compiles without errors
	useEffect(() => {
		if (!isLiveMode) return

		// Clear any pending debounce timer
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current)
		}

		debounceTimerRef.current = setTimeout(() => {
			if (!isLiveModeRef.current || !editorRef.current || !monacoRef.current) return
			if (isExecutingRef.current) return

			const model = editorRef.current.getModel()
			if (!model) return

			const currentCode = editorRef.current.getValue()

			// Skip if we already executed this exact code
			if (currentCode === lastExecutedCodeRef.current) return

			// Get TypeScript diagnostics
			const markers = monacoRef.current.editor.getModelMarkers({ resource: model.uri })
			const hasErrors = markers.some((m) => m.severity === monacoRef.current!.MarkerSeverity.Error)

			// Only run if no TypeScript errors
			if (!hasErrors) {
				lastExecutedCodeRef.current = currentCode
				onRunRef.current(currentCode)
			} else {
				// Clear so fixing code back to previous valid state will still run
				lastExecutedCodeRef.current = null
			}
		}, DEBOUNCE_MS)

		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current)
			}
		}
	}, [code, isLiveMode])

	// Update error decorations when error changes
	useEffect(() => {
		if (!editorRef.current || !monacoRef.current) return

		const monaco = monacoRef.current
		const ed = editorRef.current
		const model = ed.getModel()
		if (!model) return

		// Clear previous decorations
		if (decorationsRef.current) {
			decorationsRef.current.clear()
		}

		// Clear previous markers
		monaco.editor.setModelMarkers(model, 'code-executor', [])

		if (error && error.line) {
			// Add error marker for the problems panel / squiggly line
			monaco.editor.setModelMarkers(model, 'code-executor', [
				{
					startLineNumber: error.line,
					startColumn: error.column || 1,
					endLineNumber: error.line,
					endColumn: model.getLineMaxColumn(error.line),
					message: error.message,
					severity: monaco.MarkerSeverity.Error,
				},
			])

			// Add line decoration (highlight the entire line)
			decorationsRef.current = ed.createDecorationsCollection([
				{
					range: new monaco.Range(error.line, 1, error.line, 1),
					options: {
						isWholeLine: true,
						className: 'error-line-highlight',
						glyphMarginClassName: 'error-glyph-margin',
					},
				},
			])

			// Reveal the error line
			ed.revealLineInCenter(error.line)
		}
	}, [error])

	const handleBeforeMount: BeforeMount = useCallback((monaco) => {
		// Define both themes before editor mounts
		monaco.editor.defineTheme('ayu-mirage', ayuMirageTheme)
		monaco.editor.defineTheme('ayu-light', ayuLightTheme)
	}, [])

	const handleThemeToggle = useCallback(() => {
		onThemeToggle()
		if (monacoRef.current) {
			// Toggle to the opposite theme (since isDarkTheme will change after onThemeToggle)
			monacoRef.current.editor.setTheme(isDarkTheme ? 'ayu-light' : 'ayu-mirage')
		}
	}, [isDarkTheme, onThemeToggle])

	const toggleLiveMode = useCallback(() => {
		const newIsLive = !isLiveMode
		setIsLiveMode(newIsLive)
		try {
			localStorage.setItem(LIVE_MODE_STORAGE_KEY, String(newIsLive))
		} catch {
			// Ignore storage errors
		}
	}, [isLiveMode])

	const handleEditorMount: OnMount = useCallback((ed, monaco) => {
		editorRef.current = ed
		monacoRef.current = monaco

		// Configure TypeScript defaults for good intellisense with our custom types
		monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
			noSemanticValidation: false,
			noSyntaxValidation: false,
		})

		monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
			target: monaco.languages.typescript.ScriptTarget.ESNext,
			allowNonTsExtensions: true,
			noEmit: true,
			strict: false,
			noImplicitAny: false,
			strictNullChecks: false,
		})

		// Add our custom type definitions for the editor and api objects
		monaco.languages.typescript.typescriptDefaults.addExtraLib(
			editorTypeDefinitions,
			'ts:editor-api.d.ts'
		)

		// Add keyboard shortcut for running code (Cmd/Ctrl+Enter)
		ed.onKeyDown((e) => {
			if ((e.metaKey || e.ctrlKey) && e.keyCode === monaco.KeyCode.Enter) {
				e.preventDefault()
				e.stopPropagation()
				const currentCode = ed.getValue()
				onRunRef.current(currentCode)
			}
		})

		// Focus the editor
		ed.focus()
	}, [])

	const handleEditorChange = useCallback(
		(value: string | undefined) => {
			setCode(value || '')
			// Clear error when code changes
			onDismissError()
		},
		[onDismissError]
	)

	const handleLoadExample = (name: string, exampleCode: string) => {
		setSelectedExample(name)
		setCode(exampleCode)
		try {
			localStorage.setItem(SELECTED_EXAMPLE_STORAGE_KEY, name)
		} catch {
			// Ignore storage errors
		}
		if (editorRef.current) {
			editorRef.current.setValue(exampleCode)
			editorRef.current.focus()
		}
	}

	return (
		<div
			className={`code-panel ${isDarkTheme ? 'theme-dark' : 'theme-light'}`}
			onKeyDown={(e) => e.stopPropagation()}
			onKeyUp={(e) => e.stopPropagation()}
		>
			<Toolbar
				onRun={() => onRun(code)}
				onClear={onClear}
				onLoadExample={handleLoadExample}
				isExecuting={isExecuting}
				isLiveMode={isLiveMode}
				generatedShapeCount={generatedShapeCount}
				selectedExample={selectedExample}
			>
				<button
					className={`toolbar-button live-toggle ${isLiveMode ? 'active' : ''}`}
					onClick={toggleLiveMode}
					aria-label={isLiveMode ? 'Disable live mode' : 'Enable live mode'}
					title={isLiveMode ? 'Live mode on (auto-runs on valid changes)' : 'Live mode off'}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
						<path d="M8 5v14l11-7z" />
					</svg>
				</button>
				<button
					className="toolbar-button theme-toggle"
					onClick={handleThemeToggle}
					aria-label={isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
				>
					{isDarkTheme ? (
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<circle cx="12" cy="12" r="5" />
							<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
						</svg>
					) : (
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
						</svg>
					)}
				</button>
			</Toolbar>

			<div className="code-editor-wrapper">
				<Editor
					height="100%"
					defaultLanguage="typescript"
					value={code}
					onChange={handleEditorChange}
					beforeMount={handleBeforeMount}
					onMount={handleEditorMount}
					theme={isDarkTheme ? 'ayu-mirage' : 'ayu-light'}
					options={{
						fontSize: 14,
						fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
						lineHeight: 1.5,
						minimap: { enabled: false },
						scrollBeyondLastLine: false,
						automaticLayout: true,
						tabSize: 2,
						wordWrap: 'on',
						padding: { top: 0 },
						glyphMargin: false,
						folding: false,
						lineNumbers: 'on',
						lineNumbersMinChars: 1,
						lineDecorationsWidth: 20,
						renderLineHighlight: 'line',
						suggestOnTriggerCharacters: true,
						quickSuggestions: true,
						parameterHints: { enabled: true },
						formatOnPaste: true,
						formatOnType: true,
						fixedOverflowWidgets: true,
					}}
				/>
			</div>

			{error && (
				<div className="error-panel">
					<div className="error-panel-header">
						<span className="error-panel-title">Error</span>
						<button className="error-dismiss" onClick={onDismissError} aria-label="Dismiss error">
							×
						</button>
					</div>
					<div className="error-panel-content">
						<div className="error-message">
							{error.line && <span className="error-location">Line {error.line}: </span>}
							{error.message}
						</div>
						{error.stack && (
							<details className="error-stack-details">
								<summary>Stack trace</summary>
								<pre className="error-stack">{error.stack}</pre>
							</details>
						)}
					</div>
				</div>
			)}
		</div>
	)
}
