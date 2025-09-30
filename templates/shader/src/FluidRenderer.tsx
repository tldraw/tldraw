import { useEffect, useLayoutEffect, useRef } from 'react'
import { Box, Editor, TLShape, TLShapeId, useEditor, useIsDarkMode, useReactor, Vec } from 'tldraw'
import { FluidSimulation } from './fluid'

const QUALITY_MODE = 'high' // "low" | "medium" | "high"
const DEFAULT_Z_INDEX = 1000
const VELOCITY_SCALE = 0.01
const BOUNDS_SAMPLE_COUNT = 20
const RANDOM_SPLATS_MAX = 20
const RANDOM_SPLATS_MIN = 5

const DARK_MODE_COLOR_MAP: Record<string, [number, number, number]> = {
	black: [0.04, 0.04, 0.04],
	grey: [0.08, 0.08, 0.08],
	'light-violet': [0.07, 0.03, 0.06],
	violet: [0.04, 0.02, 0.08],
	blue: [0.02, 0.04, 0.09],
	'light-blue': [0.03, 0.06, 0.09],
	yellow: [0.09, 0.08, 0.02],
	orange: [0.08, 0.03, 0.01],
	green: [0.03, 0.07, 0.03],
	'light-green': [0.06, 0.09, 0.04],
	'light-red': [0.08, 0.03, 0.03],
	red: [0.08, 0.02, 0.02],
}

const LIGHT_MODE_COLOR_MAP: Record<string, [number, number, number]> = {
	black: [0, 0, 0],
	grey: [0.25, 0.25, 0.25],
	'light-violet': [0.45, 0.25, 0.4],
	violet: [0.35, 0.15, 0.5],
	blue: [0.15, 0.3, 0.6],
	'light-blue': [0.2, 0.4, 0.7],
	yellow: [0.7, 0.6, 0.15],
	orange: [0.6, 0.3, 0.1],
	green: [0.2, 0.5, 0.2],
	'light-green': [0.3, 0.65, 0.25],
	'light-red': [0.6, 0.2, 0.2],
	red: [0.5, 0.15, 0.15],
}

