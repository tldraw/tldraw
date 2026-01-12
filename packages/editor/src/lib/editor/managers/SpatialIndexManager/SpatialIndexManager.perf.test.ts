import {
	Geometry2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLShape,
	createShapeId,
	createTLStore,
} from '../../../../index'
import { debugFlags } from '../../../utils/debug-flags'
import { Editor } from '../../Editor'

const TEST_SHAPE_TYPE = 'perf-test-shape' as const

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		'perf-test-shape': { w: number; h: number }
	}
}

type ITestShape = TLShape<'perf-test-shape'>

class TestShape extends ShapeUtil<ITestShape> {
	static override type = 'perf-test-shape' as const
	static override props: RecordProps<ITestShape> = {
		w: T.number,
		h: T.number,
	}
	getDefaultProps(): ITestShape['props'] {
		return { w: 200, h: 200 }
	}
	getGeometry(shape: ITestShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: false,
		})
	}
	indicator() {}
	component() {}
}

/**
 * Performance metrics for a single test run
 */
interface Metrics {
	notVisibleShapes?: number
	getShapeIdsInsideBounds?: number
	getShapePageBounds?: number
	buildFromScratch?: number
	processIncrementalUpdate?: number
	[key: string]: number | undefined
}

/**
 * Comparison results between old and new implementations
 */
class ComparisonResults {
	private old: Metrics = {}
	private new: Metrics = {}

	add(impl: 'old' | 'new', metrics: Metrics): void {
		if (impl === 'old') {
			this.old = metrics
		} else {
			this.new = metrics
		}
	}

	getImprovement(operation: string): number {
		const oldVal = this.old[operation] ?? 0
		const newVal = this.new[operation] ?? 0

		// Both zero = no change
		if (oldVal === 0 && newVal === 0) return 0

		// Old is zero but new is not = regression (new overhead introduced)
		if (oldVal === 0 && newVal > 0) return -Infinity

		// New is zero but old is not = 100% improvement
		if (oldVal > 0 && newVal === 0) return 100

		// Normal case: calculate percentage improvement
		return ((oldVal - newVal) / oldVal) * 100
	}

	getTotalTime(impl: 'old' | 'new'): number {
		const metrics = impl === 'old' ? this.old : this.new
		return Object.values(metrics).reduce((sum: number, val) => sum + (val ?? 0), 0)
	}

	getOverallImprovement(): number {
		const oldTotal = this.getTotalTime('old')
		const newTotal = this.getTotalTime('new')
		if (oldTotal === 0) return 0
		return ((oldTotal - newTotal) / oldTotal) * 100
	}

	toDiffTable(): string {
		const operations = new Set([...Object.keys(this.old), ...Object.keys(this.new)])
		let table = '\nScenario Performance Comparison\n'
		table += '┌───────────────────────────────────┬──────────┬──────────┬─────────┐\n'
		table += '│ Operation                         │ Old (ms) │ New (ms) │ Delta   │\n'
		table += '├───────────────────────────────────┼──────────┼──────────┼─────────┤\n'

		for (const op of operations) {
			const oldVal = (this.old[op] ?? 0).toFixed(3).padStart(8)
			const newVal = (this.new[op] ?? 0).toFixed(3).padStart(8)
			const improvement = this.getImprovement(op)

			let delta: string
			if (improvement === -Infinity) {
				delta = '   NEW'
			} else if (improvement === 0) {
				delta = '    --'
			} else if (improvement > 0) {
				delta = `-${improvement.toFixed(1)}%`
			} else {
				delta = `+${Math.abs(improvement).toFixed(1)}%`
			}

			const opName = op.padEnd(33)
			table += `│ ${opName} │ ${oldVal} │ ${newVal} │ ${delta.padStart(7)} │\n`
		}

		table += '└───────────────────────────────────┴──────────┴──────────┴─────────┘\n'

		// Add recommendation (exclude new overhead operations from average)
		const improvements = Array.from(operations)
			.map((op) => this.getImprovement(op))
			.filter((imp) => imp !== -Infinity)
		const avgImprovement =
			improvements.length > 0
				? improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length
				: 0
		if (avgImprovement > 50) {
			table +=
				'\n✓ SPATIAL INDEX RECOMMENDED: ' + avgImprovement.toFixed(1) + '% average improvement\n'
		} else if (avgImprovement > 0) {
			table += '\n⚠ MARGINAL IMPROVEMENT: ' + avgImprovement.toFixed(1) + '% average improvement\n'
		} else {
			table += '\n✗ REGRESSION: ' + avgImprovement.toFixed(1) + '% average change\n'
		}

		return table
	}

