import { PERFORMANCE_COLORS, PERFORMANCE_PREFIX_COLOR } from './perf'

/** @public */
export class PerformanceTracker {
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
		const fps = duration === 0 ? 0 : Math.floor(this.frames / duration)
		const background =
			fps > 55
				? PERFORMANCE_COLORS.Good
				: fps > 30
					? PERFORMANCE_COLORS.Mid
					: PERFORMANCE_COLORS.Poor
		const color = background === PERFORMANCE_COLORS.Mid ? 'black' : 'white'
		const capitalized = this.name[0].toUpperCase() + this.name.slice(1)
		// eslint-disable-next-line no-console
		console.debug(
			`%cPerf%c ${capitalized} %c${fps}%c fps`,
			`color: white; background: ${PERFORMANCE_PREFIX_COLOR};padding: 2px;border-radius: 3px;`,
			'font-weight: normal',
			`font-weight: bold; padding: 2px; background: ${background};color: ${color};`,
			'font-weight: normal'
		)
	}

	isStarted() {
		return this.started
	}
}
