/**
 * Generic WebGL manager class that provides lifecycle hooks for WebGL-based applications.
 * Manages the WebGL context, animation loop, and provides game-engine-like lifecycle methods.
 *
 * Lifecycle order:
 * 1. constructor - Set up initial state
 * 2. initialize() - Create WebGL context and set up resources
 * 3. onInitialize() - Override to initialize custom resources
 * 4. Animation loop starts:
 *    - onUpdate() - Override for logic updates
 *    - onRender() - Override for rendering
 * 5. dispose() - Clean up all resources
 * 6. onDispose() - Override to clean up custom resources
 */
export abstract class WebGLManager {
	gl: WebGLRenderingContext | WebGL2RenderingContext | null = null
	animationFrameId: number | null = null
	quality: number
	lastFrameTime: number = 0
	isInitialized: boolean = false
	isDisposed: boolean = false

	constructor(
		readonly canvas: HTMLCanvasElement,
		quality: number = 1
	) {
		this.quality = quality
	}

	/**
	 * Initialize the WebGL context and set up the rendering loop.
	 * Call this before using any WebGL functionality.
	 * @param useWebGL2 - Whether to use WebGL2 context (defaults to true)
	 * @param contextAttributes - Optional WebGL context attributes
	 * @param startPaused - Whether to start paused (defaults to false)
	 */
	initialize = (
		useWebGL2: boolean = true,
		contextAttributes?: WebGLContextAttributes,
		startPaused: boolean = false
	): void => {
		if (this.isInitialized) {
			console.warn('WebGLManager already initialized')
			return
		}

		if (this.isDisposed) {
			console.error('Cannot initialize disposed WebGLManager')
			return
		}

		// Create WebGL context
		const contextType = useWebGL2 ? 'webgl2' : 'webgl'

		this.gl = this.canvas.getContext(contextType, contextAttributes) as
			| WebGLRenderingContext
			| WebGL2RenderingContext
			| null

		if (!this.gl) {
			// Fallback to WebGL1 if WebGL2 is not available
			if (useWebGL2) {
				console.warn('WebGL2 not available, falling back to WebGL1')
				this.gl = this.canvas.getContext('webgl', contextAttributes) as WebGLRenderingContext | null
			}

			if (!this.gl) {
				throw new Error('Failed to get WebGL context')
			}
		}

		// Set viewport to match canvas size
		if (this.canvas.width > 0 && this.canvas.height > 0) {
			this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
		} else {
			console.warn('Canvas has zero dimensions, skipping viewport setup')
		}

		// Call custom initialization hook BEFORE marking as initialized
		this.onInitialize()

		// Only proceed if onInitialize succeeded
		// Subclasses should set a flag or we check if essential resources exist
		if (this.isDisposed) {
			console.error('Initialization was aborted')
			return
		}

		this.isInitialized = true
		this.lastFrameTime = performance.now()

		// Start the animation loop only if not paused
		if (!startPaused) {
			this.startAnimationLoop()
		}
	}

	/**
	 * Override this method to initialize custom WebGL resources.
	 * Called after the WebGL context is created but before the first frame.
	 */
	protected onInitialize = (): void => {
		// Override in subclass
	}

	/**
	 * Start the animation loop.
	 */
	private startAnimationLoop = (): void => {
		const frame = (currentTime: number) => {
			if (this.isDisposed) return

			const deltaTime = (currentTime - this.lastFrameTime) / 1000 // Convert to seconds
			this.lastFrameTime = currentTime

			// Call lifecycle hooks
			this.onUpdate(deltaTime, currentTime)
			this.onRender(deltaTime, currentTime)

			// Schedule next frame
			this.animationFrameId = requestAnimationFrame(frame)
		}

		this.animationFrameId = requestAnimationFrame(frame)
	}

	/**
	 * Override this method to update application state and logic.
	 * Called once per frame before onRender.
	 * @param deltaTime - Time elapsed since last frame in seconds
	 * @param currentTime - Current timestamp from performance.now()
	 */
	protected onUpdate = (_deltaTime: number, _currentTime: number): void => {
		// Override in subclass
	}

