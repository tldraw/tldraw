import { Box, Editor, react, throttle, TLShape, Vec } from 'tldraw'
import { FluidSimulation } from './fluid'

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

export interface FluidManagerConfig {
	/** Quality mode affects canvas resolution */
	quality: number
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

const DEFAULT_CONFIG: FluidManagerConfig = {
	quality: 0.5,
	velocityScale: 0.01,
	boundsSampleCount: 20,
	randomSplatsRange: [5, 20],
	bloom: true,
	sunrays: true,
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
	private config: Required<FluidManagerConfig> = DEFAULT_CONFIG
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
			editor.store.listen(
				(diff) => {
					const added = Object.values(diff.changes.added).filter(
						(record) => record.typeName === 'shape'
					) as TLShape[]

					const updated = Object.values(diff.changes.updated).filter(
						([record]) => record.typeName === 'shape'
					) as [TLShape, TLShape][]

					this.updateShapes(added, updated)
				},
				{ scope: 'document' }
			)
		)
	}

	/**
	 * Initialize the fluid simulation with the canvas.
	 * Must be called before using other methods.
	 */
	initialize(darkMode: boolean = false): void {
		this.darkMode = darkMode

		const resolutionScale = this.config.quality

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
		this.disposables.forEach((dispose) => dispose())
		this.disposables.clear()
	}

	/**
	 * Handle pointer down.
	 */
	handlePointerDown = (): void => {
		if (!this.isPointerEffectActive) return
		const { x, y } = this.getNormalizedPosition()
		this.fluidSim?.startDrag(x, y)
	}

	/**
	 * Handle pointer movement.
	 */
	handlePointerMove = (): void => {
		if (!this.isPointerEffectActive || !this.editor.inputs.isDragging) return
		const { x, y } = this.getNormalizedPosition()
		this.fluidSim?.updateDrag(x, y)
	}

	/**
	 * Handle pointer up.
	 */
	handlePointerUp = (): void => {
		if (!this.isPointerEffectActive || !this.editor.inputs.isDragging) return
		this.fluidSim?.endDrag()
	}

	// Private helper methods

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
	 * Call this method when shapes are created, modified, or deleted.
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
		const { velocityScale } = this.config
		if (geometryData.points.length > 0) {
			// Calculate velocity based on position change
			const velocity = {
				x: (shape.x - prevShape.x) * velocityScale,
				y: (shape.y - prevShape.y) * velocityScale,
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

			return (
				colorMap[colorValue] ||
				(this.darkMode ? DEFAULT_DARK_MODE_COLOR_MAP.blue : DEFAULT_LIGHT_MODE_COLOR_MAP.blue)
			) // Default blue-ish
		} catch (error) {
			console.warn('Failed to extract color for shape:', shape.type, error)
			return this.darkMode ? DEFAULT_DARK_MODE_COLOR_MAP.blue : DEFAULT_LIGHT_MODE_COLOR_MAP.blue // Default color
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
