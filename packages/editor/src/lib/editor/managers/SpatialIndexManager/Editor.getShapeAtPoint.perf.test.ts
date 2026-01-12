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
			isFilled: true,
		})
	}
	indicator() {}
	component() {}
}

interface TestResult {
	implementation: 'old' | 'new'
	avgTime: number
	minTime: number
	maxTime: number
	samples: number
}

function runPerformanceTest(
	editor: Editor,
	useSpatialIndex: boolean,
	testPoints: { x: number; y: number }[],
	iterations: number
): TestResult {
	debugFlags.useSpatialIndex.set(useSpatialIndex)
	const times: number[] = []

	// Warmup
	for (let i = 0; i < 10; i++) {
		editor.getShapeAtPoint(testPoints[i % testPoints.length])
	}

	// Actual test
	for (let i = 0; i < iterations; i++) {
		const point = testPoints[i % testPoints.length]
		const start = performance.now()
		editor.getShapeAtPoint(point)
		const elapsed = performance.now() - start
		times.push(elapsed)
	}

	return {
		implementation: useSpatialIndex ? 'new' : 'old',
		avgTime: times.reduce((sum, t) => sum + t, 0) / times.length,
		minTime: Math.min(...times),
		maxTime: Math.max(...times),
		samples: times.length,
	}
}

