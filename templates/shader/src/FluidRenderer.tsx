import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { TLShape, useEditor, useReactor, Vec } from 'tldraw'
import { FluidSimulation } from './fluid'

export function FluidRenderer() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const editor = useEditor()
	const fluidSimRef = useRef<FluidSimulation | null>(null)
	const prevShapesRef = useRef<Map<string, TLShape>>(new Map())

	useLayoutEffect(() => {
		const fluidSim = new FluidSimulation(canvasRef.current!)
		fluidSimRef.current = fluidSim

		fluidSim.start()

		return () => {
			fluidSimRef.current = null
			fluidSim.destroy()
		}
	}, [])

	const screenToNormalizedScreen = useCallback(
		(position: Vec) => {
			const viewport = editor.getViewportScreenBounds()
			return {
				x: position.x / viewport.w,
				y: (position.y / viewport.h) * -1 + 1,
			}
		},
		[editor]
	)

	// Helper function to extract shape color
	const getShapeColor = useCallback((shape: TLShape): [number, number, number] => {
		try {
			// Try to get color from shape props
			let colorValue = 'black' // Default
			if ('color' in shape.props && typeof shape.props.color === 'string') {
				colorValue = shape.props.color
			}

			// Convert tldraw color names to RGB values
			const colorMap: Record<string, [number, number, number]> = {
				black: [0.04, 0.04, 0.04],
				grey: [0.08, 0.08, 0.08],

				// Adjust these ones
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

			const fadedColorMap: Record<string, [number, number, number]> = {}
			for (const [key, value] of Object.entries(colorMap)) {
				const modifier = 1
				fadedColorMap[key] = value.map((v) => v * modifier) as [number, number, number]
			}

			return fadedColorMap[colorValue] || [0.4, 0.4, 0.7] // Default blue-ish
		} catch (error) {
			console.warn('Failed to extract color for shape:', shape.type, error)
			return [0.4, 0.4, 0.7] // Default color
		}
	}, [])

	// Helper function to extract geometry points from shapes using tldraw's geometry helpers
	const extractShapeGeometry = useCallback(
		(
			shape: TLShape
		): {
			points: Array<{ x: number; y: number }>
			isClosed: boolean
			color: [number, number, number]
		} => {
			try {
				// Get the shape's geometry using tldraw's built-in helpers
				const geometry = editor.getShapeGeometry(shape)
				const viewport = editor.getViewportScreenBounds()

				// Convert page coordinates to normalized coordinates
				const toNormalized = (pageX: number, pageY: number) => {
					const screenPoint = editor.pageToScreen({ x: pageX, y: pageY })
					return {
						x: (screenPoint.x - viewport.x) / viewport.w,
						y: ((screenPoint.y - viewport.y) / viewport.h) * -1 + 1,
					}
				}

				const points: Array<{ x: number; y: number }> = []
				let isClosed = true // Default to closed
				const color = getShapeColor(shape)

				// Get the shape's transform
				const transform = editor.getShapePageTransform(shape)
				if (!transform) return { points: [], isClosed: false, color }

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
						// Transform the vertex using the shape's transform
						const transformedX = transform.a * vertex.x + transform.c * vertex.y + transform.e
						const transformedY = transform.b * vertex.x + transform.d * vertex.y + transform.f

						points.push(toNormalized(transformedX, transformedY))
					})
				} else if ('bounds' in geometry) {
					// Sample points around the perimeter using bounds
					const bounds = geometry.bounds
					const sampleCount = 20

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

						// Transform the point using the shape's transform
						const transformedX = transform.a * x + transform.c * y + transform.e
						const transformedY = transform.b * x + transform.d * y + transform.f

						points.push(toNormalized(transformedX, transformedY))
					}
					// Bounds-based shapes are typically closed
					isClosed = true
				}

				// If we didn't get points from outline, try vertices
				if (points.length === 0) {
					const vertices = geometry.vertices
					vertices.forEach((vertex) => {
						// Transform the vertex using the shape's transform
						const transformedX = transform.a * vertex.x + transform.c * vertex.y + transform.e
						const transformedY = transform.b * vertex.x + transform.d * vertex.y + transform.f

						points.push(toNormalized(transformedX, transformedY))
					})
				}

				return { points, isClosed, color }
			} catch (error) {
				console.warn('Failed to extract geometry for shape:', shape.type, error)

				// Fallback to bounds-based approach
				const bounds = editor.getShapePageBounds(shape)
				if (!bounds) return { points: [], isClosed: false, color: [0.4, 0.4, 0.7] }

				const viewport = editor.getViewportScreenBounds()
				const toNormalized = (pageX: number, pageY: number) => {
					const screenPoint = editor.pageToScreen({ x: pageX, y: pageY })
					return {
						x: (screenPoint.x - viewport.x) / viewport.w,
						y: ((screenPoint.y - viewport.y) / viewport.h) * -1 + 1,
					}
				}

				const { x, y, w, h } = bounds
				const fallbackIsClosed = shape.type !== 'arrow' && shape.type !== 'line'
				const fallbackColor = getShapeColor(shape)

				return {
					points: [
						toNormalized(x, y),
						toNormalized(x + w, y),
						toNormalized(x + w, y + h),
						toNormalized(x, y + h),
					],
					isClosed: fallbackIsClosed,
					color: fallbackColor,
				}
			}
		},
		[editor, getShapeColor]
	)

	useReactor(
		'fluid drag',
		() => {
			const isInLaserTool = editor.isInAny('laser.pointing', 'laser.lasering', 'eraser.erasing')
			if (!isInLaserTool) {
				fluidSimRef.current?.endDrag()
				return
			}

			const position = editor.inputs.currentScreenPoint
			// Where 0 is the left edge of the screen and 1 is the right edge
			// Where 0 is the top edge of the screen and 1 is the bottom edge
			const normalizedPosition = screenToNormalizedScreen(position)
			fluidSimRef.current?.startDrag(normalizedPosition.x, normalizedPosition.y)
		},
		[]
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
					const geometryData = extractShapeGeometry(shape)
					if (geometryData.points.length > 0) {
						fluidSimRef.current!.createSplatsFromGeometry(
							geometryData.points,
							{ x: 0, y: 0 },
							geometryData.isClosed,
							geometryData.color
						)
					}
				} else {
					// Check if shape has changed (position, size, rotation)
					const hasChanged =
						prevShape.x !== shape.x ||
						prevShape.y !== shape.y ||
						prevShape.rotation !== shape.rotation ||
						JSON.stringify(prevShape.props) !== JSON.stringify(shape.props)

					if (hasChanged) {
						const geometryData = extractShapeGeometry(shape)
						if (geometryData.points.length > 0) {
							// Calculate velocity based on position change
							const velocity = {
								x: (shape.x - prevShape.x) * 0.01,
								y: (shape.y - prevShape.y) * 0.01,
							}
							fluidSimRef.current!.createSplatsFromGeometry(
								geometryData.points,
								velocity,
								geometryData.isClosed,
								geometryData.color
							)
						}
					}
				}
			})

			// Update the previous shapes reference
			prevShapesRef.current = currentShapeMap
		},
		[]
	)

	useEffect(() => {
		const handleMove = () => {
			if (!fluidSimRef.current) return
			const position = editor.inputs.currentScreenPoint
			const normalizedPosition = screenToNormalizedScreen(position)
			fluidSimRef.current.updateDrag(normalizedPosition.x, normalizedPosition.y)
		}
		window.addEventListener('pointermove', handleMove)
		return () => window.removeEventListener('pointermove', handleMove)
	}, [editor, screenToNormalizedScreen])

	// Add keyboard shortcuts for fluid control
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!fluidSimRef.current) return

			switch (e.code) {
				case 'Space':
					// Add random splats
					fluidSimRef.current.addRandomSplats(Math.floor(Math.random() * 20) + 5)
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
				// pointerEvents: isSelectTool ? 'auto' : 'none',
				zIndex: 1000,
			}}
		/>
	)
}
