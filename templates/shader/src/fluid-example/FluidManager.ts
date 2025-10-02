import { Box, Editor, react, throttle, TLCamera, TLShape, Vec } from 'tldraw'
import { FluidSimulation } from './fluid'

export interface FluidManagerConfig {
	/** Quality mode affects canvas resolution */
	quality: number
	/** Scale factor for velocity calculations */
	velocityScale: number
	/** Number of sample points for bounds-based shapes */
	boundsSampleCount: number
	/** Range for random splat counts [min, max] */
	randomSplatsRange: [number, number]
	/** Custom color map for dark mode */
	darkModeColorMap: Record<string, [number, number, number]>
	/** Custom color map for light mode */
	lightModeColorMap: Record<string, [number, number, number]>
	/** Resolution of the simulation grid (lower = faster, higher = more detailed) */
	simResolution: number
	/** Resolution of the dye texture (affects visual quality) */
	dyeResolution: number
	/** Rate at which dye density dissipates (0 = never fades, higher = fades faster) */
	densityDissipation: number
	/** Rate at which velocity dissipates (0 = perpetual motion, higher = stops faster) */
	velocityDissipation: number
	/** Pressure strength for velocity field calculations */
	pressure: number
	/** Number of iterations for pressure solver (higher = more accurate but slower) */
	pressureIterations: number
	/** Vorticity confinement strength (creates swirling patterns) */
	curl: number
	/** Radius of splat effect (size of fluid disturbance) */
	splatRadius: number
	/** Force applied to splats (strength of fluid disturbance) */
	splatForce: number
	/** Enable shading effect (adds depth perception) */
	shading: boolean
	/** Enable colorful mode (automatically cycles colors) */
	colorful: boolean
	/** Speed of automatic color updates (when colorful is true) */
	colorUpdateSpeed: number
	/** Pause the simulation */
	paused: boolean
	/** Background color (RGB values 0-255) */
	backColor: { r: number; g: number; b: number }
	/** Transparent background */
	transparent: boolean
	/** Enable bloom post-processing effect */
	bloom: boolean
	/** Number of bloom blur iterations */
	bloomIterations: number
	/** Resolution for bloom effect */
	bloomResolution: number
	/** Bloom effect intensity */
	bloomIntensity: number
	/** Brightness threshold for bloom effect */
	bloomThreshold: number
	/** Bloom soft knee (smoothness of threshold transition) */
	bloomSoftKnee: number
	/** Enable sunrays post-processing effect */
	sunrays: boolean
	/** Resolution for sunrays effect */
	sunraysResolution: number
	/** Sunrays effect weight (intensity) */
	sunraysWeight: number
	/** Enable pixelated rendering style */
	pixelate: boolean
}

const DEFAULT_DARK_MODE_COLOR_MAP: Record<string, [number, number, number]> = {
	black: [0.001, 0.043, 0.084],
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
	black: [0.001, 0.043, 0.084],
	grey: [0.083, 0.083, 0.084],
	'light-violet': [0.125, 0.063, 0.062],
	violet: [0.125, 0.05, 0.075],
	blue: [0.05, 0.075, 0.125],
	'light-blue': [0.05, 0.1, 0.1],
	yellow: [0.125, 0.1, 0.025],
	orange: [0.15, 0.075, 0.025],
	green: [0.05, 0.15, 0.05],
	'light-green': [0.075, 0.125, 0.05],
	'light-red': [0.15, 0.05, 0.05],
	red: [0.15, 0.05, 0.05],
}

export const DEFAULT_CONFIG: FluidManagerConfig = {
	quality: 0.5,
	velocityScale: 0.01,
	boundsSampleCount: 20,
	randomSplatsRange: [5, 20],
	darkModeColorMap: DEFAULT_DARK_MODE_COLOR_MAP,
	lightModeColorMap: DEFAULT_LIGHT_MODE_COLOR_MAP,
	// Fluid simulation defaults
	simResolution: 128,
	dyeResolution: 1024,
	densityDissipation: 1,
	velocityDissipation: 0.2,
	pressure: 0.8,
	pressureIterations: 20,
	curl: 10,
	splatRadius: 0.25,
	splatForce: 6000,
	shading: true,
	colorful: true,
	colorUpdateSpeed: 10,
	paused: false,
	backColor: { r: 0, g: 0, b: 0 },
	transparent: false,
	bloom: true,
	bloomIterations: 8,
	bloomResolution: 256,
	bloomIntensity: 0.8,
	bloomThreshold: 0.6,
	bloomSoftKnee: 0.7,
	sunrays: true,
	sunraysResolution: 196,
	sunraysWeight: 1.0,
	pixelate: false,
}

/**
 * Manages fluid simulation interactions with tldraw shapes.
 * Handles shape tracking, geometry extraction, and fluid simulation lifecycle.
 */
