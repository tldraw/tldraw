import { useCallback, useRef, useState } from 'react'
import { Editor, Tldraw, Vec } from 'tldraw'
import 'tldraw/tldraw.css'
import { convertCodeToShapes } from './utils/convertCodeToShapes'
import { convertShapesToCode } from './utils/convertShapesToCode'

const DEFAULT_CODE = `flowchart TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[Car]`

export default function App() {
	const [code, setCode] = useState(DEFAULT_CODE)
	const [loading, setLoading] = useState<'to-diagram' | 'to-code' | null>(null)
	const [error, setError] = useState<string | null>(null)
	const editorRef = useRef<Editor | null>(null)

	const handleCodeToDiagram = useCallback(async () => {
		const editor = editorRef.current
		if (!editor || loading) return
		setLoading('to-diagram')
		setError(null)
		try {
			const allShapeIds = Array.from(editor.getCurrentPageShapeIds())
			if (allShapeIds.length > 0) editor.deleteShapes(allShapeIds)
			await convertCodeToShapes(editor, code, new Vec(0, 0))
			editor.zoomToFit({ animation: { duration: 300 } })
		} catch (err: any) {
			setError(err?.message ?? 'Failed to convert code to diagram')
		} finally {
			setLoading(null)
		}
	}, [code, loading])

	const handleDiagramToCode = useCallback(async () => {
		const editor = editorRef.current
		if (!editor || loading) return
		const allShapeIds = Array.from(editor.getCurrentPageShapeIds())
		if (allShapeIds.length === 0) {
			setError('No shapes on the canvas to convert')
			return
		}
		setLoading('to-code')
		setError(null)
		try {
			const result = await convertShapesToCode(editor, allShapeIds)
			setCode(result.code)
		} catch (err: any) {
			setError(err?.message ?? 'Failed to convert diagram to code')
		} finally {
			setLoading(null)
		}
	}, [loading])

	return (
		<div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'sans-serif' }}>
			{/* Left panel — code editor */}
			<div
				style={{
					width: '50%',
					display: 'flex',
					flexDirection: 'column',
					background: '#1e1e2e',
					color: '#cdd6f4',
				}}
			>
				<div
					style={{
						padding: '12px 16px',
						borderBottom: '1px solid #313244',
						fontSize: 13,
						fontWeight: 600,
						color: '#89b4fa',
						letterSpacing: '0.02em',
					}}
				>
					Mermaid
				</div>

				<textarea
					value={code}
					onChange={(e) => setCode(e.target.value)}
					spellCheck={false}
					style={{
						flex: 1,
						padding: '16px',
						fontFamily: '"Fira Code", "Cascadia Code", monospace',
						fontSize: 13,
						lineHeight: 1.6,
						background: 'transparent',
						color: '#cdd6f4',
						border: 'none',
						outline: 'none',
						resize: 'none',
						tabSize: 4,
					}}
				/>

				{error && (
					<div
						style={{
							padding: '8px 16px',
							background: '#45293b',
							color: '#f38ba8',
							fontSize: 12,
							borderTop: '1px solid #313244',
						}}
					>
						{error}
					</div>
				)}

				<div
					style={{
						padding: '12px 16px',
						borderTop: '1px solid #313244',
						display: 'flex',
						justifyContent: 'flex-end',
					}}
				>
					<button
						onClick={handleCodeToDiagram}
						disabled={loading !== null}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 6,
							padding: '8px 16px',
							background: loading === 'to-diagram' ? '#313244' : '#89b4fa',
							color: loading === 'to-diagram' ? '#6c7086' : '#1e1e2e',
							border: 'none',
							borderRadius: 6,
							fontSize: 13,
							fontWeight: 600,
							cursor: loading !== null ? 'not-allowed' : 'pointer',
							transition: 'background 0.15s',
						}}
					>
						{loading === 'to-diagram' ? '...' : '▶'}
						{loading === 'to-diagram' ? 'Converting' : 'To diagram'}
					</button>
				</div>
			</div>

			{/* Divider */}
			<div style={{ width: 1, background: '#313244', flexShrink: 0 }} />

			{/* Right panel — tldraw canvas */}
			<div style={{ flex: 1, position: 'relative' }}>
				<Tldraw
					onMount={(editor) => {
						editorRef.current = editor
						editor.updateInstanceState({ isDebugMode: false })
					}}
					persistenceKey={undefined}
				/>

				{/* "To code" button overlaid on canvas */}
				<div
					style={{
						position: 'absolute',
						bottom: 16,
						right: 16,
						zIndex: 500,
					}}
				>
					<button
						onClick={handleDiagramToCode}
						disabled={loading !== null}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 6,
							padding: '8px 16px',
							background: loading === 'to-code' ? '#e5e5e5' : '#1e1e2e',
							color: loading === 'to-code' ? '#999' : '#cdd6f4',
							border: '1px solid #313244',
							borderRadius: 6,
							fontSize: 13,
							fontWeight: 600,
							cursor: loading !== null ? 'not-allowed' : 'pointer',
							boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
							transition: 'background 0.15s',
						}}
					>
						{loading === 'to-code' ? 'Converting...' : '◀ To code'}
					</button>
				</div>
			</div>
		</div>
	)
}