	toJSON(): object {
		return {
			old: this.old,
			new: this.new,
			improvements: Object.fromEntries(
				Array.from(new Set([...Object.keys(this.old), ...Object.keys(this.new)])).map((op) => [
					op,
					this.getImprovement(op),
				])
			),
		}
	}
}

/**
 * Metrics collector that captures performance logs from console
 */
class MetricsCollector {
	private logs: string[] = []
	private originalLog: typeof console.log

	constructor() {
		this.originalLog = console.log
	}

	start(): void {
		this.logs = []
		console.log = (...args: any[]) => {
			const msg = args.join(' ')
			if (msg.includes('[Perf]')) {
				this.logs.push(msg)
			}
			// Still call original for debugging if needed
			// this.originalLog(...args)
		}
	}

	stop(): Metrics {
		console.log = this.originalLog
		return this.parse()
	}

	private parse(): Metrics {
		const metrics: Metrics = {}

		for (const log of this.logs) {
			// Parse patterns like "[Perf] operationName: 123.45ms"
			const match = log.match(/\[Perf\]\s+([^:]+):\s+([\d.]+)ms/)
			if (match) {
				const operation = match[1].trim()
				const time = parseFloat(match[2])
				// Use the slowest time if multiple calls (conservative estimate)
				if (!metrics[operation] || time > metrics[operation]!) {
					metrics[operation] = time
				}
			}
		}

		return metrics
	}
}

/**
 * Shape generators for different test scenarios
 */
function createGridShapes(count: number, cols: number) {
	const shapes = []
	const spacing = 250
	for (let i = 0; i < count; i++) {
		shapes.push({
			id: createShapeId(`grid-${i}`),
			type: 'perf-test-shape' as const,
			x: (i % cols) * spacing,
			y: Math.floor(i / cols) * spacing,
			props: { w: 200, h: 200 },
		})
	}
	return shapes
}

function createNestedShapes(depth: number, shapesPerLevel: number) {
	const shapes = []
	const spacing = 60

	// Create flat grid for now - nested hierarchies with parent/child need special handling
	for (let d = 0; d < depth; d++) {
		for (let s = 0; s < shapesPerLevel; s++) {
			shapes.push({
				id: createShapeId(`level-${d}-shape-${s}`),
				type: 'perf-test-shape' as const,
				x: d * spacing + s * spacing,
				y: d * spacing,
				props: { w: 50, h: 50 },
			})
		}
	}

	return shapes
}

function createDenseShapes(shapeCount: number) {
	const shapes = []
	const spacing = 300

	// Create shapes in a grid
	for (let i = 0; i < shapeCount; i++) {
		shapes.push({
			id: createShapeId(`shape-${i}`),
			type: 'perf-test-shape' as const,
			x: (i % 10) * spacing,
			y: Math.floor(i / 10) * spacing,
			props: { w: 100, h: 100 },
		})
	}

	return shapes
}

/**
 * Run a panning test by moving the camera across the canvas
 */
