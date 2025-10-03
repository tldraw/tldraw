import { Atom, computed, Editor, react } from 'tldraw'

export interface WebGLManagerConfig {
	quality: number
	startPaused: boolean
	pixelate: boolean
	contextAttributes?: WebGLContextAttributes
}

/**
 * Base class for WebGL-powered canvas managers integrated with tldraw's reactive system.
 * Provides lifecycle hooks, animation loop management, and automatic viewport synchronization.
 *
 * Lifecycle:
 * 1. constructor() - Initialize reactive dependencies and quality monitoring
 * 2. initialize() - Create WebGL context and configure viewport
 * 3. onInitialize() - Hook for subclass resource setup (shaders, buffers, etc.)
 * 4. Animation loop (if not paused):
 *    - onUpdate() - Logic and state updates
 *    - onFirstRender() - One-time setup after context creation
 *    - onRender() - Draw calls and rendering
 * 5. dispose() - Stop animation and clean up resources
 * 6. onDispose() - Hook for subclass cleanup
 */
export abstract class WebGLManager<T extends WebGLManagerConfig> {
	gl: WebGLRenderingContext | WebGL2RenderingContext | null = null
	animationFrameId: number | null = null
	lastFrameTime: number = 0
	isInitialized: boolean = false
	isDisposed: boolean = false
	private _needsFirstRender: boolean = true

	disposables = new Set<() => void>()

	constructor(
		readonly editor: Editor,
		readonly canvas: HTMLCanvasElement,
		public configAtom: Atom<T, unknown>
	) {
		this.disposables.add(
			react('quality changed', () => {
				editor.getViewportScreenBounds()
				this.getQuality()
				this.resize()
			})
		)
	}

	@computed getQuality() {
		return this.getConfig().quality
	}

	@computed getConfig() {
		return this.configAtom.get()
	}

	/**
	 * Creates the WebGL2 context and initializes the manager.
	 * Must be called before any rendering operations. Calls onInitialize() hook for subclass setup.
	 * Automatically starts the animation loop unless startPaused is true in config.
	 */
	initialize = (): void => {
		const { startPaused, contextAttributes } = this.getConfig()

		if (this.isInitialized) {
			console.warn('WebGLManager already initialized')
			return
		}

		if (this.isDisposed) {
			console.error('Cannot initialize disposed WebGLManager')
			return
		}

		// Create WebGL2 context with optional attributes
		const contextType = 'webgl2'

		this.gl = this.canvas.getContext(contextType, contextAttributes) as
			| WebGLRenderingContext
			| WebGL2RenderingContext
			| null

		if (!this.gl) {
			throw Error('WebGL2 not available')
		}

		// Configure viewport to match canvas dimensions
		if (this.canvas.width > 0 && this.canvas.height > 0) {
			this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
		} else {
			console.warn('Canvas has zero dimensions, skipping viewport setup')
		}

		// Execute subclass initialization hook before marking as ready
		this.onInitialize()

		// Abort if subclass called dispose() during initialization
		if (this.isDisposed) {
			console.error('Initialization was aborted')
			return
		}

		this.isInitialized = true
		this.lastFrameTime = performance.now()

		// Begin animation loop unless configured to start paused
		if (!startPaused) {
			this.startAnimationLoop()
		}
	}

	/**
	 * Lifecycle hook for subclass-specific initialization.
	 * Called after WebGL context creation but before animation loop starts.
	 * Use this to compile shaders, create buffers, load textures, etc.
	 */
	protected onInitialize = (): void => {
		// Override in subclass
	}

	/**
	 * Begins the requestAnimationFrame loop, calling onUpdate() and onRender() each frame.
	 */
	private startAnimationLoop = (): void => {
		const frame = (currentTime: number) => {
			if (this.isDisposed) return

			const deltaTime = (currentTime - this.lastFrameTime) / 1000
			this.lastFrameTime = currentTime

			// Execute lifecycle hooks each frame
			this.onUpdate(deltaTime, currentTime)
			this.onRender(deltaTime, currentTime)

			// Queue next frame
			this.animationFrameId = requestAnimationFrame(frame)
		}

		this.animationFrameId = requestAnimationFrame(frame)
	}

	/**
	 * Lifecycle hook for logic and state updates.
	 * Called once per frame before onRender(). Override to update uniforms, animation state, etc.
	 * @param deltaTime - Seconds elapsed since previous frame
	 * @param currentTime - Absolute timestamp from performance.now() in milliseconds
	 */
	protected onUpdate = (_deltaTime: number, _currentTime: number): void => {
		// Override in subclass
	}

