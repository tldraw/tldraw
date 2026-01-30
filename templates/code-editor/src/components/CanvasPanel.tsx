import { useEffect, useState } from 'react'
import {
	Editor,
	Tldraw,
	TLErrorFallbackComponent,
	TLHandlesProps,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { BezierCurveShapeUtil } from '../lib/CubicBezierShape'
import { WatercolorShapeUtil } from '../lib/WatercolorShape'

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

const customShapeUtils = [BezierCurveShapeUtil, WatercolorShapeUtil]

/**
 * Auto-recovering error fallback that clears bad state and remounts.
 */
function RecoveringErrorFallback({ error }: { error: unknown; editor?: Editor }) {
	useEffect(() => {
		console.error('Tldraw error, auto-recovering:', error)

		// Clear persisted state that may contain invalid data
		try {
			const keysToRemove: string[] = []
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i)
				if (key?.startsWith('TLDRAW_DOCUMENT_v2code-editor')) {
					keysToRemove.push(key)
				}
			}
			keysToRemove.forEach((key) => localStorage.removeItem(key))
		} catch {
			// Ignore storage errors
		}

		// Trigger recovery
		window.dispatchEvent(new CustomEvent('tldraw-recover'))
	}, [error])

	return (
		<div
			className="canvas-panel"
			style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
		>
			<span style={{ color: '#666' }}>Recovering...</span>
		</div>
	)
}

/**
 * Canvas panel component that wraps the tldraw editor.
 * Configures the editor on mount to mark generated shapes.
 */
export function CanvasPanel({ onMount }: CanvasPanelProps) {
	const [key, setKey] = useState(0)

	useEffect(() => {
		const handleRecover = () => setKey((k) => k + 1)
		window.addEventListener('tldraw-recover', handleRecover)
		return () => window.removeEventListener('tldraw-recover', handleRecover)
	}, [])

	return (
		<div className="canvas-panel">
			<Tldraw
				key={key}
				persistenceKey="code-editor"
				onMount={onMount}
				shapeUtils={customShapeUtils}
				components={{
					Handles: CustomHandles,
					ErrorFallback: RecoveringErrorFallback as TLErrorFallbackComponent,
				}}
			/>
		</div>
	)
}
