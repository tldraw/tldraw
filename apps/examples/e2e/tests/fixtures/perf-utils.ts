import { Page, PlaywrightTestArgs } from '@playwright/test'
import { BaselineManager, ComparisonResult, Environment } from './baseline-manager'
import { E2EFpsTracker, FPSMetrics } from './fps-tracker'
import { HeavyBoardGenerator } from './heavy-board-generator'

export interface PerformanceTestResult {
	interaction: string
	metrics: FPSMetrics
	comparison: ComparisonResult
	environment: Environment
}

export interface InteractionTestOptions {
	warmupMs?: number
	measureMs?: number
	expectMinFps?: number
}

export class PerformanceTestSuite {
	private fpsTracker: E2EFpsTracker
	private baselineManager: BaselineManager
	private boardGenerator: HeavyBoardGenerator
	private environment: Environment

	constructor(page: Page, browserName: string) {
		this.fpsTracker = new E2EFpsTracker(page)
		this.baselineManager = new BaselineManager()
		this.boardGenerator = new HeavyBoardGenerator(page)

		// Detect environment
		this.environment = {
			platform: process.platform,
			viewport: '1920x1080', // Will be updated based on actual viewport
			browser: browserName,
		}
	}

	async initialize(page: Page): Promise<void> {
		// Update viewport information
		const viewport = page.viewportSize()
		if (viewport) {
			this.environment.viewport = `${viewport.width}x${viewport.height}`
		}

		// Set up the page for performance testing
		await page.goto('http://localhost:5420/end-to-end')
		await page.waitForSelector('.tl-canvas')

		// Disable animations for consistent testing
		await page.evaluate(() => {
			const editor = (window as any).editor
			if (editor) {
				editor.user.updateUserPreferences({ animationSpeed: 0 })
			}
		})

		// Let the editor settle
		await page.waitForTimeout(500)
	}

	async setupHeavyBoard(): Promise<void> {
		await this.boardGenerator.setupStressTestBoard()

		// Ensure the board is fully rendered
		await this.waitForStableFramerate()
	}

	private async waitForStableFramerate(maxWaitMs = 3000): Promise<void> {
		// Wait for the framerate to stabilize after board generation
		const startTime = Date.now()
		while (Date.now() - startTime < maxWaitMs) {
			await new Promise((resolve) => setTimeout(resolve, 100))
			// Check if we're getting consistent frame times
			const isStable = await this.checkFramerateStability()
			if (isStable) break
		}
	}

	private async checkFramerateStability(): Promise<boolean> {
		// Simple heuristic: check if the page has settled
		return true // For now, just return true. Could be enhanced with actual stability detection
	}

	async testShapeRotation(options: InteractionTestOptions = {}): Promise<PerformanceTestResult> {
		const { warmupMs = 500, measureMs = 10000, expectMinFps } = options // 10 seconds for lots of rotation

		const { metrics } = await this.fpsTracker.measureInteraction(
			async () => {
				const page = (this.fpsTracker as any).page as Page

				// Select all shapes for rotation
				await page.keyboard.press('Control+a')

				// Wait a moment for selection
				await page.waitForTimeout(100)

				// Perform continuous rotations using the editor API
				await page.evaluate(() => {
					const editor = (window as any).editor
					if (!editor) return

					// Rotate shapes continuously during measurement period
					// 10 seconds at 60fps with 5° steps = ~8.7 rotations total!
					let totalRotations = 0
					const rotateStep = Math.PI / 36 // 5 degrees per step
					const degreesPerStep = 5

					const rotateInterval = setInterval(() => {
						const selectedShapes = editor.getSelectedShapes()
						if (selectedShapes.length > 0) {
							editor.rotateShapesBy(selectedShapes, rotateStep)
							totalRotations += degreesPerStep / 360 // Track full rotations
						}
					}, 16) // ~60fps rotation updates

					// Store interval ID and stats so we can clean it up
					;(window as any).__rotationInterval = rotateInterval
					;(window as any).__totalRotations = totalRotations
				})
			},
			{ warmupMs, measureMs }
		)

		// Clean up and clear selection
		const page = (this.fpsTracker as any).page as Page

		// Stop the rotation interval and get stats
		const rotationStats = await page.evaluate(() => {
			const interval = (window as any).__rotationInterval
			const totalRotations = (window as any).__totalRotations || 0

			if (interval) {
				clearInterval(interval)
				delete (window as any).__rotationInterval
				delete (window as any).__totalRotations
			}

			return { totalRotations: Math.round(totalRotations * 10) / 10 } // Round to 1 decimal
		})

		// eslint-disable-next-line no-console
		console.log(`🔄 Completed ${rotationStats.totalRotations} rotations during measurement`)

		// Clear selection
		await page.keyboard.press('Escape')

		const comparison = this.baselineManager.compareWithBaseline(
			'rotate_shapes',
			metrics,
			this.environment
		)

		// Validate minimum FPS if specified
		if (expectMinFps && metrics.minFps < expectMinFps) {
			comparison.status = 'fail'
			comparison.message += ` Minimum FPS ${metrics.minFps} below expected ${expectMinFps}.`
		}

		return {
			interaction: 'rotate_shapes',
			metrics,
			comparison,
			environment: this.environment,
		}
	}

