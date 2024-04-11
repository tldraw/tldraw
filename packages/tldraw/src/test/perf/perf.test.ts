import { TLShapePartial, createShapeId } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor = new TestEditor()

jest.useRealTimers()

const now = () => {
	const hrTime = process.hrtime()
	return hrTime[0] * 1000 + hrTime[1] / 1000000
}

export class PerformanceMeasurer {
	private setupFn?: () => void
	private beforeFns: (() => void)[] = []
	private fns: (() => void)[] = []
	private afterFns: (() => void)[] = []
	private teardownFn?: () => void
	private warmupIterations = 0
	private iterations = 0

	total = 0
	average = 0
	cold = 0
	fastest = Infinity
	slowest = -Infinity

	totalStart = 0
	totalEnd = 0
	totalTime = 0

	constructor(
		public name: string,
		opts = {} as {
			warmupIterations?: number
			iterations?: number
		}
	) {
		const { warmupIterations = 0, iterations = 10 } = opts
		this.warmupIterations = warmupIterations
		this.iterations = iterations
	}

	setup(cb: () => void) {
		this.setupFn = cb
		return this
	}

	teardown(cb: () => void) {
		this.teardownFn = cb
		return this
	}

	add(cb: () => void) {
		this.fns.push(cb)
		return this
	}

	before(cb: () => void) {
		this.beforeFns.push(cb)
		return this
	}

	after(cb: () => void) {
		this.afterFns.push(cb)
		return this
	}

	run() {
		const { fns, beforeFns, afterFns, warmupIterations, iterations } = this

		// Run the cold run
		this.setupFn?.()
		const a = now()
		for (let k = 0; k < beforeFns.length; k++) {
			beforeFns[k]()
		}
		for (let j = 0; j < fns.length; j++) {
			fns[j]()
		}
		for (let l = 0; l < afterFns.length; l++) {
			afterFns[l]()
		}
		const duration = now() - a
		this.cold = duration
		this.teardownFn?.()

		// Run all of the warmup iterations
		if (this.warmupIterations > 0) {
			this.setupFn?.()
			for (let i = 0; i < warmupIterations; i++) {
				for (let k = 0; k < beforeFns.length; k++) {
					beforeFns[k]()
				}
				const _a = now()
				for (let j = 0; j < fns.length; j++) {
					fns[j]()
				}
				const _duration = now() - a
				for (let l = 0; l < afterFns.length; l++) {
					afterFns[l]()
				}
			}
			this.teardownFn?.()
		}

		this.totalStart = now()

		// Run all of the iterations and calculate average
		if (this.iterations > 0) {
			this.setupFn?.()
			for (let i = 0; i < iterations; i++) {
				for (let k = 0; k < beforeFns.length; k++) {
					beforeFns[k]()
				}
				const a = now()
				for (let j = 0; j < fns.length; j++) {
					fns[j]()
				}
				const duration = now() - a
				this.total += duration
				this.fastest = Math.min(duration, this.fastest)
				this.slowest = Math.max(duration, this.fastest)
				for (let l = 0; l < afterFns.length; l++) {
					afterFns[l]()
				}
			}
			this.teardownFn?.()
		}

		this.totalTime = now() - this.totalStart
		if (iterations > 0) {
			this.average = this.total / iterations
		}

		return this
	}

	report() {
		return PerformanceMeasurer.Table(this)
	}

	static Table(...ps: PerformanceMeasurer[]) {
		const table: Record<string, Record<string, number | string>> = {}
		const fastest = ps.map((p) => p.average).reduce((a, b) => Math.min(a, b))
		const totalFastest = ps.map((p) => p.totalTime).reduce((a, b) => Math.min(a, b))

		ps.forEach(
			(p) =>
				(table[p.name] = {
					['Runs']: p.warmupIterations + p.iterations,
					['Cold']: +p.cold.toFixed(2),
					['Slowest']: +p.slowest.toFixed(2),
					['Fastest']: +p.fastest.toFixed(2),
					['Average']: +p.average.toFixed(2),
					['Slower (Avg)']: +(p.average / fastest).toFixed(2),
					['Slower (All)']: +(p.totalTime / totalFastest).toFixed(2),
				})
		)
		// eslint-disable-next-line no-console
		console.table(table)
	}
}

describe('A simple perf test', () => {
	it('measures Editor.createShape vs Editor.createShapes', () => {
		const withCreateShape = new PerformanceMeasurer('Create 200 shapes using Editor.createShape', {
			warmupIterations: 10,
			iterations: 10,
		})
			.before(() => {
				editor = new TestEditor()
			})
			.add(() => {
				for (let i = 0; i < 200; i++) {
					editor.createShape({
						type: 'geo',
						x: (i % 10) * 220,
						y: Math.floor(i / 10) * 220,
						props: { w: 200, h: 200 },
					})
				}
			})

		const withCreateShapes = new PerformanceMeasurer(
			'Create 100 shapes using Editor.createShapes',
			{
				warmupIterations: 10,
				iterations: 10,
			}
		)
			.before(() => {
				editor = new TestEditor()
			})
			.add(() => {
				const shapesToCreate: TLShapePartial[] = []
				for (let i = 0; i < 200; i++) {
					shapesToCreate.push({
						id: createShapeId(),
						type: 'geo',
						x: (i % 10) * 220,
						y: Math.floor(i / 10) * 220,
						props: { w: 200, h: 200 },
					})
				}

				editor.createShapes(shapesToCreate)
			})

		withCreateShape.run()
		withCreateShapes.run()

		PerformanceMeasurer.Table(withCreateShape, withCreateShapes)

		expect(withCreateShape.average).toBeGreaterThan(withCreateShapes.average)
	}, 10000)

	it('Measures rendering shapes', () => {
		const renderingShapes = new PerformanceMeasurer('Measure rendering bounds with 100 shapes', {
			warmupIterations: 10,
			iterations: 20,
		})
			.before(() => {
				editor = new TestEditor()
				const shapesToCreate: TLShapePartial[] = []
				for (let i = 0; i < 100; i++) {
					shapesToCreate.push({
						id: createShapeId(),
						type: 'geo',
						x: (i % 10) * 220,
						y: Math.floor(i / 10) * 220,
						props: { w: 200, h: 200 },
					})
				}
				editor.createShapes(shapesToCreate)
			})
			.add(() => {
				editor.getRenderingShapes()
			})
			.after(() => {
				const shape = editor.getCurrentPageShapes()[0]
				editor.updateShape({ ...shape, x: shape.x + 1 })
			})
			.run()

		const renderingShapes2 = new PerformanceMeasurer('Measure rendering bounds with 200 shapes', {
			warmupIterations: 10,
			iterations: 20,
		})
			.before(() => {
				editor = new TestEditor()
				const shapesToCreate: TLShapePartial[] = []
				for (let i = 0; i < 200; i++) {
					shapesToCreate.push({
						id: createShapeId(),
						type: 'geo',
						x: (i % 10) * 220,
						y: Math.floor(i / 10) * 220,
						props: { w: 200, h: 200 },
					})
				}
				editor.createShapes(shapesToCreate)
			})
			.add(() => {
				editor.getRenderingShapes()
			})
			.after(() => {
				const shape = editor.getCurrentPageShapes()[0]
				editor.updateShape({ ...shape, x: shape.x + 1 })
			})
			.run()

		PerformanceMeasurer.Table(renderingShapes, renderingShapes2)
	}, 10000)
})
