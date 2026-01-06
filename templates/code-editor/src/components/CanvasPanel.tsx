import { Editor, Tldraw, TLHandlesProps, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import { BezierCurveShapeUtil } from '../lib/CubicBezierShape'

interface CanvasPanelProps {
	onMount: (editor: Editor) => void
}

/**
 * Custom handles component that shows bezier curve handles when editing.
 */
function CustomHandles({ children }: TLHandlesProps) {
	const editor = useEditor()

	const shouldDisplayDefaultHandles = useValue(
		'shouldDisplayDefaultHandles',
		() => {
			// bezier curve handles
			const onlySelectedShape = editor.getOnlySelectedShape()
			if (onlySelectedShape && editor.isShapeOfType(onlySelectedShape, 'bezier-curve')) {
				return editor.isInAny(
					'select.editing_shape',
					'select.pointing_handle',
					'select.dragging_handle'
				)
			}

			// default handle behavior
			if (editor.isInAny('select.idle', 'select.pointing_handle', 'select.pointing_shape')) {
				return true
			}
			if (editor.isInAny('select.editing_shape')) {
				const onlySelectedShape = editor.getOnlySelectedShape()
				if (!onlySelectedShape) return false
				return onlySelectedShape && editor.isShapeOfType(onlySelectedShape, 'note')
			}
			return false
		},
		[editor]
	)

	if (!shouldDisplayDefaultHandles) return null

	return (
		<svg className="tl-user-handles tl-overlays__item" aria-hidden="true">
			{children}
		</svg>
	)
}

const customShapeUtils = [BezierCurveShapeUtil]

/**
 * Canvas panel component that wraps the tldraw editor.
 * Configures the editor on mount to mark generated shapes.
 */
export function CanvasPanel({ onMount }: CanvasPanelProps) {
	return (
		<div className="canvas-panel">
			<Tldraw
				persistenceKey="code-editor"
				onMount={onMount}
				shapeUtils={customShapeUtils}
				components={{
					Handles: CustomHandles,
				}}
			/>
		</div>
	)
}