	async testShapeDragging(options: InteractionTestOptions = {}): Promise<PerformanceTestResult> {
		const { warmupMs = 500, measureMs = 3000, expectMinFps } = options

		// Select shapes for dragging
		await this.boardGenerator.selectRandomShapes(5)

		const { metrics } = await this.fpsTracker.measureInteraction(
			async () => {
				const page = (this.fpsTracker as any).page as Page

				// Select all shapes for rotation
				await page.keyboard.press('Control+a')

				// Drag shapes around the canvas
				const startX = 400
				const startY = 400

				await page.mouse.move(startX, startY)
				await page.mouse.down()

				// Drag in various directions
				const movements = [
					[600, 300],
					[800, 500],
					[500, 700],
					[300, 600],
					[400, 400],
					[500, 500],
					[700, 700],
					[900, 900],
					[1100, 1100],
					[1300, 1300],
					[200, 200],
					[324, 324],
					[448, 448],
					[572, 572],
					[696, 696],
					[820, 820],
				]

				for (const [x, y] of movements) {
					await page.mouse.move(x, y, { steps: 10 })
					await page.waitForTimeout(16) // ~60fps
				}

				await page.mouse.up()
			},
			{ warmupMs, measureMs }
		)

		// Clear selection
		const page = (this.fpsTracker as any).page as Page
		await page.keyboard.press('Escape')

		const comparison = this.baselineManager.compareWithBaseline(
			'drag_shapes',
			metrics,
			this.environment
		)

		if (expectMinFps && metrics.minFps < expectMinFps) {
			comparison.status = 'fail'
			comparison.message += ` Minimum FPS ${metrics.minFps} below expected ${expectMinFps}.`
		}

		return {
			interaction: 'drag_shapes',
			metrics,
			comparison,
			environment: this.environment,
		}
	}

	async testCanvasPanning(options: InteractionTestOptions = {}): Promise<PerformanceTestResult> {
		const { warmupMs = 500, measureMs = 3000, expectMinFps } = options

		const { metrics } = await this.fpsTracker.measureInteraction(
			async () => {
				const page = (this.fpsTracker as any).page as Page

				// Pan around the canvas using space + drag
				await page.keyboard.down('Space')

				const centerX = 960
				const centerY = 540
				await page.mouse.move(centerX, centerY)
				await page.mouse.down()

				// Pan in different directions
				const panMovements = [
					[centerX - 300, centerY - 200],
					[centerX + 400, centerY - 300],
					[centerX + 200, centerY + 300],
					[centerX - 400, centerY + 200],
					[centerX, centerY],
					[centerX - 3600, centerY - 3600],
					[centerX - 400, centerY - 500],
					[centerX - 400, centerY + 300],
					[centerX + 300, centerY + 200],
					[centerX - 300, centerY - 200],
					[centerX + 400, centerY - 300],
					[centerX + 200, centerY + 300],
					[centerX - 400, centerY + 200],
					[centerX, centerY],
					[centerX - 3600, centerY - 3600],
					[centerX - 400, centerY - 500],
					[centerX - 400, centerY + 300],
					[centerX + 300, centerY + 200],
				]

				for (const [x, y] of panMovements) {
					await page.mouse.move(x, y, { steps: 15 })
					await page.waitForTimeout(16) // ~60fps
				}

				await page.mouse.up()
				await page.keyboard.up('Space')
			},
			{ warmupMs, measureMs }
		)

		const comparison = this.baselineManager.compareWithBaseline(
			'canvas_panning',
			metrics,
			this.environment
		)

		if (expectMinFps && metrics.minFps < expectMinFps) {
			comparison.status = 'fail'
			comparison.message += ` Minimum FPS ${metrics.minFps} below expected ${expectMinFps}.`
		}

		return {
			interaction: 'canvas_panning',
			metrics,
			comparison,
			environment: this.environment,
		}
	}

	async testCanvasZooming(options: InteractionTestOptions = {}): Promise<PerformanceTestResult> {
		const { warmupMs = 500, measureMs = 10000, expectMinFps } = options // Shorter measure time for zooming

		const { metrics } = await this.fpsTracker.measureInteraction(
			async () => {
				const page = (this.fpsTracker as any).page as Page

				// Use editor API to zoom in and out continuously
				await page.evaluate(() => {
					const editor = (window as any).editor
					if (!editor) return

					let zoomCycle = 0
					const zoomInterval = setInterval(() => {
						const cycle = Math.floor(zoomCycle / 10) % 2 // Switch every 10 steps
						if (cycle === 0) {
							editor.zoomIn() // Zoom in phase
						} else {
							editor.zoomOut() // Zoom out phase
						}
						zoomCycle++
					}, 16) // Zoom every 16ms

					;(window as any).__zoomInterval = zoomInterval
				})
			},
			{ warmupMs, measureMs }
		)

		// Stop the zoom interval
		const page = (this.fpsTracker as any).page as Page
		await page.evaluate(() => {
			const interval = (window as any).__zoomInterval
			if (interval) {
				clearInterval(interval)
				delete (window as any).__zoomInterval
			}
		})

		const comparison = this.baselineManager.compareWithBaseline(
			'canvas_zooming',
			metrics,
			this.environment
		)

		if (expectMinFps && metrics.minFps < expectMinFps) {
			comparison.status = 'fail'
			comparison.message += ` Minimum FPS ${metrics.minFps} below expected ${expectMinFps}.`
		}

		return {
			interaction: 'canvas_zooming',
			metrics,
			comparison,
			environment: this.environment,
		}
	}

