/* eslint-disable no-restricted-properties */

/** @public */
export class Timers {
	private timeouts: number[] = []
	private intervals: number[] = []
	private rafs: number[] = []

	/** @public */
	setTimeout(handler: TimerHandler, timeout?: number, ...args: any[]): number {
		const id = window.setTimeout(handler, timeout, args)
		this.timeouts.push(id)
		return id
	}

	/** @public */
	setInterval(handler: TimerHandler, timeout?: number, ...args: any[]): number {
		const id = window.setInterval(handler, timeout, args)
		this.intervals.push(id)
		return id
	}

	/** @public */
	requestAnimationFrame(callback: FrameRequestCallback): number {
		const id = window.requestAnimationFrame(callback)
		this.rafs.push(id)
		return id
	}

	/** @public */
	dispose() {
		this.timeouts.forEach((id) => clearTimeout(id))
		this.intervals.forEach((id) => clearInterval(id))
		this.rafs.forEach((id) => cancelAnimationFrame(id))

		this.timeouts.length = 0
		this.intervals.length = 0
		this.rafs.length = 0
	}
}
