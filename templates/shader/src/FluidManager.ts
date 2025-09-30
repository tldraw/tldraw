import { Box, Editor, react, throttle, TLShape, TLShapeId, Vec } from 'tldraw'
import { FluidSimulation } from './fluid'

export interface FluidManagerConfig {
	/** Quality mode affects canvas resolution */
	qualityMode: 'low' | 'medium' | 'high'
	/** Scale factor for velocity calculations */
	velocityScale: number
	/** Number of sample points for bounds-based shapes */
	boundsSampleCount: number
	/** Range for random splat counts [min, max] */
	randomSplatsRange: [number, number]
	/** Enable bloom effect */
	bloom: boolean
	/** Enable sunrays effect */
	sunrays: boolean
	/** Background color override */
	backgroundColor: { r: number; g: number; b: number }
	/** Custom color map for dark mode */
	darkModeColorMap: Record<string, [number, number, number]>
	/** Custom color map for light mode */
	lightModeColorMap: Record<string, [number, number, number]>
}

const DEFAULT_DARK_MODE_COLOR_MAP: Record<string, [number, number, number]> = {
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

const DEFAULT_LIGHT_MODE_COLOR_MAP: Record<string, [number, number, number]> = {
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

const DEFAULT_CONFIG: FluidManagerConfig = {
	qualityMode: 'medium',
	velocityScale: 0.01,
	boundsSampleCount: 20,
	randomSplatsRange: [5, 20],
	bloom: false,
	sunrays: false,
	backgroundColor: { r: 249, g: 250, b: 251 },
	darkModeColorMap: DEFAULT_DARK_MODE_COLOR_MAP,
	lightModeColorMap: DEFAULT_LIGHT_MODE_COLOR_MAP,
}

/**
 * Manages fluid simulation interactions with tldraw shapes.
 * Handles shape tracking, geometry extraction, and fluid simulation lifecycle.
 */
export class FluidManager {
	private fluidSim: FluidSimulation | null = null
	private prevShapes: Map<TLShapeId, TLShape> = new Map()
	private config: Required<FluidManagerConfig> = DEFAULT_CONFIG
	private darkMode: boolean = false
	private disposables = new Set<() => void>()

	constructor(
		private canvas: HTMLCanvasElement,
		private editor: Editor,
		config?: Partial<FluidManagerConfig>
	) {
		this.config = {
			...DEFAULT_CONFIG,
			...config,
		}

		this.disposables.add(
			react('laserReactor', () => {
				const isInLaserTool = editor.isInAny('laser.pointing', 'laser.lasering', 'eraser.erasing')
				const position = editor.inputs.currentScreenPoint
				this.updatePointerTool(isInLaserTool, position)
			})
		)
		this.disposables.add(
			react('shapeChanges', () => {
				const currentShapes = this.editor.getCurrentPageShapes()
				this.updateShapes(currentShapes)
			})
		)
	}

	/**
	 * Initialize the fluid simulation with the canvas.
	 * Must be called before using other methods.
	 */
	initialize(darkMode: boolean = false): void {
		this.darkMode = darkMode

		const resolutionScale =
			this.config.qualityMode === 'high' ? 1.0 : this.config.qualityMode === 'medium' ? 0.5 : 0.25

		// Set canvas internal resolution based on display size
		const rect = this.canvas.getBoundingClientRect()
		this.canvas.width = rect.width * resolutionScale
		this.canvas.height = rect.height * resolutionScale

		const backgroundColor = darkMode ? { r: 0, g: 0, b: 0 } : this.config.backgroundColor

		this.fluidSim = new FluidSimulation(this.canvas, {
			BACK_COLOR: backgroundColor,
			BLOOM: this.config.bloom ?? darkMode,
			SUNRAYS: this.config.sunrays ?? darkMode,
		})

		this.fluidSim.start()
	}

	/**
	 * Clean up resources and dispose of the fluid simulation.
	 */
	dispose = (): void => {
		if (this.fluidSim) {
			this.fluidSim.destroy()
			this.fluidSim = null
		}
		this.prevShapes.clear()
		this.disposables.forEach((dispose) => dispose())
		this.disposables.clear()
	}

	/**
	 * Update the dark mode setting and reinitialize the simulation.
	 */
	setDarkMode = (darkMode: boolean): void => {
		this.darkMode = darkMode
		this.dispose()
		this.initialize(darkMode)
	}

	/**
	 * Start a drag interaction at the given normalized screen coordinates.
	 * @param x - Normalized x coordinate (0-1)
	 * @param y - Normalized y coordinate (0-1)
	 */
	startDrag = (x: number, y: number): void => {
		this.fluidSim?.startDrag(x, y)
	}

	/**
	 * Update the current drag position.
	 * @param x - Normalized x coordinate (0-1)
	 * @param y - Normalized y coordinate (0-1)
	 */
	updateDrag = (x: number, y: number): void => {
		this.fluidSim?.updateDrag(x, y)
	}

	/**
	 * End the current drag interaction.
	 */
	endDrag = (): void => {
		this.fluidSim?.endDrag()
	}

	/**
	 * Add random splats to the simulation.
	 * @param count - Optional number of splats (uses random range from config if not provided)
	 */
	addRandomSplats = (count?: number): void => {
		const [min, max] = this.config.randomSplatsRange
		const splatCount = count ?? Math.floor(Math.random() * (max - min)) + min
		this.fluidSim?.addRandomSplats(splatCount)
	}

	/**
	 * Process shape changes and update fluid simulation accordingly.
	 * Call this method when shapes are created, modified, or deleted.
	 */
	updateShapes = throttle((currentShapes: TLShape[]): void => {
		if (!this.fluidSim) return
		const currentShapeMap = new Map(currentShapes.map((shape) => [shape.id, shape]))
		const vsb = this.editor.getViewportScreenBounds()

		// Check for changed shapes
		currentShapes.forEach((shape) => {
			const prevShape = this.prevShapes.get(shape.id)

			if (!prevShape) {
				// New shape - create splats from its geometry
				this.handleNewShape(shape, vsb)
			} else {
				// Check if shape has changed (position, size, rotation)
				const hasChanged =
					prevShape.x !== shape.x ||
					prevShape.y !== shape.y ||
					prevShape.rotation !== shape.rotation ||
					this.shapePropsChanged(prevShape.props, shape.props)

				if (hasChanged) {
					this.handleShapeChange(shape, prevShape, vsb)
				}
			}
		})

		// Clean up deleted shapes from tracking (prevent memory leak)
		this.prevShapes.forEach((_, id) => {
			if (!currentShapeMap.has(id)) {
				this.prevShapes.delete(id)
			}
		})

		// Update the previous shapes reference
		this.prevShapes = currentShapeMap
	}, 120)

	/**
	 * Handle pointer movement for laser/eraser tools.
	 * @param isActive - Whether the tool is currently active
	 * @param screenPoint - Current screen point
	 */
	updatePointerTool = (isActive: boolean, screenPoint: Vec): void => {
		if (!isActive) {
			this.endDrag()
			return
		}

		const vsb = this.editor.getViewportScreenBounds()
		const normalizedPosition = this.screenToNormalizedScreen(screenPoint, vsb)
		this.startDrag(normalizedPosition.x, normalizedPosition.y)
	}

	/**
	 * Get configuration value.
	 */
	getConfig = (): Readonly<Required<FluidManagerConfig>> => {
		return this.config
	}

	// Private helper methods

	private handleNewShape = (shape: TLShape, vsb: Box): void => {
		const geometryData = this.extractShapeGeometry(shape, vsb)
		const color = this.getShapeColor(shape)
		if (geometryData.points.length > 0) {
			this.fluidSim!.createSplatsFromGeometry(
				geometryData.points,
				{ x: 0, y: 0 },
				geometryData.isClosed,
				color
			)
		}
	}

	private handleShapeChange = (shape: TLShape, prevShape: TLShape, vsb: Box): void => {
		const geometryData = this.extractShapeGeometry(shape, vsb)
		const color = this.getShapeColor(shape)
		if (geometryData.points.length > 0) {
			// Calculate velocity based on position change
			const velocity = {
				x: (shape.x - prevShape.x) * this.config.velocityScale,
				y: (shape.y - prevShape.y) * this.config.velocityScale,
			}
			this.fluidSim!.createSplatsFromGeometry(
				geometryData.points,
				velocity,
				geometryData.isClosed,
				color
			)
		}
	}

	private getShapeColor(shape: TLShape): [number, number, number] {
		try {
			// Try to get color from shape props
			let colorValue = 'black' // Default
			if (this.hasStringColorProp(shape)) {
				colorValue = (shape.props as any).color
			}

			// Convert tldraw color names to RGB values
			const colorMap = this.darkMode ? this.config.darkModeColorMap : this.config.lightModeColorMap

			return colorMap[colorValue] || (this.darkMode ? [0.4, 0.4, 0.7] : [0.08, 0.08, 0.14]) // Default blue-ish
		} catch (error) {
			console.warn('Failed to extract color for shape:', shape.type, error)
			return this.darkMode ? [0.4, 0.4, 0.7] : [0.08, 0.08, 0.14] // Default color
		}
	}

	private hasStringColorProp(shape: TLShape): boolean {
		return (
			shape &&
			shape.props &&
			Object.prototype.hasOwnProperty.call(shape.props, 'color') &&
			typeof (shape.props as any).color === 'string'
		)
	}

	/**
	 * Extract geometry points from a shape using tldraw's geometry helpers.
	 * Points are returned in normalized screen coordinates (0-1 range).
	 */
	private extractShapeGeometry = (
		shape: TLShape,
		vsb: Box
	): {
		points: Array<{ x: number; y: number }>
		isClosed: boolean
	} => {
		// Convert page coordinates to normalized coordinates
		const toNormalized = (pageX: number, pageY: number) => {
			const screenPoint = this.editor.pageToScreen({ x: pageX, y: pageY })
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
			const geometry = this.editor.getShapeGeometry(shape)

			const points: Array<{ x: number; y: number }> = []
			let isClosed = true // Default to closed

			// Get the shape's transform
			const transform = this.editor.getShapePageTransform(shape)
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
				const sampleCount = this.config.boundsSampleCount

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
			const bounds = this.editor.getShapePageBounds(shape)
			if (!bounds) return { points: [], isClosed: false }

			const { x, y, w, h } = bounds
			const fallbackIsClosed =
				!this.editor.isShapeOfType(shape, 'arrow') && !this.editor.isShapeOfType(shape, 'line')

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

	/**
	 * Convert screen coordinates to normalized screen coordinates (0-1 range).
	 */
	private screenToNormalizedScreen = (position: Vec, vsb: Box): { x: number; y: number } => {
		return {
			x: position.x / vsb.w,
			y: (position.y / vsb.h) * -1 + 1,
		}
	}

	private shapePropsChanged = (prevProps: any, currentProps: any): boolean => {
		for (const key of Object.keys(prevProps)) {
			if (prevProps[key] !== currentProps[key]) return true
		}
		return false
	}
}
