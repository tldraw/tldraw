import { Page } from '@playwright/test'

export interface FPSMetrics {
	averageFps: number
	minFps: number
	maxFps: number
	totalFrames: number
	duration: number
	samples: number[]
}

export class E2EFpsTracker {
	private isTracking = false
	private startTime = 0
	private frameCount = 0
	private fpsSamples: number[] = []
	private rafId: number | null = null
	private sampleInterval = 100 // Sample FPS every 100ms

	constructor(private page: Page) {}

	async start(): Promise<void> {
		if (this.isTracking) {
			throw new Error('FPS tracking is already running')
		}

		this.isTracking = true
		this.startTime = 0
		this.frameCount = 0
		this.fpsSamples = []
		this.rafId = null

		// Inject FPS tracking script into the page
		await this.page.evaluate(
			({ sampleInterval }) => {
				;(window as any).__e2eFpsTracker = {
					isTracking: true,
					startTime: performance.now(),
					frameCount: 0,
					fpsSamples: [],
					lastSampleTime: performance.now(),
					sampleInterval,

					trackFrame: function () {
						if (!this.isTracking) return

						this.frameCount++
						const now = performance.now()

						// Sample FPS at regular intervals
						if (now - this.lastSampleTime >= this.sampleInterval) {
							const duration = (now - this.lastSampleTime) / 1000
							const framesInPeriod = this.frameCount - (this.lastFrameCount || 0)
							const currentFps = duration > 0 ? framesInPeriod / duration : 0

							this.fpsSamples.push(Math.round(currentFps))
							this.lastSampleTime = now
							this.lastFrameCount = this.frameCount
						}

						// Continue tracking
						this.rafId = requestAnimationFrame(() => this.trackFrame())
					},
				}

				// Start the tracking loop
				const tracker = (window as any).__e2eFpsTracker
				tracker.rafId = requestAnimationFrame(() => tracker.trackFrame())
			},
			{ sampleInterval: this.sampleInterval }
		)
	}

	async stop(): Promise<FPSMetrics> {
		if (!this.isTracking) {
			throw new Error('FPS tracking is not running')
		}

		// Stop tracking and get final measurements
		const metrics = await this.page.evaluate(() => {
			const tracker = (window as any).__e2eFpsTracker
			if (!tracker) {
				throw new Error('FPS tracker not found on page')
			}

			tracker.isTracking = false
			if (tracker.rafId) {
				cancelAnimationFrame(tracker.rafId)
			}

			const totalDuration = (performance.now() - tracker.startTime) / 1000
			const samples = tracker.fpsSamples.filter((fps: number) => fps > 0) // Filter out invalid samples

			if (samples.length === 0) {
				return {
					averageFps: 0,
					minFps: 0,
					maxFps: 0,
					totalFrames: tracker.frameCount,
					duration: totalDuration,
					samples: [],
				}
			}

			return {
				averageFps: Math.round(samples.reduce((a: number, b: number) => a + b, 0) / samples.length),
				minFps: Math.min(...samples),
				maxFps: Math.max(...samples),
				totalFrames: tracker.frameCount,
				duration: totalDuration,
				samples: samples,
			}
		})

		this.isTracking = false

		// Clean up the tracker from the page
		await this.page.evaluate(() => {
			delete (window as any).__e2eFpsTracker
		})

		return metrics
	}

	async measureInteraction<T>(
		interactionFn: () => Promise<T>,
		options: { warmupMs?: number; measureMs?: number } = {}
	): Promise<{ result: T; metrics: FPSMetrics }> {
		const { warmupMs = 500, measureMs = 3000 } = options

		// Warm up period - let the browser settle
		if (warmupMs > 0) {
			await this.page.waitForTimeout(warmupMs)
		}

		await this.start()

		// Execute the interaction
		const result = await interactionFn()

		// Measure for the specified duration
		await this.page.waitForTimeout(measureMs)

		const metrics = await this.stop()

		return { result, metrics }
	}

	async isTrackingActive(): Promise<boolean> {
		return this.page.evaluate(() => {
			const tracker = (window as any).__e2eFpsTracker
			return tracker ? tracker.isTracking : false
		})
	}
}