export class FluidManager {
	private fluidSim: FluidSimulation | null = null
	private config: FluidManagerConfig
	private darkMode: boolean = false
	private disposables = new Set<() => void>()
	private isPointerEffectActive = false

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
			react('tool changes', () => {
				const currentTool = editor.getCurrentToolId()
				if (currentTool === 'eraser') {
					this.isPointerEffectActive = true
				} else {
					if (this.isPointerEffectActive) {
						this.handlePointerUp()
					}
					this.isPointerEffectActive = false
				}
			})
		)

		this.disposables.add(
			editor.store.listen((diff) => {
				const updatedRecords = Object.values(diff.changes.updated)
				const updatedCamera = updatedRecords.find(([record]) => record.typeName === 'camera')
				if (updatedCamera) {
					const [prevCamera, newCamera] = updatedCamera as [TLCamera, TLCamera]
					const { velocityScale } = this.config
					this.handleViewportChange(
						this.editor.getViewportScreenBounds(),
						Vec.Sub(newCamera, prevCamera).mul(velocityScale)
					)
					return
				}

				const added = Object.values(diff.changes.added).filter(
					(record) => record.typeName === 'shape'
				) as TLShape[]

				const updated = updatedRecords.filter(([record]) => record.typeName === 'shape') as [
					TLShape,
					TLShape,
				][]

				this.updateShapes(added, updated)
			})
		)
	}

	/**
	 * Initialize the fluid simulation with the canvas.
	 * Must be called before using other methods.
	 */
	initialize(darkMode: boolean = false): void {
		this.darkMode = darkMode

		// Set canvas internal resolution based on display size
		const rect = this.canvas.getBoundingClientRect()
		this.canvas.width = rect.width
		this.canvas.height = rect.height

		const backgroundColor = darkMode ? { r: 16, g: 16, b: 17 } : { r: 249, g: 250, b: 251 }

		this.fluidSim = new FluidSimulation(this.canvas, {
			SIM_RESOLUTION: this.config.quality * this.config.simResolution,
			DYE_RESOLUTION: this.config.quality * this.config.dyeResolution,
			DENSITY_DISSIPATION: this.config.densityDissipation,
			VELOCITY_DISSIPATION: this.config.velocityDissipation,
			PRESSURE: this.config.pressure,
			PRESSURE_ITERATIONS: this.config.pressureIterations,
			CURL: this.config.curl,
			SPLAT_RADIUS: this.config.splatRadius,
			SPLAT_FORCE: this.config.splatForce,
			SHADING: this.config.shading,
			COLORFUL: this.config.colorful,
			COLOR_UPDATE_SPEED: this.config.colorUpdateSpeed,
			PAUSED: this.config.paused,
			BACK_COLOR: backgroundColor,
			TRANSPARENT: this.config.transparent,
			BLOOM: this.config.bloom,
			BLOOM_ITERATIONS: this.config.bloomIterations,
			BLOOM_RESOLUTION: this.config.bloomResolution,
			BLOOM_INTENSITY: this.config.bloomIntensity,
			BLOOM_THRESHOLD: this.config.bloomThreshold,
			BLOOM_SOFT_KNEE: this.config.bloomSoftKnee,
			SUNRAYS: this.config.sunrays,
			SUNRAYS_RESOLUTION: this.config.sunraysResolution,
			SUNRAYS_WEIGHT: this.config.sunraysWeight,
		})

		this.fluidSim.start()
		this.handleViewportChange(this.editor.getViewportScreenBounds(), new Vec(0, -0.2))
	}

	/**
	 * Create random splats in the fluid simulation.
	 * @param count - Number of random splats to create. If not provided, uses randomSplatsRange from config.
	 */
	createRandomSplats = (count?: number): void => {
		if (!this.fluidSim) return
		const splatCount = count ?? Math.floor(Math.random() * 20) + 5
		this.fluidSim.addRandomSplats(splatCount)
	}

	/**
	 * Clean up resources and dispose of the fluid simulation.
	 * Destroys the fluid simulation instance and clears all registered disposables.
	 */
	dispose = (): void => {
		if (this.fluidSim) {
			this.fluidSim.destroy()
			this.fluidSim = null
		}
		this.disposables.forEach((dispose) => dispose())
		this.disposables.clear()
	}

	/**
	 * Handle pointer down event.
	 * Initiates drag interaction with the fluid simulation when the eraser tool is active.
	 */
	handlePointerDown = (): void => {
		if (!this.isPointerEffectActive) return
		const { x, y } = this.getNormalizedPosition()
		this.fluidSim?.startDrag(x, y)
	}

	/**
	 * Handle pointer move event.
	 * Updates drag position in the fluid simulation during active dragging.
	 */
	handlePointerMove = (): void => {
		if (!this.isPointerEffectActive || !this.editor.inputs.isDragging) return
		const { x, y } = this.getNormalizedPosition()
		this.fluidSim?.updateDrag(x, y)
	}

	/**
	 * Handle pointer up event.
	 * Ends drag interaction with the fluid simulation.
	 */
	handlePointerUp = (): void => {
		if (!this.isPointerEffectActive || !this.editor.inputs.isDragging) return
		this.fluidSim?.endDrag()
	}

	/**
	 * Get the current pointer position normalized to fluid simulation coordinates.
	 * @returns Normalized coordinates where x and y are in the range [0, 1], with y inverted for WebGL.
	 */
	private getNormalizedPosition() {
		const position = this.editor.inputs.currentScreenPoint
		const vsb = this.editor.getViewportScreenBounds()
		return {
			x: position.x / vsb.w,
			y: (position.y / vsb.h) * -1 + 1,
		}
	}

	/**
	 * Process shape changes and update fluid simulation accordingly.
	 * Handles both newly created shapes and updated shapes, including group shapes.
	 * Throttled to run at most once every 32ms for performance.
	 * @param created - Array of newly created shapes
	 * @param updated - Array of tuples containing [previousShape, currentShape] for updated shapes
	 */
	updateShapes = throttle((created: TLShape[], updated: [TLShape, TLShape][]): void => {
		if (!this.fluidSim) return
		const vsb = this.editor.getViewportScreenBounds()

		created.forEach((shape) => {
			if (shape.type === 'group') {
				const children = this.editor.getSortedChildIdsForParent(shape.id)
				children.forEach((childId) => {
					const child = this.editor.getShape(childId)
					if (!child) return
					this.handleNewShape(child, vsb)
				})
				return
			}
			this.handleNewShape(shape, vsb)
		})

		updated.forEach(([prevShape, shape]) => {
			if (shape.type === 'group') {
				const children = this.editor.getSortedChildIdsForParent(shape.id)
				children.forEach((childId) => {
					const child = this.editor.getShape(childId)
					if (!child) return
					this.handleNewShape(child, vsb)
				})
			} else {
				this.handleShapeChange(shape, prevShape, vsb)
			}
		})
	}, 32)

	/**
	 * Handle a newly created shape by extracting its geometry and creating fluid splats.
	 * @param shape - The newly created shape
	 * @param vsb - The viewport screen bounds
	 */
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

	/**
	 * Handle a shape update by calculating velocity from position change and creating fluid splats.
	 * @param shape - The current state of the shape
	 * @param prevShape - The previous state of the shape
	 * @param vsb - The viewport screen bounds
	 */
	private handleShapeChange = (shape: TLShape, prevShape: TLShape, vsb: Box): void => {
		const geometryData = this.extractShapeGeometry(shape, vsb)
		const color = this.getShapeColor(shape)
		const { velocityScale } = this.config
		if (geometryData.points.length > 0) {
			// Calculate velocity based on position change
			const velocity = {
				x: (shape.x - prevShape.x) * velocityScale,
				y: (shape.y - prevShape.y) * velocityScale - 0.05,
			}
			this.fluidSim!.createSplatsFromGeometry(
				geometryData.points,
				velocity,
				geometryData.isClosed,
				color
			)
		}
	}

	/**
	 * Handle viewport/camera changes by creating splats for all visible shapes.
	 * Throttled to prevent excessive updates during camera movements.
	 * @param vsb - The viewport screen bounds
	 * @param cameraVelocity - The velocity of the camera movement
	 */
	private handleViewportChange = throttle((vsb: Box, cameraVelocity: Vec): void => {
		const renderingShape = this.editor.getRenderingShapes()
		for (const { shape } of renderingShape) {
			const geometryData = this.extractShapeGeometry(shape, vsb)
			const color = this.getShapeColor(shape)
			if (geometryData.points.length > 0) {
				this.fluidSim!.createSplatsFromGeometry(
					geometryData.points,
					cameraVelocity,
					geometryData.isClosed,
					color
				)
			}
		}
	}, 32)

	/**
	 * Extract the color from a shape and convert it to RGB values.
	 * Uses the appropriate color map based on dark mode setting.
	 * @param shape - The shape to extract color from
	 * @returns RGB color values in the range [0, 1]
	 */
	private getShapeColor(shape: TLShape): [number, number, number] {
		try {
			// Try to get color from shape props
			let colorValue = 'black' // Default
			if (this.hasStringColorProp(shape)) {
				colorValue = (shape.props as any).color
			}

			// Convert tldraw color names to RGB values
			const colorMap = this.darkMode ? this.config.darkModeColorMap : this.config.lightModeColorMap
			const color = colorMap[colorValue] || colorMap.blue
			return color
		} catch (error) {
			console.warn('Failed to extract color for shape:', shape.type, error)
			return this.darkMode ? DEFAULT_DARK_MODE_COLOR_MAP.blue : DEFAULT_LIGHT_MODE_COLOR_MAP.blue // Default color
		}
	}

	/**
	 * Check if a shape has a valid string color property.
	 * @param shape - The shape to check
	 * @returns True if the shape has a string color property
	 */
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
			if (shape.type === 'arrow' || shape.type === 'line') {
				isClosed = false
			} else {
				if ('isClosed' in geometry && typeof geometry.isClosed === 'boolean') {
					isClosed = geometry.isClosed
				}
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
				const corners = bounds.corners
				const pointsPerEdge = Math.ceil(sampleCount / 4)
				for (let j = 0; j < 4; j++) {
					for (let i = 0; i < pointsPerEdge; i++) {
						points.push(
							transformAndNormalize(
								Vec.Lrp(corners[j], corners[(j + 1) % 4], i / pointsPerEdge),
								transform
							)
						)
					}
				}

				// Bounds-based shapes are typically closed
				isClosed = true
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
}