async function runPanningTest(editor: Editor, steps: number = 50): Promise<void> {
	const startX = 0
	const startY = 0
	const endX = 10000
	const endY = 10000

	for (let step = 0; step < steps; step++) {
		const progress = step / steps
		const x = startX + (endX - startX) * progress
		const y = startY + (endY - startY) * progress
		editor.setCamera({ x, y, z: 1 })

		// Trigger derivations by accessing culled shapes (which uses notVisibleShapes)
		editor.getCulledShapes()

		// Allow derivations to update
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

/**
 * Run a zooming test by changing the camera zoom level
 */
async function runZoomingTest(
	editor: Editor,
	startZoom: number,
	endZoom: number,
	steps: number = 50
): Promise<void> {
	for (let step = 0; step < steps; step++) {
		const progress = step / steps
		const z = startZoom + (endZoom - startZoom) * progress
		editor.setCamera({ x: 0, y: 0, z })

		// Trigger derivations by accessing culled shapes
		editor.getCulledShapes()

		// Allow derivations to update
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

/**
 * Run a zoom thrashing test (rapid zoom in/out cycles)
 */
async function runZoomThrashingTest(editor: Editor, cycles: number = 20): Promise<void> {
	for (let i = 0; i < cycles; i++) {
		// Zoom in
		editor.setCamera({ x: 0, y: 0, z: 0.5 })
		editor.getCulledShapes()
		await new Promise((resolve) => setTimeout(resolve, 0))

		// Zoom out
		editor.setCamera({ x: 0, y: 0, z: 2.0 })
		editor.getCulledShapes()
		await new Promise((resolve) => setTimeout(resolve, 0))

		// Back to normal
		editor.setCamera({ x: 0, y: 0, z: 1.0 })
		editor.getCulledShapes()
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

/**
 * Run a shape movement test by moving a single shape repeatedly
 */
async function runSingleShapeMovementTest(
	editor: Editor,
	shapeId: string,
	steps: number = 50
): Promise<void> {
	const startX = 0
	const endX = 10000

	for (let step = 0; step < steps; step++) {
		const progress = step / steps
		const x = startX + (endX - startX) * progress
		editor.updateShape({ id: shapeId as any, type: 'perf-test-shape', x, y: 0 })

		// Trigger derivations by accessing culled shapes
		editor.getCulledShapes()

		// Allow derivations to update
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

/**
 * Run a bulk shape movement test by moving multiple shapes at once
 */
async function runBulkShapeMovementTest(
	editor: Editor,
	shapeIds: string[],
	steps: number = 20
): Promise<void> {
	for (let step = 0; step < steps; step++) {
		const deltaX = 100
		const deltaY = 50

		// Move all shapes at once
		editor.updateShapes(
			shapeIds.map((id, index) => ({
				id: id as any,
				type: 'perf-test-shape' as const,
				x: index * 250 + step * deltaX,
				y: Math.floor(index / 10) * 250 + step * deltaY,
			}))
		)

		// Trigger derivations by accessing culled shapes
		editor.getCulledShapes()

		// Allow derivations to update
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

describe('Spatial Index Performance Comparison', () => {
	let editor: Editor

	beforeEach(() => {
		editor = new Editor({
			shapeUtils: [TestShape],
			bindingUtils: [],
			tools: [],
			store: createTLStore({ shapeUtils: [TestShape], bindingUtils: [] }),
			getContainer: () => document.body,
		})
		// Enable perf logging for these tests
		debugFlags.perfLogSpatialIndex.set(true)
	})

	afterEach(() => {
		debugFlags.perfLogSpatialIndex.set(false)
	})

	describe('Panning (viewport culling)', () => {
		test('large canvas - 5000 shapes', async () => {
			const shapes = createGridShapes(5000, 50) // 50 columns x 100 rows
			editor.createShapes(shapes)

			const results = new ComparisonResults()

			// Run with old implementation
			debugFlags.useSpatialIndex.set(false)
			const collectorOld = new MetricsCollector()
			collectorOld.start()
			await runPanningTest(editor, 100) // 100 pan steps to amortize build cost
			const oldMetrics = collectorOld.stop()
			results.add('old', oldMetrics)

			// Reset camera
			editor.setCamera({ x: 0, y: 0, z: 1 })
			await new Promise((resolve) => setTimeout(resolve, 100))

			// Run with spatial index
			debugFlags.useSpatialIndex.set(true)
			const collectorNew = new MetricsCollector()
			collectorNew.start()
			await runPanningTest(editor, 100) // 100 pan steps to amortize build cost
			const newMetrics = collectorNew.stop()
			results.add('new', newMetrics)

			// Output comparison
			console.log(results.toDiffTable())
			console.log('\nDetailed metrics:', JSON.stringify(results.toJSON(), null, 2))

			// Visual inspection of comparison table shows trade-offs
			// (initial build cost vs faster repeated culling operations)
		}, 60000) // 60 second timeout

		test('nested shapes - 100 shapes across 5 levels', async () => {
			const shapes = createNestedShapes(5, 20) // 5 levels, 20 shapes per level
			editor.createShapes(shapes)

			const results = new ComparisonResults()

			// Run with old implementation
			debugFlags.useSpatialIndex.set(false)
			const collectorOld = new MetricsCollector()
			collectorOld.start()
			await runPanningTest(editor, 50)
			const oldMetrics = collectorOld.stop()
			results.add('old', oldMetrics)

			// Reset camera
			editor.setCamera({ x: 0, y: 0, z: 1 })
			await new Promise((resolve) => setTimeout(resolve, 100))

			// Run with spatial index
			debugFlags.useSpatialIndex.set(true)
			const collectorNew = new MetricsCollector()
			collectorNew.start()
			await runPanningTest(editor, 50)
			const newMetrics = collectorNew.stop()
			results.add('new', newMetrics)

			// Output comparison
			console.log(results.toDiffTable())

			// Ensure no regressions
			const improvement = results.getOverallImprovement()
			expect(improvement).toBeGreaterThanOrEqual(0) // Overall performance should not regress
		}, 60000)

		test('dense canvas - 500 shapes', async () => {
			const shapes = createDenseShapes(500) // 500 shapes in grid
			editor.createShapes(shapes)

			const results = new ComparisonResults()

			// Run with old implementation
			debugFlags.useSpatialIndex.set(false)
			const collectorOld = new MetricsCollector()
			collectorOld.start()
			await runPanningTest(editor, 50)
			const oldMetrics = collectorOld.stop()
			results.add('old', oldMetrics)

			// Reset camera
			editor.setCamera({ x: 0, y: 0, z: 1 })
			await new Promise((resolve) => setTimeout(resolve, 100))

			// Run with spatial index
			debugFlags.useSpatialIndex.set(true)
			const collectorNew = new MetricsCollector()
			collectorNew.start()
			await runPanningTest(editor, 50)
			const newMetrics = collectorNew.stop()
			results.add('new', newMetrics)

			// Output comparison
			console.log(results.toDiffTable())

			// Ensure no regressions
			const improvement = results.getOverallImprovement()
			expect(improvement).toBeGreaterThanOrEqual(0) // Overall performance should not regress
		}, 60000)
	})

	describe('Zooming (scale changes)', () => {
		test('zoom in - 1000 shapes (1x → 0.1x)', async () => {
			const shapes = createGridShapes(1000, 20) // 20 columns x 50 rows
			editor.createShapes(shapes)

			const results = new ComparisonResults()

			// Run with old implementation
			debugFlags.useSpatialIndex.set(false)
			const collectorOld = new MetricsCollector()
			collectorOld.start()
			await runZoomingTest(editor, 1.0, 0.1, 50) // Zoom in 50 steps
			const oldMetrics = collectorOld.stop()
			results.add('old', oldMetrics)

			// Reset camera
			editor.setCamera({ x: 0, y: 0, z: 1 })
			await new Promise((resolve) => setTimeout(resolve, 100))

			// Run with spatial index
			debugFlags.useSpatialIndex.set(true)
			const collectorNew = new MetricsCollector()
			collectorNew.start()
			await runZoomingTest(editor, 1.0, 0.1, 50) // Zoom in 50 steps
			const newMetrics = collectorNew.stop()
			results.add('new', newMetrics)

			// Output comparison
			console.log(results.toDiffTable())

			// Ensure no regressions
			const improvement = results.getOverallImprovement()
			expect(improvement).toBeGreaterThanOrEqual(0) // Overall performance should not regress
		}, 60000)

		test('zoom out - 1000 shapes (1x → 10x)', async () => {
			const shapes = createGridShapes(1000, 20) // 20 columns x 50 rows
			editor.createShapes(shapes)

			const results = new ComparisonResults()

			// Run with old implementation
			debugFlags.useSpatialIndex.set(false)
			const collectorOld = new MetricsCollector()
			collectorOld.start()
			await runZoomingTest(editor, 1.0, 10.0, 50) // Zoom out 50 steps
			const oldMetrics = collectorOld.stop()
			results.add('old', oldMetrics)

			// Reset camera
			editor.setCamera({ x: 0, y: 0, z: 1 })
			await new Promise((resolve) => setTimeout(resolve, 100))

			// Run with spatial index
			debugFlags.useSpatialIndex.set(true)
			const collectorNew = new MetricsCollector()
			collectorNew.start()
			await runZoomingTest(editor, 1.0, 10.0, 50) // Zoom out 50 steps
			const newMetrics = collectorNew.stop()
			results.add('new', newMetrics)

			// Output comparison
			console.log(results.toDiffTable())

			// Ensure no regressions
			const improvement = results.getOverallImprovement()
			expect(improvement).toBeGreaterThanOrEqual(0) // Overall performance should not regress
		}, 60000)

		test('zoom thrashing - 500 shapes (rapid cycles)', async () => {
			const shapes = createGridShapes(500, 15) // 15 columns x ~33 rows
			editor.createShapes(shapes)

			const results = new ComparisonResults()

			// Run with old implementation
			debugFlags.useSpatialIndex.set(false)
			const collectorOld = new MetricsCollector()
			collectorOld.start()
			await runZoomThrashingTest(editor, 30) // 30 rapid cycles
			const oldMetrics = collectorOld.stop()
			results.add('old', oldMetrics)

			// Reset camera
			editor.setCamera({ x: 0, y: 0, z: 1 })
			await new Promise((resolve) => setTimeout(resolve, 100))

			// Run with spatial index
			debugFlags.useSpatialIndex.set(true)
			const collectorNew = new MetricsCollector()
			collectorNew.start()
			await runZoomThrashingTest(editor, 30) // 30 rapid cycles
			const newMetrics = collectorNew.stop()
			results.add('new', newMetrics)

			// Output comparison
			console.log(results.toDiffTable())

			// Visual inspection of comparison table shows trade-offs
			// (initial build cost vs faster repeated operations during thrashing)
		}, 60000)
	})

	describe.only('Shape manipulation (incremental updates)', () => {
		test('single shape - 50 movements', async () => {
			const shapes = createGridShapes(1000, 20) // 20 columns x 50 rows
			editor.createShapes(shapes)

			const results = new ComparisonResults()
			const targetShapeId = shapes[500].id // Pick a shape in the middle

			// Run with old implementation
			debugFlags.useSpatialIndex.set(false)
			const collectorOld = new MetricsCollector()
			collectorOld.start()
			await runSingleShapeMovementTest(editor, targetShapeId, 50)
			const oldMetrics = collectorOld.stop()
			results.add('old', oldMetrics)

			// Reset shape position
			editor.updateShape({
				id: targetShapeId as any,
				type: 'perf-test-shape',
				x: 500 * 250,
				y: 500,
			})
			await new Promise((resolve) => setTimeout(resolve, 100))

			// Run with spatial index
			debugFlags.useSpatialIndex.set(true)
			const collectorNew = new MetricsCollector()
			collectorNew.start()
			await runSingleShapeMovementTest(editor, targetShapeId, 50)
			const newMetrics = collectorNew.stop()
			results.add('new', newMetrics)

			// Output comparison
			console.log(results.toDiffTable())
		}, 60000)

		test('bulk movement - 100 shapes x 20 steps', async () => {
			const shapes = createGridShapes(1000, 20) // 20 columns x 50 rows
			editor.createShapes(shapes)

			const results = new ComparisonResults()
			// Pick 100 shapes to move
			const shapeIdsToMove = shapes.slice(0, 100).map((s) => s.id)

			// Run with old implementation
			debugFlags.useSpatialIndex.set(false)
			const collectorOld = new MetricsCollector()
			collectorOld.start()
			await runBulkShapeMovementTest(editor, shapeIdsToMove, 20)
			const oldMetrics = collectorOld.stop()
			results.add('old', oldMetrics)

			// Reset shapes to original positions
			editor.updateShapes(
				shapeIdsToMove.map((id, index) => ({
					id: id as any,
					type: 'perf-test-shape' as const,
					x: index * 250,
					y: Math.floor(index / 10) * 250,
				}))
			)
			await new Promise((resolve) => setTimeout(resolve, 100))

			// Run with spatial index
			debugFlags.useSpatialIndex.set(true)
			const collectorNew = new MetricsCollector()
			collectorNew.start()
			await runBulkShapeMovementTest(editor, shapeIdsToMove, 20)
			const newMetrics = collectorNew.stop()
			results.add('new', newMetrics)

			// Output comparison
			console.log(results.toDiffTable())
		}, 60000)

		test('dense movement - 200 shapes x 10 steps', async () => {
			const shapes = createDenseShapes(500) // Dense canvas with 500 shapes
			editor.createShapes(shapes)

			const results = new ComparisonResults()
			// Pick 200 shapes to move (high density)
			const shapeIdsToMove = shapes.slice(0, 200).map((s) => s.id)

			// Run with old implementation
			debugFlags.useSpatialIndex.set(false)
			const collectorOld = new MetricsCollector()
			collectorOld.start()
			await runBulkShapeMovementTest(editor, shapeIdsToMove, 10)
			const oldMetrics = collectorOld.stop()
			results.add('old', oldMetrics)

			// Reset shapes to original positions
			editor.updateShapes(
				shapeIdsToMove.map((id, index) => ({
					id: id as any,
					type: 'perf-test-shape' as const,
					x: (index % 20) * 300,
					y: Math.floor(index / 20) * 300,
				}))
			)
			await new Promise((resolve) => setTimeout(resolve, 100))

			// Run with spatial index
			debugFlags.useSpatialIndex.set(true)
			const collectorNew = new MetricsCollector()
			collectorNew.start()
			await runBulkShapeMovementTest(editor, shapeIdsToMove, 10)
			const newMetrics = collectorNew.stop()
			results.add('new', newMetrics)

			// Output comparison
			console.log(results.toDiffTable())
		}, 60000)
	})
})
