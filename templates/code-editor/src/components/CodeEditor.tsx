import Editor, { BeforeMount, Monaco, OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { JsonObject, Editor as TldrawEditor, useValue } from 'tldraw'
import { ExecutionError } from '../lib/code-executor'
import { editorTypeDefinitions } from '../lib/editor-types'
import { defaultCode, examplesRecord } from '../lib/examples/index'
import { ExamplesSidebar } from './ExamplesSidebar'
import { darkTheme, lightTheme } from './themes'
import { Toolbar } from './Toolbar'

interface CodeEditorProps {
	editor: TldrawEditor | null
	onRun: (code: string) => Promise<void>
	onClear: () => void
	isExecuting: boolean
	generatedShapeCount: number
	error: ExecutionError | null
	onDismissError: () => void
	isDarkTheme: boolean
	onThemeToggle: () => void
}

const DEBOUNCE_MS = 500

/**
 * Code editor panel with Monaco editor and TypeScript intellisense.
 * State is persisted via tldraw's document meta (uses persistenceKey).
 */
export function CodeEditor({
	editor,
	onRun,
	onClear,
	isExecuting,
	generatedShapeCount,
	error,
	onDismissError,
	isDarkTheme,
	onThemeToggle,
}: CodeEditorProps) {
	// Read code from document meta (reactive via useValue)
	const code = useValue(
		'code',
		() => (editor?.getDocumentSettings().meta?.code as string) ?? defaultCode,
		[editor]
	)

	// Read live mode preference from document meta
	const isLiveMode = useValue(
		'isLiveMode',
		() => (editor?.getDocumentSettings().meta?.isLiveMode as boolean) ?? false,
		[editor]
	)

	// Derive selected example by matching code against known examples
	const selectedExample = useMemo(() => {
		for (const [name, exampleCode] of Object.entries(examplesRecord)) {
			if (code === exampleCode) return name
		}
		return null
	}, [code])

	// Helper to update document meta
	const updateMeta = useCallback(
		(updates: Partial<JsonObject>) => {
			if (!editor) return
			editor.updateDocumentSettings({
				meta: { ...editor.getDocumentSettings().meta, ...updates },
			})
		},
		[editor]
	)

	const monacoEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
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

	// Live mode: auto-run code after debounce if it compiles without errors
	useEffect(() => {
		if (!isLiveMode) return

		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current)
		}

		debounceTimerRef.current = setTimeout(() => {
			if (!isLiveModeRef.current || !monacoEditorRef.current || !monacoRef.current) return
			if (isExecutingRef.current) return

			const model = monacoEditorRef.current.getModel()
			if (!model) return

			const currentCode = monacoEditorRef.current.getValue()
			if (currentCode === lastExecutedCodeRef.current) return

			const markers = monacoRef.current.editor.getModelMarkers({ resource: model.uri })
			const hasErrors = markers.some((m) => m.severity === monacoRef.current!.MarkerSeverity.Error)

			if (!hasErrors) {
				lastExecutedCodeRef.current = currentCode
				onRunRef.current(currentCode)
			} else {
				lastExecutedCodeRef.current = null
			}
		}, DEBOUNCE_MS)

		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current)
			}
		}
	}, [code, isLiveMode])

	// Show error decorations in Monaco editor
	useEffect(() => {
		if (!monacoEditorRef.current || !monacoRef.current) return

		const monaco = monacoRef.current
		const ed = monacoEditorRef.current
		const model = ed.getModel()
		if (!model) return

		if (decorationsRef.current) {
			decorationsRef.current.clear()
		}
		monaco.editor.setModelMarkers(model, 'code-executor', [])

		if (error?.line) {
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

			ed.revealLineInCenter(error.line)
		}
	}, [error])

	const handleBeforeMount: BeforeMount = useCallback((monaco) => {
		monaco.editor.defineTheme('dark', darkTheme)
		monaco.editor.defineTheme('light', lightTheme)
	}, [])

	const handleThemeToggle = useCallback(() => {
		onThemeToggle()
		if (monacoRef.current) {
			monacoRef.current.editor.setTheme(isDarkTheme ? 'light' : 'dark')
		}
	}, [isDarkTheme, onThemeToggle])

	const toggleLiveMode = useCallback(() => {
		updateMeta({ isLiveMode: !isLiveMode })
	}, [isLiveMode, updateMeta])

	const handleEditorMount: OnMount = useCallback((ed, monaco) => {
		monacoEditorRef.current = ed
		monacoRef.current = monaco

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

		monaco.languages.typescript.typescriptDefaults.addExtraLib(
			editorTypeDefinitions,
			'ts:editor-api.d.ts'
		)

		// Cmd/Ctrl+Enter runs code
		ed.onKeyDown((e) => {
			if ((e.metaKey || e.ctrlKey) && e.keyCode === monaco.KeyCode.Enter) {
				e.preventDefault()
				e.stopPropagation()
				onRunRef.current(ed.getValue())
			}
		})

		ed.focus()
	}, [])

	const handleEditorChange = useCallback(
		(value: string | undefined) => {
			updateMeta({ code: value || '' })
			onDismissError()
		},
		[updateMeta, onDismissError]
	)

	const handleLoadExample = useCallback(
		(_name: string, exampleCode: string) => {
			updateMeta({ code: exampleCode })
			if (monacoEditorRef.current) {
				monacoEditorRef.current.setValue(exampleCode)
				monacoEditorRef.current.focus()
			}
			// Auto-run the new example
			onRun(exampleCode)
		},
		[updateMeta, onRun]
	)

	return (
		<div
			className={`code-panel ${isDarkTheme ? 'theme-dark' : 'theme-light'}`}
			onKeyDown={(e) => e.stopPropagation()}
			onKeyUp={(e) => e.stopPropagation()}
		>
			<Toolbar onRun={() => onRun(code)} isExecuting={isExecuting} isLiveMode={isLiveMode}>
				<button
					className={`toolbar-button live-toggle ${isLiveMode ? 'active' : ''}`}
					onClick={toggleLiveMode}
					aria-label={isLiveMode ? 'Disable live mode' : 'Enable live mode'}
					title={isLiveMode ? 'Live mode on (auto-runs on valid changes)' : 'Live mode off'}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
						<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
					</svg>
				</button>
				<button
					className="toolbar-button clear-button"
					onClick={onClear}
					disabled={generatedShapeCount === 0}
					title={`Clear generated shapes (${generatedShapeCount} shapes)`}
				>
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
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

			<div className="code-panel-main">
				<ExamplesSidebar onLoadExample={handleLoadExample} selectedExample={selectedExample} />

				<div className="code-editor-wrapper">
					<Editor
						height="100%"
						defaultLanguage="typescript"
						value={code}
						onChange={handleEditorChange}
						beforeMount={handleBeforeMount}
						onMount={handleEditorMount}
						theme={isDarkTheme ? 'dark' : 'light'}
						options={{
							fontSize: 13,
							fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
							lineHeight: 1.5,
							minimap: { enabled: false },
							scrollBeyondLastLine: false,
							automaticLayout: true,
							tabSize: 2,
							wordWrap: 'on',
							padding: { top: 8 },
							glyphMargin: false,
							folding: false,
							lineNumbers: 'on',
							lineNumbersMinChars: 1,
							lineDecorationsWidth: 12,
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
