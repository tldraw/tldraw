import { Page, PlaywrightTestArgs } from '@playwright/test'
import { Editor } from 'tldraw'
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
			const editor: Editor = (window as any).editor
			if (editor) {
				editor.user.updateUserPreferences({ animationSpeed: 0 })
			}
		})

		// Let the editor settle
		await page.waitForTimeout(500)
	}

	async setupHeavyBoard(shapeCount = 200): Promise<void> {
		await this.boardGenerator.setupStressTestBoard(shapeCount)

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
				const page = this.getPage()

				// Select all shapes for rotation
				await page.keyboard.press('Control+a')

				// Wait a moment for selection
				await page.waitForTimeout(100)

				// Perform continuous rotations using the editor API
				await page.evaluate(() => {
					const editor: Editor = (window as any).editor
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
							;(window as any).__totalRotations = totalRotations
						}
					}, 16) // ~60fps rotation updates

					// Store interval ID and stats so we can clean it up
					;(window as any).__rotationInterval = rotateInterval
				})
			},
			{ warmupMs, measureMs }
		)

		// Clean up and clear selection
		const page = this.getPage()

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

		return this.finalizeTestResult('rotate_shapes', metrics, expectMinFps)
	}

	async testShapeDragging(options: InteractionTestOptions = {}): Promise<PerformanceTestResult> {
		const { warmupMs = 500, measureMs = 3000, expectMinFps } = options

		// Select shapes for dragging
		await this.boardGenerator.selectRandomShapes(5)

		const { metrics } = await this.fpsTracker.measureInteraction(
			async () => {
				const page = this.getPage()

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
		const page = this.getPage()
		await page.keyboard.press('Escape')

		return this.finalizeTestResult('drag_shapes', metrics, expectMinFps)
	}

	async testShapeResizing(options: InteractionTestOptions = {}): Promise<PerformanceTestResult> {
		const { warmupMs = 500, measureMs = 3000, expectMinFps } = options

		const { metrics } = await this.fpsTracker.measureInteraction(
			async () => {
				const page = this.getPage()

				// Select all shapes for resizing
				await page.keyboard.press('Control+a')

				// Use editor API to programmatically resize selected shapes
				await page.evaluate(() => {
					const editor: Editor = (window as any).editor
					if (!editor) return

					// Simple seeded random number generator for consistent testing
					let seed = 12345
					function seededRandom() {
						seed = (seed * 9301 + 49297) % 233280
						return seed / 233280
					}

					let resizeCycle = 0
					const resizeInterval = setInterval(() => {
						const selectedShapes = editor.getSelectedShapes()
						if (selectedShapes.length === 0) return

						// Generate seeded random scale factors
						let scaleFactor: number
						if (resizeCycle % 2 === 0) {
							// Scale up: random between 1.1 and 5
							scaleFactor = 1.1 + seededRandom() * (2.0 - 1.1)
						} else {
							// Scale down: random between 0.2 and 0.9
							scaleFactor = 0.5 + seededRandom() * (0.9 - 0.5)
						}

						// Get current bounds for the scale origin
						const bounds = editor.getSelectionPageBounds()
						if (bounds) {
							// Resize each selected shape individually
							selectedShapes.forEach((shape: any) => {
								editor.resizeShape(
									shape.id,
									{ x: scaleFactor, y: scaleFactor },
									{
										scaleOrigin: bounds.center,
									}
								)
							})
						}

						resizeCycle++
					}, 16) // Resize every 16ms for ~60fps

					;(window as any).__resizeInterval = resizeInterval
				})
			},
			{ warmupMs, measureMs }
		)

		// Stop the resize interval
		const page = this.getPage()
		await page.evaluate(() => {
			const interval = (window as any).__resizeInterval
			if (interval) {
				clearInterval(interval)
				delete (window as any).__resizeInterval
			}
		})

		// Clear selection
		await page.keyboard.press('Escape')

		return this.finalizeTestResult('resize_shapes', metrics, expectMinFps)
	}

	async testCanvasPanning(options: InteractionTestOptions = {}): Promise<PerformanceTestResult> {
		const { warmupMs = 500, measureMs = 3000, expectMinFps } = options

		const { metrics } = await this.fpsTracker.measureInteraction(
			async () => {
				const page = this.getPage()

				// Pan around the canvas using Editor camera API
				await page.evaluate(() => {
					const editor: Editor = (window as any).editor
					if (!editor) return

					// Get initial camera position
					const initialCamera = editor.getCamera()
					let panCycle = 0

					// Define pan movements as offsets from initial position
					const panOffsets = [
						{ x: -1800, y: -200 },
						{ x: 400, y: -1800 },
						{ x: 800, y: 1200 },
						{ x: -900, y: 800 },
						{ x: 0, y: 0 },
						{ x: -3600, y: -3600 },
						{ x: -900, y: -1900 },
						{ x: -900, y: 1200 },
						{ x: 300, y: 800 },
						{ x: -1800, y: -800 },
						{ x: 400, y: -1800 },
						{ x: 800, y: 1200 },
						{ x: -900, y: 800 },
						{ x: 0, y: 0 },
						{ x: -3600, y: -3600 },
						{ x: -900, y: -1900 },
						{ x: -900, y: 1200 },
						{ x: 300, y: 800 },
					]

					const panInterval = setInterval(() => {
						const offsetIndex = panCycle % panOffsets.length
						const offset = panOffsets[offsetIndex]

						// Set camera position to initial position plus offset
						editor.setCamera({
							x: initialCamera.x + offset.x,
							y: initialCamera.y + offset.y,
							z: initialCamera.z,
						})

						panCycle++
					}, 16) // Update every 16ms for ~60fps

					;(window as any).__panInterval = panInterval
				})
			},
			{ warmupMs, measureMs }
		)

		// Stop the pan interval
		const page = this.getPage()
		await page.evaluate(() => {
			const interval = (window as any).__panInterval
			if (interval) {
				clearInterval(interval)
				delete (window as any).__panInterval
			}
		})

		return this.finalizeTestResult('canvas_panning', metrics, expectMinFps)
	}

	async testCanvasZooming(options: InteractionTestOptions = {}): Promise<PerformanceTestResult> {
		const { warmupMs = 500, measureMs = 10000, expectMinFps } = options // Shorter measure time for zooming

		const { metrics } = await this.fpsTracker.measureInteraction(
			async () => {
				const page = this.getPage()

				// Use editor API to zoom in and out continuously
				await page.evaluate(() => {
					const editor: Editor = (window as any).editor
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
		const page = this.getPage()
		await page.evaluate(() => {
			const interval = (window as any).__zoomInterval
			if (interval) {
				clearInterval(interval)
				delete (window as any).__zoomInterval
			}
		})

		return this.finalizeTestResult('canvas_zooming', metrics, expectMinFps)
	}

	async runFullPerformanceTest(): Promise<PerformanceTestResult[]> {
		const results: PerformanceTestResult[] = []

		// Run all performance tests
		await this.setupHeavyBoard()
		results.push(await this.testShapeRotation())
		await this.setupHeavyBoard()
		results.push(await this.testShapeDragging())
		await this.setupHeavyBoard(50)
		results.push(await this.testShapeResizing())
		await this.setupHeavyBoard(1000)
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

	// Common method for finalizing performance test results
	private finalizeTestResult(
		interaction: string,
		metrics: FPSMetrics,
		expectMinFps?: number
	): PerformanceTestResult {
		const comparison = this.baselineManager.compareWithBaseline(
			interaction,
			metrics,
			this.environment
		)

		// Validate minimum FPS if specified
		if (expectMinFps && metrics.minFps < expectMinFps) {
			comparison.status = 'fail'
			comparison.message += ` Minimum FPS ${metrics.minFps} below expected ${expectMinFps}.`
		}

		return {
			interaction,
			metrics,
			comparison,
			environment: this.environment,
		}
	}

	// Helper to get page reference from fps tracker
	private getPage(): Page {
		return (this.fpsTracker as any).page as Page
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