	/**
	 * Override this method to render the scene.
	 * Called after onUpdate.
	 * @param deltaTime - Time elapsed since last frame in seconds
	 * @param currentTime - Current timestamp from performance.now()
	 */
	protected onRender = (_deltaTime: number, _currentTime: number): void => {
		// Override in subclass
	}

	/**
	 * Override this method to clean up custom resources.
	 * Called during dispose() before the WebGL context is destroyed.
	 */
	protected onDispose = (): void => {
		// Override in subclass
	}

	/**
	 * Stop the animation loop and clean up all resources.
	 * After calling dispose(), this instance cannot be reused.
	 */
	dispose = (): void => {
		if (this.isDisposed) {
			console.warn('WebGLManager already disposed')
			return
		}

		// Stop animation loop
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId)
			this.animationFrameId = null
		}

		// Call custom disposal hook
		this.onDispose()

		// Clear GL reference (don't explicitly lose context as it can interfere with React)
		this.gl = null

		this.isDisposed = true
		this.isInitialized = false
	}

	/**
	 * Check if the manager has been initialized.
	 */
	getIsInitialized = (): boolean => {
		return this.isInitialized
	}

	/**
	 * Check if the manager has been disposed.
	 */
	getIsDisposed = (): boolean => {
		return this.isDisposed
	}

	/**
	 * Get the WebGL context.
	 * Returns null if not initialized or disposed.
	 */
	getGL = (): WebGLRenderingContext | WebGL2RenderingContext | null => {
		return this.gl
	}

	/**
	 * Get the canvas element.
	 */
	getCanvas = (): HTMLCanvasElement => {
		return this.canvas
	}

	/**
	 * Resize the canvas and update the WebGL viewport.
	 * Call this when the canvas size changes.
	 * If the animation loop is paused, triggers a single frame render.
	 * @param width - New canvas width
	 * @param height - New canvas height
	 */
	resize = (): void => {
		const { width, height } = this.canvas.getBoundingClientRect()
		if (!this.isInitialized || this.isDisposed || !this.gl) {
			return
		}

		this.canvas.width = Math.floor(width * this.quality)
		this.canvas.height = Math.floor(height * this.quality)

		// Apply quality (resolution scale) to the internal canvas resolution
		this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)

		// If paused, trigger a single frame render to show the resize
		if (!this.isRunning()) {
			this.renderFrame()
		}
	}

	/**
	 * Pause the animation loop.
	 */
	pause = (): void => {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId)
			this.animationFrameId = null
		}
	}

	/**
	 * Resume the animation loop if it was paused.
	 */
	resume = (): void => {
		if (this.animationFrameId === null && this.isInitialized && !this.isDisposed) {
			this.lastFrameTime = performance.now()
			this.startAnimationLoop()
		}
	}

	/**
	 * Manually trigger a single frame render.
	 * Useful for on-demand rendering when the animation loop is paused.
	 */
	renderFrame = (): void => {
		if (!this.isInitialized || this.isDisposed) return

		const currentTime = performance.now()
		const deltaTime = (currentTime - this.lastFrameTime) / 1000
		this.lastFrameTime = currentTime

		// Call lifecycle hooks
		this.onUpdate(deltaTime, currentTime)
		this.onRender(deltaTime, currentTime)
	}

	/**
	 * Check if the animation loop is currently running.
	 */
	isRunning = (): boolean => {
		return this.animationFrameId !== null
	}

	/**
	 * Set the quality (resolution scale) of the canvas.
	 * @param quality - Resolution multiplier (e.g., 0.5 = half resolution, 1.0 = full resolution, 2.0 = double resolution)
	 */
	setQuality = (quality: number): void => {
		this.quality = Math.max(0.1, Math.min(4.0, quality)) // Clamp between 0.1 and 4.0
		this.resize() // Apply the new quality
	}

	/**
	 * Get the current quality (resolution scale).
	 */
	getQuality = (): number => {
		return this.quality
	}
}
