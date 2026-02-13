/* eslint-disable no-restricted-properties */

/**
 * A utility class for managing timeouts, intervals, and animation frames with context-based organization and automatic cleanup.
 * Helps prevent memory leaks by organizing timers into named contexts that can be cleared together.
 * @example
 * ```ts
 * const timers = new Timers()
 *
 * // Set timers with context organization
 * timers.setTimeout('ui', () => console.log('Auto save'), 5000)
 * timers.setInterval('ui', () => console.log('Refresh'), 1000)
 * timers.requestAnimationFrame('ui', () => console.log('Render'))
 *
 * // Clear all timers for a context
 * timers.dispose('ui')
 *
 * // Or get context-bound functions
 * const uiTimers = timers.forContext('ui')
 * uiTimers.setTimeout(() => console.log('Contextual timeout'), 1000)
 * ```
 * @public
 */
export class Timers {
	private timeouts = new Map<string, number[]>()
	private intervals = new Map<string, number[]>()
	private rafs = new Map<string, number[]>()

	/**
	 * Creates a new Timers instance with bound methods for safe callback usage.
	 * @example
	 * ```ts
	 * const timers = new Timers()
	 * // Methods are pre-bound, safe to use as callbacks
	 * element.addEventListener('click', timers.dispose)
	 * ```
	 */
	constructor() {
		this.setTimeout = this.setTimeout.bind(this)
		this.setInterval = this.setInterval.bind(this)
		this.requestAnimationFrame = this.requestAnimationFrame.bind(this)
		this.dispose = this.dispose.bind(this)
	}

	/**
	 * Creates a timeout that will be tracked under the specified context.
	 * @param contextId - The context identifier to group this timer under.
	 * @param handler - The function to execute when the timeout expires.
	 * @param timeout - The delay in milliseconds (default: 0).
	 * @param args - Additional arguments to pass to the handler.
	 * @returns The timer ID that can be used with clearTimeout.
	 * @example
	 * ```ts
	 * const timers = new Timers()
	 * const id = timers.setTimeout('autosave', () => save(), 5000)
	 * // Timer will be automatically cleared when 'autosave' context is disposed
	 * ```
	 * @public
	 */
	setTimeout(contextId: string, handler: TimerHandler, timeout?: number, ...args: any[]): number {
		const id = window.setTimeout(handler, timeout, args)
		const current = this.timeouts.get(contextId) ?? []
		this.timeouts.set(contextId, [...current, id])
		return id
	}

	/**
	 * Creates an interval that will be tracked under the specified context.
	 * @param contextId - The context identifier to group this timer under.
	 * @param handler - The function to execute repeatedly.
	 * @param timeout - The delay in milliseconds between executions (default: 0).
	 * @param args - Additional arguments to pass to the handler.
	 * @returns The interval ID that can be used with clearInterval.
	 * @example
	 * ```ts
	 * const timers = new Timers()
	 * const id = timers.setInterval('refresh', () => updateData(), 1000)
	 * // Interval will be automatically cleared when 'refresh' context is disposed
	 * ```
	 * @public
	 */
	setInterval(contextId: string, handler: TimerHandler, timeout?: number, ...args: any[]): number {
		const id = window.setInterval(handler, timeout, args)
		const current = this.intervals.get(contextId) ?? []
		this.intervals.set(contextId, [...current, id])
		return id
	}

	/**
	 * Requests an animation frame that will be tracked under the specified context.
	 * @param contextId - The context identifier to group this animation frame under.
	 * @param callback - The function to execute on the next animation frame.
	 * @returns The request ID that can be used with cancelAnimationFrame.
	 * @example
	 * ```ts
	 * const timers = new Timers()
	 * const id = timers.requestAnimationFrame('render', () => draw())
	 * // Animation frame will be automatically cancelled when 'render' context is disposed
	 * ```
	 * @public
	 */
	requestAnimationFrame(contextId: string, callback: FrameRequestCallback): number {
		const id = window.requestAnimationFrame(callback)
		const current = this.rafs.get(contextId) ?? []
		this.rafs.set(contextId, [...current, id])
		return id
	}

	/**
	 * Disposes of all timers associated with the specified context.
	 * Clears all timeouts, intervals, and animation frames for the given context ID.
	 * @param contextId - The context identifier whose timers should be cleared.
	 * @returns void
	 * @example
	 * ```ts
	 * const timers = new Timers()
	 * timers.setTimeout('ui', () => console.log('timeout'), 1000)
	 * timers.setInterval('ui', () => console.log('interval'), 500)
	 *
	 * // Clear all 'ui' context timers
	 * timers.dispose('ui')
	 * ```
	 * @public
	 */
	dispose(contextId: string) {
		this.timeouts.get(contextId)?.forEach((id) => clearTimeout(id))
		this.intervals.get(contextId)?.forEach((id) => clearInterval(id))
		this.rafs.get(contextId)?.forEach((id) => cancelAnimationFrame(id))

		this.timeouts.delete(contextId)
		this.intervals.delete(contextId)
		this.rafs.delete(contextId)
	}

	/**
	 * Disposes of all timers across all contexts.
	 * Clears every timeout, interval, and animation frame managed by this instance.
	 * @returns void
	 * @example
	 * ```ts
	 * const timers = new Timers()
	 * timers.setTimeout('ui', () => console.log('ui'), 1000)
	 * timers.setTimeout('background', () => console.log('bg'), 2000)
	 *
	 * // Clear everything
	 * timers.disposeAll()
	 * ```
	 * @public
	 */
	disposeAll() {
		for (const contextId of this.timeouts.keys()) {
			this.dispose(contextId)
		}
	}

	/**
	 * Returns an object with timer methods bound to a specific context.
	 * Convenient for getting context-specific timer functions without repeatedly passing the contextId.
	 * @param contextId - The context identifier to bind the returned methods to.
	 * @returns An object with setTimeout, setInterval, requestAnimationFrame, and dispose methods bound to the context.
	 * @example
	 * ```ts
	 * const timers = new Timers()
	 * const uiTimers = timers.forContext('ui')
	 *
	 * // These are equivalent to calling timers.setTimeout('ui', ...)
	 * uiTimers.setTimeout(() => console.log('timeout'), 1000)
	 * uiTimers.setInterval(() => console.log('interval'), 500)
	 * uiTimers.requestAnimationFrame(() => console.log('frame'))
	 *
	 * // Dispose only this context
	 * uiTimers.dispose()
	 * ```
	 * @public
	 */
	forContext(contextId: string) {
		return {
			setTimeout: (handler: TimerHandler, timeout?: number, ...args: any[]) =>
				this.setTimeout(contextId, handler, timeout, args),
			setInterval: (handler: TimerHandler, timeout?: number, ...args: any[]) =>
				this.setInterval(contextId, handler, timeout, args),
			requestAnimationFrame: (callback: FrameRequestCallback) =>
				this.requestAnimationFrame(contextId, callback),
			dispose: () => this.dispose(contextId),
		}
	}
}
