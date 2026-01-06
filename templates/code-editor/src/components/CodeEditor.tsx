import Editor, { Monaco, OnMount } from '@monaco-editor/react'
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
}

const STORAGE_KEY = 'code-editor-code'

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
}: CodeEditorProps) {
	// Load code from localStorage or use default
	const [code, setCode] = useState(() => {
		try {
			return localStorage.getItem(STORAGE_KEY) || defaultCode
		} catch {
			return defaultCode
		}
	})

	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
	const monacoRef = useRef<Monaco | null>(null)
	const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null)

	// Save code to localStorage when it changes
	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, code)
		} catch (error) {
			console.warn('Failed to save code to localStorage:', error)
		}
	}, [code])

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

	const handleEditorMount: OnMount = useCallback(
		(ed, monaco) => {
			editorRef.current = ed
			monacoRef.current = monaco

			// Configure JavaScript/TypeScript defaults for better intellisense
			monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
				noSemanticValidation: false,
				noSyntaxValidation: false,
			})

			monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
				target: monaco.languages.typescript.ScriptTarget.ESNext,
				allowNonTsExtensions: true,
				moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
				module: monaco.languages.typescript.ModuleKind.ESNext,
				noEmit: true,
				lib: ['esnext'],
			})

			// Add our custom type definitions for the editor and api objects
			monaco.languages.typescript.javascriptDefaults.addExtraLib(
				editorTypeDefinitions,
				'ts:editor-api.d.ts'
			)

			// Add keyboard shortcut for running code
			ed.addAction({
				id: 'run-code',
				label: 'Run Code',
				keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
				run: () => {
					const currentCode = ed.getValue()
					onRun(currentCode)
				},
			})

			// Focus the editor
			ed.focus()
		},
		[onRun]
	)

	const handleEditorChange = useCallback(
		(value: string | undefined) => {
			setCode(value || '')
			// Clear error when code changes
			onDismissError()
		},
		[onDismissError]
	)

	const handleLoadExample = (exampleCode: string) => {
		setCode(exampleCode)
		if (editorRef.current) {
			editorRef.current.setValue(exampleCode)
			editorRef.current.focus()
		}
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

			<div className="code-editor-wrapper">
				<Editor
					height="100%"
					defaultLanguage="javascript"
					value={code}
					onChange={handleEditorChange}
					onMount={handleEditorMount}
					theme="vs-dark"
					options={{
						fontSize: 14,
						fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
						lineHeight: 1.5,
						minimap: { enabled: false },
						scrollBeyondLastLine: false,
						automaticLayout: true,
						tabSize: 2,
						wordWrap: 'on',
						padding: { top: 16 },
						glyphMargin: true,
						folding: true,
						lineNumbers: 'on',
						renderLineHighlight: 'line',
						suggestOnTriggerCharacters: true,
						quickSuggestions: true,
						parameterHints: { enabled: true },
						formatOnPaste: true,
						formatOnType: true,
					}}
				/>
			</div>
		</div>
	)
}