	/**
	 * Lifecycle hook called once after context creation or recreation.
	 * Invoked before the first onRender() call and after resize events that recreate the canvas.
	 * Use this for one-time setup that depends on final canvas dimensions.
	 */
	protected onFirstRender = (): void => {
		// Override in subclass
	}

	/**
	 * Lifecycle hook for rendering to the canvas.
	 * Called after onUpdate() each frame. Override to execute draw calls and render your scene.
	 * @param deltaTime - Seconds elapsed since previous frame
	 * @param currentTime - Absolute timestamp from performance.now() in milliseconds
	 */
	protected onRender = (_deltaTime: number, _currentTime: number): void => {
		// Override in subclass
	}

	/**
	 * Lifecycle hook for cleanup of subclass-specific resources.
	 * Called during dispose() before clearing the WebGL context.
	 * Use this to delete shaders, buffers, textures, and other GPU resources.
	 */
	protected onDispose = (): void => {
		// Override in subclass
	}

	/**
	 * Stops the animation loop and releases all resources.
	 * Calls onDispose() hook for subclass cleanup. Instance cannot be reused after disposal.
	 */
	dispose = (): void => {
		this.disposables.forEach((dispose) => dispose())
		this.disposables.clear()

		if (this.isDisposed) {
			console.warn('WebGLManager already disposed')
			return
		}

		// Cancel any pending animation frame
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId)
			this.animationFrameId = null
		}

		// Execute subclass cleanup hook
		this.onDispose()

		// Clear WebGL context reference (avoid explicit context loss to prevent React conflicts)
		this.gl = null

		this.isDisposed = true
		this.isInitialized = false
	}

	/**
	 * Returns true if initialize() has been called successfully.
	 */
	getIsInitialized = (): boolean => {
		return this.isInitialized
	}

	/**
	 * Returns true if dispose() has been called.
	 */
	getIsDisposed = (): boolean => {
		return this.isDisposed
	}

	/**
	 * Returns the WebGL rendering context, or null if not initialized or disposed.
	 */
	getGL = (): WebGLRenderingContext | WebGL2RenderingContext | null => {
		return this.gl
	}

	/**
	 * Returns the HTMLCanvasElement this manager is rendering to.
	 */
	getCanvas = (): HTMLCanvasElement => {
		return this.canvas
	}

	/**
	 * Updates canvas dimensions and WebGL viewport based on current bounding rect and quality setting.
	 * Automatically called when viewport bounds or quality changes via reactive dependency.
	 * Triggers onFirstRender() and a single frame if animation loop is paused.
	 */
	resize = (): void => {
		const { width, height } = this.canvas.getBoundingClientRect()
		if (!this.isInitialized || this.isDisposed || !this.gl) {
			return
		}

		const { quality } = this.getConfig()
		this.canvas.width = Math.floor(width * quality)
		this.canvas.height = Math.floor(height * quality)

		// Update WebGL viewport to match new canvas resolution
		this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)

		// Flag that onFirstRender() should be called on next frame
		this._needsFirstRender = true

		// Render immediately if paused to reflect resize
		if (!this.isRunning()) {
			this.tick()
		}
	}

	/**
	 * Stops the animation loop by canceling the current requestAnimationFrame.
	 */
	pause = (): void => {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId)
			this.animationFrameId = null
		}
	}

	/**
	 * Restarts the animation loop if currently paused.
	 * Resets lastFrameTime to prevent large deltaTime jump.
	 */
	resume = (): void => {
		if (this.animationFrameId === null && this.isInitialized && !this.isDisposed) {
			this.lastFrameTime = performance.now()
			this.startAnimationLoop()
		}
	}

	/**
	 * Executes a single frame update and render cycle manually.
	 * Useful for on-demand rendering when paused, or for controlled frame stepping.
	 * Calls onFirstRender() if needed, then onUpdate() and onRender().
	 */
	tick = (): void => {
		if (this.isDisposed) return

		const currentTime = performance.now()
		const deltaTime = (currentTime - this.lastFrameTime) / 1000
		this.lastFrameTime = currentTime

		// Execute update hook
		this.onUpdate(deltaTime, currentTime)

		if (this._needsFirstRender) {
			// Ensure canvas has correct dimensions before first render
			const { width, height } = this.canvas.getBoundingClientRect()
			const { quality } = this.getConfig()
			this.canvas.width = Math.floor(width * quality)
			this.canvas.height = Math.floor(height * quality)

			this.onFirstRender()
			this._needsFirstRender = false
		}

		this.onRender(deltaTime, currentTime)
	}

	/**
	 * Returns true if the animation loop is actively running via requestAnimationFrame.
	 */
	isRunning = (): boolean => {
		return this.animationFrameId !== null
	}
}