export function FluidRenderer() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const editor = useEditor()
	const fluidSimRef = useRef<FluidSimulation | null>(null)
	const prevShapesRef = useRef<Map<TLShapeId, TLShape>>(new Map())

	const darkMode = useIsDarkMode()

	useLayoutEffect(() => {
		const canvas = canvasRef.current!
		const resolutionScale = QUALITY_MODE === 'high' ? 1.0 : QUALITY_MODE === 'medium' ? 0.5 : 0.25

		// Set canvas internal resolution based on display size
		const rect = canvas.getBoundingClientRect()
		canvas.width = rect.width * resolutionScale
		canvas.height = rect.height * resolutionScale

		const backgroundColor = darkMode ? { r: 0, g: 0, b: 0 } : { r: 249, g: 250, b: 251 }
		const fluidSim = new FluidSimulation(canvas, {
			BACK_COLOR: backgroundColor,
			BLOOM: darkMode, // Enable bloom only in dark mode
			SUNRAYS: darkMode, // Enable sunrays only in dark mode
		})
		fluidSimRef.current = fluidSim

		fluidSim.start()

		return () => {
			fluidSimRef.current = null
			fluidSim.destroy()
		}
	}, [darkMode])

	useReactor(
		'fluid drag',
		() => {
			const isInLaserTool = editor.isInAny('laser.pointing', 'laser.lasering', 'eraser.erasing')
			if (!isInLaserTool) {
				fluidSimRef.current?.endDrag()
				return
			}

			const position = editor.inputs.currentScreenPoint
			const vsb = editor.getViewportScreenBounds()
			const normalizedPosition = screenToNormalizedScreen(position, vsb)
			fluidSimRef.current?.startDrag(normalizedPosition.x, normalizedPosition.y)
		},
		[editor]
	)

	useReactor(
		'shape changes',
		() => {
			if (!fluidSimRef.current) return

			const currentShapes = editor.getCurrentPageShapes()
			const currentShapeMap = new Map(currentShapes.map((shape) => [shape.id, shape]))
			const prevShapeMap = prevShapesRef.current

			// Check for changed shapes
			currentShapes.forEach((shape) => {
				const prevShape = prevShapeMap.get(shape.id)

				if (!prevShape) {
					// New shape - create splats from its geometry
					const geometryData = extractShapeGeometry(editor, shape)
					const color = getShapeColor(shape, darkMode)
					if (geometryData.points.length > 0) {
						fluidSimRef.current!.createSplatsFromGeometry(
							geometryData.points,
							{ x: 0, y: 0 },
							geometryData.isClosed,
							color
						)
					}
				} else {
					// Check if shape has changed (position, size, rotation)
					const hasChanged =
						prevShape.x !== shape.x ||
						prevShape.y !== shape.y ||
						prevShape.rotation !== shape.rotation ||
						shapePropsChanged(prevShape.props, shape.props)

					if (hasChanged) {
						const geometryData = extractShapeGeometry(editor, shape)
						const color = getShapeColor(shape, darkMode)
						if (geometryData.points.length > 0) {
							// Calculate velocity based on position change
							const velocity = {
								x: (shape.x - prevShape.x) * VELOCITY_SCALE,
								y: (shape.y - prevShape.y) * VELOCITY_SCALE,
							}
							fluidSimRef.current!.createSplatsFromGeometry(
								geometryData.points,
								velocity,
								geometryData.isClosed,
								color
							)
						}
					}
				}
			})

			// Clean up deleted shapes from tracking (prevent memory leak)
			prevShapeMap.forEach((_, id) => {
				if (!currentShapeMap.has(id)) {
					prevShapeMap.delete(id)
				}
			})

			// Update the previous shapes reference
			prevShapesRef.current = currentShapeMap
		},
		[editor]
	)

	useEffect(() => {
		const handleMove = () => {
			if (!fluidSimRef.current) return
			const position = editor.inputs.currentScreenPoint
			const vsb = editor.getViewportScreenBounds()
			const normalizedPosition = screenToNormalizedScreen(position, vsb)
			fluidSimRef.current.updateDrag(normalizedPosition.x, normalizedPosition.y)
		}
		window.addEventListener('pointermove', handleMove)
		return () => window.removeEventListener('pointermove', handleMove)
	}, [editor])

	// Add keyboard shortcuts for fluid control
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!fluidSimRef.current) return

			switch (e.code) {
				case 'Space':
					// Add random splats
					fluidSimRef.current.addRandomSplats(
						Math.floor(Math.random() * RANDOM_SPLATS_MAX) + RANDOM_SPLATS_MIN
					)
					e.preventDefault()
					break
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [])

	return (
		<canvas
			ref={canvasRef}
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',
				zIndex: DEFAULT_Z_INDEX,
			}}
		/>
	)
}

function getShapeColor(shape: TLShape, darkMode: boolean): [number, number, number] {
	try {
		// Try to get color from shape props
		let colorValue = 'black' // Default
		if (hasStringColorProp(shape)) {
			colorValue = (shape.props as any).color
		}

		// Convert tldraw color names to RGB values
		const colorMap = darkMode ? DARK_MODE_COLOR_MAP : LIGHT_MODE_COLOR_MAP

		return colorMap[colorValue] || (darkMode ? [0.4, 0.4, 0.7] : [0.08, 0.08, 0.14]) // Default blue-ish
	} catch (error) {
		console.warn('Failed to extract color for shape:', shape.type, error)
		return darkMode ? [0.4, 0.4, 0.7] : [0.08, 0.08, 0.14] // Default color
	}
}

function hasStringColorProp(shape: TLShape): boolean {
	return (
		shape &&
		shape.props &&
		Object.prototype.hasOwnProperty.call(shape.props, 'color') &&
		typeof (shape.props as any).color === 'string'
	)
}