describe('getShapeAtPoint Performance Comparison', () => {
	let editor: Editor

	beforeEach(() => {
		editor = new Editor({
			shapeUtils: [TestShape],
			bindingUtils: [],
			tools: [],
			store: createTLStore({ shapeUtils: [TestShape], bindingUtils: [] }),
			getContainer: () => document.body,
		})
		debugFlags.perfLogGetShapeAtPoint.set(false) // Disable logging during tests
	})

	afterEach(() => {
		debugFlags.perfLogGetShapeAtPoint.set(false)
		debugFlags.useSpatialIndex.set(true)
	})

	test('sparse canvas - 100 shapes', () => {
		// Create 100 shapes in a 10x10 grid
		const shapes = []
		for (let i = 0; i < 100; i++) {
			shapes.push({
				id: createShapeId(`shape-${i}`),
				type: 'perf-test-shape' as const,
				x: (i % 10) * 300,
				y: Math.floor(i / 10) * 300,
				props: { w: 100, h: 100 },
			})
		}
		editor.createShapes(shapes)

		// Test points: some hit shapes, some miss
		const testPoints = [
			{ x: 50, y: 50 }, // hits shape 0
			{ x: 350, y: 50 }, // hits shape 1
			{ x: 1500, y: 1500 }, // misses all
			{ x: 650, y: 350 }, // hits shape 22
			{ x: 2000, y: 2000 }, // misses all
		]

		const iterations = 100

		const oldResult = runPerformanceTest(editor, false, testPoints, iterations)
		const newResult = runPerformanceTest(editor, true, testPoints, iterations)

		console.log('\n=== Sparse Canvas (100 shapes) ===')
		console.log(
			`Old: avg ${oldResult.avgTime.toFixed(3)}ms, min ${oldResult.minTime.toFixed(3)}ms, max ${oldResult.maxTime.toFixed(3)}ms`
		)
		console.log(
			`New: avg ${newResult.avgTime.toFixed(3)}ms, min ${newResult.minTime.toFixed(3)}ms, max ${newResult.maxTime.toFixed(3)}ms`
		)
		console.log(`Improvement: ${((1 - newResult.avgTime / oldResult.avgTime) * 100).toFixed(1)}%`)

		// New implementation should not be significantly slower
		expect(newResult.avgTime).toBeLessThanOrEqual(oldResult.avgTime * 2)
	})

	test('dense canvas - 500 shapes', () => {
		// Create 500 shapes in a dense grid
		const shapes = []
		for (let i = 0; i < 500; i++) {
			shapes.push({
				id: createShapeId(`shape-${i}`),
				type: 'perf-test-shape' as const,
				x: (i % 25) * 200,
				y: Math.floor(i / 25) * 200,
				props: { w: 150, h: 150 },
			})
		}
		editor.createShapes(shapes)

		// Test points scattered across canvas
		const testPoints = []
		for (let i = 0; i < 20; i++) {
			testPoints.push({
				x: Math.random() * 5000,
				y: Math.random() * 4000,
			})
		}

		const iterations = 100

		const oldResult = runPerformanceTest(editor, false, testPoints, iterations)
		const newResult = runPerformanceTest(editor, true, testPoints, iterations)

		console.log('\n=== Dense Canvas (500 shapes) ===')
		console.log(
			`Old: avg ${oldResult.avgTime.toFixed(3)}ms, min ${oldResult.minTime.toFixed(3)}ms, max ${oldResult.maxTime.toFixed(3)}ms`
		)
		console.log(
			`New: avg ${newResult.avgTime.toFixed(3)}ms, min ${newResult.minTime.toFixed(3)}ms, max ${newResult.maxTime.toFixed(3)}ms`
		)
		console.log(`Improvement: ${((1 - newResult.avgTime / oldResult.avgTime) * 100).toFixed(1)}%`)

		// New implementation should not be significantly slower
		expect(newResult.avgTime).toBeLessThanOrEqual(oldResult.avgTime * 2)
	})

	test('large canvas - 1000 shapes', () => {
		// Create 1000 shapes
		const shapes = []
		for (let i = 0; i < 1000; i++) {
			shapes.push({
				id: createShapeId(`shape-${i}`),
				type: 'perf-test-shape' as const,
				x: (i % 40) * 250,
				y: Math.floor(i / 40) * 250,
				props: { w: 100, h: 100 },
			})
		}
		editor.createShapes(shapes)

		// Test points
		const testPoints = []
		for (let i = 0; i < 50; i++) {
			testPoints.push({
				x: Math.random() * 10000,
				y: Math.random() * 6250,
			})
		}

		const iterations = 100

		const oldResult = runPerformanceTest(editor, false, testPoints, iterations)
		const newResult = runPerformanceTest(editor, true, testPoints, iterations)

		console.log('\n=== Large Canvas (1000 shapes) ===')
		console.log(
			`Old: avg ${oldResult.avgTime.toFixed(3)}ms, min ${oldResult.minTime.toFixed(3)}ms, max ${oldResult.maxTime.toFixed(3)}ms`
		)
		console.log(
			`New: avg ${newResult.avgTime.toFixed(3)}ms, min ${newResult.minTime.toFixed(3)}ms, max ${newResult.maxTime.toFixed(3)}ms`
		)
		console.log(`Improvement: ${((1 - newResult.avgTime / oldResult.avgTime) * 100).toFixed(1)}%`)

		// New implementation should not be significantly slower
		expect(newResult.avgTime).toBeLessThanOrEqual(oldResult.avgTime * 2)
	})

	test('worst case - point checks empty area with many shapes', () => {
		// Create 500 shapes clustered in one area
		const shapes = []
		for (let i = 0; i < 500; i++) {
			shapes.push({
				id: createShapeId(`shape-${i}`),
				type: 'perf-test-shape' as const,
				x: (i % 25) * 100,
				y: Math.floor(i / 25) * 100,
				props: { w: 80, h: 80 },
			})
		}
		editor.createShapes(shapes)

		// Test point far from all shapes (worst case for spatial index)
		const testPoints = [{ x: 10000, y: 10000 }]

		const iterations = 100

		const oldResult = runPerformanceTest(editor, false, testPoints, iterations)
		const newResult = runPerformanceTest(editor, true, testPoints, iterations)

		console.log('\n=== Worst Case (empty area, 500 shapes) ===')
		console.log(
			`Old: avg ${oldResult.avgTime.toFixed(3)}ms, min ${oldResult.minTime.toFixed(3)}ms, max ${oldResult.maxTime.toFixed(3)}ms`
		)
		console.log(
			`New: avg ${newResult.avgTime.toFixed(3)}ms, min ${newResult.minTime.toFixed(3)}ms, max ${newResult.maxTime.toFixed(3)}ms`
		)
		console.log(`Improvement: ${((1 - newResult.avgTime / oldResult.avgTime) * 100).toFixed(1)}%`)

		// Both should be fast for misses, but spatial index might have overhead
		expect(newResult.avgTime).toBeLessThanOrEqual(oldResult.avgTime * 3)
	})
})
