import { expect } from '@playwright/test'
import { createAnalyticsReporter, getTestContext } from '../fixtures/analytics-reporter'
import test from '../fixtures/fixtures'
import {
	formatPerformanceResults,
	PerformanceTestResult,
	setupPerformanceTest,
} from '../fixtures/perf-utils'
import { setup } from '../shared-e2e'

test.describe.configure({ mode: 'serial' })

function testOutput(result: PerformanceTestResult) {
	// eslint-disable-next-line no-console
	console.log(
		`${result.interaction} Performance: ${result.metrics.averageFps} FPS (min: ${result.metrics.minFps})`
	)

	// Validate performance
	expect(result.metrics.averageFps).toBeGreaterThan(18)
	expect(result.comparison.status).not.toBe('fail')

	// Update baseline if this is a significant improvement
	if (result.comparison.isImprovement) {
		// eslint-disable-next-line no-console
		console.log('Consider updating baseline - performance improved!')
	}
}

test.describe('Performance Tests', () => {
	test.beforeEach(setup)
	test.setTimeout(120000) // Increase timeout
	test.describe.configure({ mode: 'serial' }) // Run tests in series to avoid resource conflicts

	test.skip('Baseline FPS Performance - Desktop', async ({
		page,
		context,
		request,
		browserName,
		isMobile,
	}) => {
		if (isMobile) return

		const perfSuite = await setupPerformanceTest({ page, context, request }, browserName)
		const analyticsReporter = createAnalyticsReporter()

		// Run full performance test suite
		const results = await perfSuite.runFullPerformanceTest()

		// Log detailed results
		// eslint-disable-next-line no-console
		console.log(formatPerformanceResults(results))

		// Send analytics
		const testContext = getTestContext('Baseline FPS Performance - Desktop')
		await analyticsReporter.reportPerformanceMetrics(results, testContext)

		// Send alerts for any regressions
		for (const result of results.filter((r) => r.comparison.status === 'fail')) {
			await analyticsReporter.reportRegressionAlert(result, testContext)
		}

		// Check for any failures
		const failedTests = results.filter((result) => result.comparison.status === 'fail')
		if (failedTests.length > 0) {
			const failureMessages = failedTests
				.map((test) => `${test.interaction}: ${test.comparison.message}`)
				.join('\n')
			test.fail(false, `Performance tests failed:\n${failureMessages}`)
		}

		// Warn about any significant changes
		const warningTests = results.filter((result) => result.comparison.status === 'warning')
		if (warningTests.length > 0) {
			console.warn('Performance warnings detected:')
			warningTests.forEach((test) => {
				console.warn(`  ${test.interaction}: ${test.comparison.message}`)
			})
		}

		// Assert overall test health
		expect(results.length).toBeGreaterThan(0)

		// Ensure all tests have reasonable FPS values
		results.forEach((result) => {
			expect(result.metrics.averageFps).toBeGreaterThan(0)
			expect(result.metrics.averageFps).toBeLessThanOrEqual(60)
		})
	})

	test('Shape Rotation Performance', async ({ page, context, request, browserName, isMobile }) => {
		if (isMobile) return

		const perfSuite = await setupPerformanceTest({ page, context, request }, browserName)
		await perfSuite.setupHeavyBoard()

		testOutput(await perfSuite.testShapeRotation())
	})

	test('Shape Dragging Performance', async ({ page, context, request, browserName }) => {
		const perfSuite = await setupPerformanceTest({ page, context, request }, browserName)
		await perfSuite.setupHeavyBoard()

		testOutput(await perfSuite.testShapeDragging())
	})

	test('Shape Resizing Performance', async ({ page, context, request, browserName, isMobile }) => {
		if (isMobile) return

		const perfSuite = await setupPerformanceTest({ page, context, request }, browserName)
		await perfSuite.setupHeavyBoard(50)

		testOutput(await perfSuite.testShapeResizing())
	})

	test('Canvas Panning Performance', async ({ page, context, request, browserName, isMobile }) => {
		if (isMobile) return

		const perfSuite = await setupPerformanceTest({ page, context, request }, browserName)
		await perfSuite.setupHeavyBoard(1000)

		testOutput(await perfSuite.testCanvasPanning())
	})

	test('Canvas Zooming Performance', async ({ page, context, request, browserName, isMobile }) => {
		if (isMobile) return

		const perfSuite = await setupPerformanceTest({ page, context, request }, browserName)
		await perfSuite.setupHeavyBoard()

		testOutput(await perfSuite.testCanvasZooming())
	})
})

test.skip('Baseline Management', () => {
	test('Establish All Performance Baselines', async ({ page, context, request, browserName }) => {
		test.setTimeout(120000) // 2 minutes for establishing all baselines

		const perfSuite = await setupPerformanceTest({ page, context, request }, browserName)

		// This will run all performance tests and establish baselines
		await perfSuite.establishBaselines()

		// Verify baselines were created
		const rotateBaseline = perfSuite.getBaseline('rotate_shapes')
		const dragBaseline = perfSuite.getBaseline('drag_shapes')
		const resizeBaseline = perfSuite.getBaseline('resize_shapes')
		const panBaseline = perfSuite.getBaseline('canvas_panning')
		const zoomBaseline = perfSuite.getBaseline('canvas_zooming')

		expect(rotateBaseline).toBeTruthy()
		expect(dragBaseline).toBeTruthy()
		expect(resizeBaseline).toBeTruthy()
		expect(panBaseline).toBeTruthy()
		expect(zoomBaseline).toBeTruthy()

		// eslint-disable-next-line no-console
		console.log('✅ All baselines established successfully!')
	})

	test('Manual Baseline Update Example', async ({ page, context, request, browserName }) => {
		const perfSuite = await setupPerformanceTest({ page, context, request }, browserName)
		await perfSuite.setupHeavyBoard()

		const result = await perfSuite.testShapeRotation()

		// Example of manually updating baseline (use with caution)
		const existingBaseline = perfSuite.getBaseline('rotate_shapes')
		if (!existingBaseline || result.metrics.averageFps > existingBaseline.avgFps) {
			perfSuite.updateBaseline('rotate_shapes', result.metrics, true)
			// eslint-disable-next-line no-console
			console.log(`📊 Baseline updated: ${result.metrics.averageFps} FPS`)
		}

		expect(result.comparison).toBeDefined()
	})
})
