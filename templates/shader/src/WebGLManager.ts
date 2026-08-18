import { Atom, computed, Editor, react } from 'tldraw'

export interface WebGLManagerConfig {
	quality: number
	startPaused: boolean
	pixelate: boolean
	contextAttributes?: WebGLContextAttributes
}

/**
 * Base class for WebGL-powered canvas managers integrated with tldraw's reactive system.
 *
 * Lifecycle:
 * 1. constructor() - Initialize reactive dependencies and quality monitoring
 * 2. initialize() - Create WebGL context and configure viewport
 * 3. onInitialize() - Hook for subclass resource setup (shaders, buffers, etc.)
 * 4. Animation loop (if not paused):
 *    - onUpdate() - Logic and state updates
 *    - onFirstRender() - One-time setup after context creation or resize
 *    - onRender() - Draw calls and rendering
 * 5. dispose() - Stop animation and clean up resources
 * 6. onDispose() - Hook for subclass cleanup
 */
export abstract class WebGLManager<T extends WebGLManagerConfig> {
	gl: WebGL2RenderingContext | null = null
	animationFrameId: number | null = null
	lastFrameTime = 0
	isInitialized = false
	isDisposed = false
	private _needsFirstRender = true

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
	 * Creates the WebGL2 context, runs onInitialize(), and starts the animation loop unless
	 * startPaused is set.
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

		this.gl = this.canvas.getContext('webgl2', contextAttributes)

		if (!this.gl) {
			throw Error('WebGL2 not available')
		}

		if (this.canvas.width > 0 && this.canvas.height > 0) {
			this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
		} else {
			console.warn('Canvas has zero dimensions, skipping viewport setup')
		}

		this.onInitialize()

		// The subclass may have called dispose() during initialization
		if (this.isDisposed) {
			console.error('Initialization was aborted')
			return
		}

		this.isInitialized = true
		this.lastFrameTime = performance.now()
		this.resize()

		if (!startPaused) {
			this.startAnimationLoop()
		}
	}

	/** Called after context creation, before the animation loop starts. Compile shaders, create buffers, etc. */
	protected onInitialize = (): void => {}

	private startAnimationLoop = (): void => {
		const frame = (currentTime: number) => {
			if (this.isDisposed) return

			const deltaTime = (currentTime - this.lastFrameTime) / 1000
			this.lastFrameTime = currentTime

			this.onUpdate(deltaTime, currentTime)
			this.onRender(deltaTime, currentTime)

			this.animationFrameId = requestAnimationFrame(frame)
		}

		this.animationFrameId = requestAnimationFrame(frame)
	}

	/**
	 * Called once per frame before onRender().
	 * @param deltaTime - Seconds since the previous frame
	 * @param currentTime - performance.now() timestamp in milliseconds
	 */
	protected onUpdate = (_deltaTime: number, _currentTime: number): void => {}

	/** Called before the first onRender() after context creation and after each resize. */
	protected onFirstRender = (): void => {}

	/**
	 * Called once per frame after onUpdate().
	 * @param deltaTime - Seconds since the previous frame
	 * @param currentTime - performance.now() timestamp in milliseconds
	 */
	protected onRender = (_deltaTime: number, _currentTime: number): void => {}

	/** Called during dispose() before the WebGL context is dropped. Delete GPU resources here. */
	protected onDispose = (): void => {}

	/** Stops the animation loop and releases all resources. The instance cannot be reused. */
	dispose = (): void => {
		this.disposables.forEach((dispose) => dispose())
		this.disposables.clear()

		if (this.isDisposed) {
			console.warn('WebGLManager already disposed')
			return
		}

		this.pause()
		this.onDispose()

		// Drop the reference rather than forcing context loss, which conflicts with React unmounting
		this.gl = null

		this.isDisposed = true
		this.isInitialized = false
	}

	/**
	 * Matches canvas resolution to its bounding rect scaled by quality. Runs automatically when
	 * viewport bounds or quality change, and renders a frame immediately if the loop is paused.
	 */
	resize = (): void => {
		if (!this.isInitialized || this.isDisposed || !this.gl) {
			return
		}

		this.updateCanvasSize()
		this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
		this._needsFirstRender = true

		if (!this.isRunning()) {
			this.tick()
		}
	}

	private updateCanvasSize() {
		const { width, height } = this.canvas.getBoundingClientRect()
		const { quality } = this.getConfig()
		this.canvas.width = Math.floor(width * quality)
		this.canvas.height = Math.floor(height * quality)
	}

	pause = (): void => {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId)
			this.animationFrameId = null
		}
	}

	resume = (): void => {
		if (this.animationFrameId === null && this.isInitialized && !this.isDisposed) {
			// Reset so the first frame after resuming doesn't see a huge deltaTime
			this.lastFrameTime = performance.now()
			this.startAnimationLoop()
		}
	}

	/** Runs a single update/render cycle. Useful for on-demand rendering while paused. */
	tick = (): void => {
		if (this.isDisposed) return

		const currentTime = performance.now()
		const deltaTime = (currentTime - this.lastFrameTime) / 1000
		this.lastFrameTime = currentTime

		this.onUpdate(deltaTime, currentTime)

		if (this._needsFirstRender) {
			this.updateCanvasSize()
			this.onFirstRender()
			this._needsFirstRender = false
		}

		this.onRender(deltaTime, currentTime)
	}

	isRunning = (): boolean => {
		return this.animationFrameId !== null
	}
}
