/** @internal */
export class GlobalTick {
	prev = 0
	tickLength = 1000 / 60
	frame = -1
	listeners = new Set<(elapsed: number) => void>()

	tick = () => {
		const now = Date.now()
		const elapsed = now - this.prev
		if (elapsed >= this.tickLength) {
			this.prev = now
			this.listeners.forEach((listener) => listener(elapsed))
		}
		this.frame = requestAnimationFrame(this.tick)
	}

	addListener = (listener: (elapsed: number) => void) => {
		this.listeners.add(listener)
		return () => this.removeListener(listener)
	}

	once = (listener: (elapsed: number) => void) => {
		const cancel = (elapsed: number) => {
			listener(elapsed)
			this.listeners.delete(cancel)
		}
		this.listeners.add(cancel)
		return () => this.listeners.delete(cancel)
	}

	removeListener = (listener: (elapsed: number) => void) => {
		this.listeners.delete(listener)
	}

	removeListeners = () => {
		this.listeners.clear()
	}

	start = (fps = 60) => {
		if (typeof window !== 'undefined') {
			if ((window as any).GLOBAL_TICK_FRAME) {
				;(window as any).GLOBAL_TICK_FRAME.dispose()
				delete (window as any).GLOBAL_TICK_FRAME
			}
			;(window as any).GLOBAL_TICK_FRAME = this
		}
		this.tickLength = 1000 / fps
		this.prev = Date.now()
		this.tick()
		return () => this.stop()
	}

	stop() {
		cancelAnimationFrame(this.frame)
	}

	dispose() {
		this.removeListeners()
		this.stop()
	}
}

/** @public */
const globalTick = new GlobalTick()
globalTick.start()

export { globalTick }