// Helper function to extract geometry points from shapes using tldraw's geometry helpers
function extractShapeGeometry(
	editor: Editor,
	shape: TLShape
): {
	points: Array<{ x: number; y: number }>
	isClosed: boolean
} {
	// Convert page coordinates to normalized coordinates
	const vsb = editor.getViewportScreenBounds()
	const toNormalized = (pageX: number, pageY: number) => {
		const screenPoint = editor.pageToScreen({ x: pageX, y: pageY })
		return {
			x: (screenPoint.x - vsb.x) / vsb.w,
			y: ((screenPoint.y - vsb.y) / vsb.h) * -1 + 1,
		}
	}

	const transformAndNormalize = (
		vertex: { x: number; y: number },
		transform: { a: number; b: number; c: number; d: number; e: number; f: number }
	) => {
		const transformedX = transform.a * vertex.x + transform.c * vertex.y + transform.e
		const transformedY = transform.b * vertex.x + transform.d * vertex.y + transform.f
		return toNormalized(transformedX, transformedY)
	}

	try {
		// Get the shape's geometry using tldraw's built-in helpers
		const geometry = editor.getShapeGeometry(shape)

		const points: Array<{ x: number; y: number }> = []
		let isClosed = true // Default to closed

		// Get the shape's transform
		const transform = editor.getShapePageTransform(shape)
		if (!transform) return { points: [], isClosed: false }

		// Check if geometry has isClosed property
		if ('isClosed' in geometry && typeof geometry.isClosed === 'boolean') {
			isClosed = geometry.isClosed
		} else {
			// Infer from shape type if not available
			isClosed = shape.type !== 'arrow' && shape.type !== 'line'
		}

		// Sample points along the geometry
		// Use the vertices property directly
		if (geometry.vertices && geometry.vertices.length > 0) {
			geometry.vertices.forEach((vertex) => {
				points.push(transformAndNormalize(vertex, transform))
			})
		} else if ('bounds' in geometry) {
			// Sample points around the perimeter using bounds
			const bounds = geometry.bounds
			const sampleCount = BOUNDS_SAMPLE_COUNT

			for (let i = 0; i < sampleCount; i++) {
				const t = i / sampleCount
				let x, y

				if (t < 0.25) {
					// Top edge
					const edgeT = t * 4
					x = bounds.minX + edgeT * (bounds.maxX - bounds.minX)
					y = bounds.minY
				} else if (t < 0.5) {
					// Right edge
					const edgeT = (t - 0.25) * 4
					x = bounds.maxX
					y = bounds.minY + edgeT * (bounds.maxY - bounds.minY)
				} else if (t < 0.75) {
					// Bottom edge
					const edgeT = (t - 0.5) * 4
					x = bounds.maxX - edgeT * (bounds.maxX - bounds.minX)
					y = bounds.maxY
				} else {
					// Left edge
					const edgeT = (t - 0.75) * 4
					x = bounds.minX
					y = bounds.maxY - edgeT * (bounds.maxY - bounds.minY)
				}

				points.push(transformAndNormalize({ x, y }, transform))
			}
			// Bounds-based shapes are typically closed
			isClosed = true
		}

		// If we didn't get points from outline, try vertices
		if (points.length === 0) {
			const vertices = geometry.vertices
			vertices.forEach((vertex) => {
				points.push(transformAndNormalize(vertex, transform))
			})
		}

		return { points, isClosed }
	} catch (error) {
		console.warn('Failed to extract geometry for shape:', shape.type, error)

		// Fallback to bounds-based approach
		const bounds = editor.getShapePageBounds(shape)
		if (!bounds) return { points: [], isClosed: false }

		const { x, y, w, h } = bounds
		const fallbackIsClosed =
			!editor.isShapeOfType(shape, 'arrow') && !editor.isShapeOfType(shape, 'line')

		return {
			points: [
				toNormalized(x, y),
				toNormalized(x + w, y),
				toNormalized(x + w, y + h),
				toNormalized(x, y + h),
			],
			isClosed: fallbackIsClosed,
		}
	}
}

function screenToNormalizedScreen(position: Vec, vsb: Box) {
	// Where 0 is the left edge of the screen and 1 is the right edge
	// Where 0 is the top edge of the screen and 1 is the bottom edge
	return {
		x: position.x / vsb.w,
		y: (position.y / vsb.h) * -1 + 1,
	}
}

function shapePropsChanged(prevProps: any, currentProps: any): boolean {
	// Shallow comparison of props object
	const prevKeys = Object.keys(prevProps)
	const currentKeys = Object.keys(currentProps)

	if (prevKeys.length !== currentKeys.length) return true

	for (const key of prevKeys) {
		if (prevProps[key] !== currentProps[key]) return true
	}

	return false
}
