/* eslint-disable no-restricted-properties */

/** @public */
export class Timers {
	private timeouts = new Map<string, number[]>()
	private intervals = new Map<string, number[]>()
	private rafs = new Map<string, number[]>()

	constructor() {
		this.setTimeout = this.setTimeout.bind(this)
		this.setInterval = this.setInterval.bind(this)
		this.requestAnimationFrame = this.requestAnimationFrame.bind(this)
		this.dispose = this.dispose.bind(this)
	}

	/** @public */
	setTimeout(contextId: string, handler: TimerHandler, timeout?: number, ...args: any[]): number {
		const id = window.setTimeout(handler, timeout, args)
		const current = this.timeouts.get(contextId) ?? []
		this.timeouts.set(contextId, [...current, id])
		return id
	}

	/** @public */
	setInterval(contextId: string, handler: TimerHandler, timeout?: number, ...args: any[]): number {
		const id = window.setInterval(handler, timeout, args)
		const current = this.intervals.get(contextId) ?? []
		this.intervals.set(contextId, [...current, id])
		return id
	}

	/** @public */
	requestAnimationFrame(contextId: string, callback: FrameRequestCallback): number {
		const id = window.requestAnimationFrame(callback)
		const current = this.rafs.get(contextId) ?? []
		this.rafs.set(contextId, [...current, id])
		return id
	}

	/** @public */
	dispose(contextId: string) {
		this.timeouts.get(contextId)?.forEach((id) => clearTimeout(id))
		this.intervals.get(contextId)?.forEach((id) => clearInterval(id))
		this.rafs.get(contextId)?.forEach((id) => cancelAnimationFrame(id))

		this.timeouts.delete(contextId)
		this.intervals.delete(contextId)
		this.rafs.delete(contextId)
	}

	disposeAll() {
		for (const contextId of this.timeouts.keys()) {
			this.dispose(contextId)
		}
	}

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