	async runFullPerformanceTest(): Promise<PerformanceTestResult[]> {
		const results: PerformanceTestResult[] = []

		// Run all performance tests
		await this.setupHeavyBoard()
		results.push(await this.testShapeRotation())
		await this.setupHeavyBoard()
		results.push(await this.testShapeDragging())
		await this.setupHeavyBoard()
		results.push(await this.testCanvasPanning())
		await this.setupHeavyBoard()
		results.push(await this.testCanvasZooming())

		return results
	}

	updateBaseline(interaction: string, metrics: FPSMetrics, force = false): void {
		this.baselineManager.updateBaseline(interaction, metrics, this.environment, force)
	}

	getBaseline(interaction: string) {
		return this.baselineManager.getBaseline(interaction, this.environment)
	}

	setThresholds(regressionThreshold: number, warningThreshold: number): void {
		this.baselineManager.setThresholds(regressionThreshold, warningThreshold)
	}

	// Helper method to control baseline auto-creation
	async runTestWithBaseline(
		testFn: () => Promise<{ metrics: FPSMetrics }>,
		interaction: string,
		autoCreate = true
	): Promise<PerformanceTestResult> {
		const { metrics } = await testFn()
		const comparison = this.baselineManager.compareWithBaseline(
			interaction,
			metrics,
			this.environment,
			autoCreate
		)

		return {
			interaction,
			metrics,
			comparison,
			environment: this.environment,
		}
	}

	// Method to manually create/update baselines
	async establishBaselines(): Promise<void> {
		await this.setupHeavyBoard()

		// eslint-disable-next-line no-console
		console.log('🔄 Establishing performance baselines...')

		const interactions = [
			{ name: 'rotate_shapes', testFn: () => this.testShapeRotation() },
			{ name: 'drag_shapes', testFn: () => this.testShapeDragging() },
			{ name: 'canvas_panning', testFn: () => this.testCanvasPanning() },
			{ name: 'canvas_zooming', testFn: () => this.testCanvasZooming() },
		]

		for (const { name, testFn } of interactions) {
			const result = await testFn()
			this.updateBaseline(name, result.metrics, true)
			// eslint-disable-next-line no-console
			console.log(`✅ Baseline set for ${name}: ${result.metrics.averageFps} FPS`)
		}

		// eslint-disable-next-line no-console
		console.log('🎉 All baselines established!')
	}
}

// Helper function to set up page for performance testing
export async function setupPerformanceTest(
	{ page }: PlaywrightTestArgs,
	browserName: string
): Promise<PerformanceTestSuite> {
	const perfSuite = new PerformanceTestSuite(page, browserName)
	await perfSuite.initialize(page)
	return perfSuite
}

// Helper function to format performance results for reporting
export function formatPerformanceResults(results: PerformanceTestResult[]): string {
	let report = '\n=== Performance Test Results ===\n'

	for (const result of results) {
		const { interaction, metrics, comparison } = result
		const status = comparison.status.toUpperCase()
		const statusEmoji =
			comparison.status === 'pass' ? '✅' : comparison.status === 'warning' ? '⚠️' : '❌'

		report += `\n${statusEmoji} ${interaction.replace('_', ' ').toUpperCase()} [${status}]\n`
		report += `   Average FPS: ${metrics.averageFps} (${comparison.avgFpsChange > 0 ? '+' : ''}${comparison.avgFpsChange.toFixed(1)}%)\n`
		report += `   Min FPS: ${metrics.minFps}, Max FPS: ${metrics.maxFps}\n`
		report += `   Samples: ${metrics.samples.length}, Duration: ${metrics.duration.toFixed(1)}s\n`
		report += `   ${comparison.message}\n`
	}

	const failCount = results.filter((r) => r.comparison.status === 'fail').length
	const warningCount = results.filter((r) => r.comparison.status === 'warning').length
	const passCount = results.filter((r) => r.comparison.status === 'pass').length

	report += `\n=== Summary ===\n`
	report += `   ✅ Passed: ${passCount}\n`
	report += `   ⚠️  Warnings: ${warningCount}\n`
	report += `   ❌ Failed: ${failCount}\n`

	return report
}
