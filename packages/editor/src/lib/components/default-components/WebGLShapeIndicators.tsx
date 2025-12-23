import { useValue } from '@tldraw/state-react'
import { TLShapeId } from '@tldraw/tlschema'
import { memo, useEffect, useLayoutEffect, useRef } from 'react'
import { useEditor } from '../../hooks/useEditor'
import { IndicatorConfig, WebGLIndicatorManager } from './WebGLIndicatorManager'

/** @public */
export interface TLWebGLShapeIndicatorsProps {
	/** Whether to hide all of the indicators */
	hideAll?: boolean
	/** Whether to show all of the indicators */
	showAll?: boolean
}

// Default indicator color (blue selection color)
const DEFAULT_INDICATOR_COLOR: [number, number, number, number] = [0.251, 0.565, 0.965, 1.0]

/** @public @react */
export const WebGLShapeIndicators = memo(function WebGLShapeIndicators({
	hideAll,
	showAll,
}: TLWebGLShapeIndicatorsProps) {
	const editor = useEditor()
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const managerRef = useRef<WebGLIndicatorManager | null>(null)
	const rPreviousSelectedShapeIds = useRef<Set<TLShapeId>>(new Set())

	if (hideAll && showAll) {
		throw Error('You cannot set both hideAll and showAll props to true')
	}

	// Determine which shape IDs should have indicators
	const idsToDisplay = useValue(
		'should display selected ids',
		() => {
			const prev = rPreviousSelectedShapeIds.current
			const next = new Set<TLShapeId>()

			const instanceState = editor.getInstanceState()
			const isChangingStyle = instanceState.isChangingStyle
			const isIdleOrEditing = editor.isInAny('select.idle', 'select.editing_shape')
			const isInSelectState = editor.isInAny(
				'select.brushing',
				'select.scribble_brushing',
				'select.pointing_shape',
				'select.pointing_selection',
				'select.pointing_handle'
			)

			if (isChangingStyle || !(isIdleOrEditing || isInSelectState)) {
				rPreviousSelectedShapeIds.current = next
				return next
			}

			for (const id of editor.getSelectedShapeIds()) {
				next.add(id)
			}

			if (isIdleOrEditing && instanceState.isHoveringCanvas && !instanceState.isCoarsePointer) {
				const hovered = editor.getHoveredShapeId()
				if (hovered) next.add(hovered)
			}

			if (prev.size !== next.size) {
				rPreviousSelectedShapeIds.current = next
				return next
			}

			for (const id of next) {
				if (!prev.has(id)) {
					rPreviousSelectedShapeIds.current = next
					return next
				}
			}

			return prev
		},
		[editor]
	)

	// Get rendering shapes
	const renderingShapes = useValue('rendering shapes', () => editor.getRenderingShapes(), [editor])

	// Get camera for reactive updates
	const camera = useValue('camera', () => editor.getCamera(), [editor])

	// Initialize WebGL manager
	useLayoutEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return

		const manager = new WebGLIndicatorManager(editor, canvas)
		managerRef.current = manager

		if (!manager.initialize()) {
			console.warn('WebGL indicators not available, falling back to default')
			return
		}

		// Initial resize
		manager.resize()

		// Handle window resize
		const handleResize = () => {
			manager.resize()
		}
		window.addEventListener('resize', handleResize)

		return () => {
			window.removeEventListener('resize', handleResize)
			manager.dispose()
			managerRef.current = null
		}
	}, [editor])

	// Collect and render indicators
	useEffect(() => {
		const manager = managerRef.current
		if (!manager || !manager.getIsInitialized()) return

		// Collect indicator data from shapes
		const indicators: IndicatorConfig[] = []

		for (const { id } of renderingShapes) {
			// Skip if not displaying this indicator
			if (!showAll && (hideAll || !idsToDisplay.has(id))) continue

			const shape = editor.getShape(id)
			if (!shape || shape.isLocked) continue

			try {
				// Get shape geometry for indicator
				const geometry = editor.getShapeGeometry(shape)
				if (!geometry) continue

				// Get vertices from geometry
				const vertices = geometry.vertices
				if (vertices.length < 2) continue

				// Convert to Float32Array
				const vertexData = new Float32Array(vertices.length * 2)
				for (let i = 0; i < vertices.length; i++) {
					vertexData[i * 2] = vertices[i].x
					vertexData[i * 2 + 1] = vertices[i].y
				}

				// Get transform
				const transform = editor.getShapePageTransform(shape)
				if (!transform) continue

				indicators.push({
					shapeId: id,
					transform: transform,
					vertices: vertexData,
					color: DEFAULT_INDICATOR_COLOR,
					isClosed: geometry.isClosed,
				})
			} catch {
				// Skip shapes that fail to get geometry
			}
		}

		manager.setIndicators(indicators)
		manager.resize()
		manager.render()
	}, [editor, renderingShapes, idsToDisplay, hideAll, showAll, camera])

	return (
		<canvas
			ref={canvasRef}
			className="tl-webgl-indicators"
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',
				pointerEvents: 'none',
			}}
			aria-hidden="true"
		/>
	)
})
