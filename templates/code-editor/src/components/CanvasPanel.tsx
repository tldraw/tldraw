import { Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

interface CanvasPanelProps {
	onMount: (editor: Editor) => void
}

/**
 * Canvas panel component that wraps the tldraw editor.
 * Configures the editor on mount to mark generated shapes.
 */
export function CanvasPanel({ onMount }: CanvasPanelProps) {
	return (
		<div className="canvas-panel">
			<Tldraw persistenceKey="code-editor" onMount={onMount} />
		</div>
	)
}
