/** @internal */
export class FpsTracker {
	private startTime = 0
	private name = ''
	private shouldMeasure = true
	private frames = 0
	private started = false
	private frame: number | null = null

	recordFrame = () => {
		this.frames++
		if (!this.started) return
		this.frame = requestAnimationFrame(this.recordFrame)
	}

	start(name: string) {
		if (!this.shouldMeasure) return
		this.name = name
		this.frames = 0
		this.started = true
		this.frame = requestAnimationFrame(this.recordFrame)
		this.startTime = performance.now()
	}

	stop() {
		if (!this.shouldMeasure) return
		this.started = false
		if (this.frame !== null) cancelAnimationFrame(this.frame)
		// eslint-disable-next-line no-console
		console.log(`${this.name} FPS:`, this.frames / ((performance.now() - this.startTime) / 1000))
	}

	isStarted() {
		return this.started
	}
}
