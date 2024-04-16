/** @public */
export class FpsTracker {
	private startTime = 0
	private name = ''
	private frames = 0
	private started = false
	private frame: number | null = null

	recordFrame = () => {
		this.frames++
		if (!this.started) return
		this.frame = requestAnimationFrame(this.recordFrame)
	}

	start(name: string) {
		this.name = name
		this.frames = 0
		this.started = true
		if (this.frame !== null) cancelAnimationFrame(this.frame)
		this.frame = requestAnimationFrame(this.recordFrame)
		this.startTime = performance.now()
	}

	stop() {
		this.started = false
		if (this.frame !== null) cancelAnimationFrame(this.frame)
		const duration = (performance.now() - this.startTime) / 1000
		const fps = duration === 0 ? 0 : this.frames / duration
		// eslint-disable-next-line no-console
		console.log(`${this.name} FPS:`, fps)
	}

	isStarted() {
		return this.started
	}
}
