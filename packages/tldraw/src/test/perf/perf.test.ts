import { TLShapePartial, Vec, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from '../TestEditor'
import { PerformanceMeasurer } from './PerformanceMeasurer'

let editor = new TestEditor()

vi.useRealTimers()

describe.skip('Example perf tests', () => {
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
			'Create 200 shapes using Editor.createShapes',
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

	it('measures Editor.updateShape vs Editor.updateShapes', () => {
		const ids = Array.from(Array(200)).map(() => createShapeId())

		const withUpdateShape = new PerformanceMeasurer('Update 200 shapes using Editor.updateShape', {
			warmupIterations: 10,
			iterations: 10,
		})
			.before(() => {
				editor = new TestEditor()
				for (let i = 0; i < 200; i++) {
					editor.createShape({
						type: 'geo',
						id: ids[i],
						x: (i % 10) * 220,
						y: Math.floor(i / 10) * 220,
						props: { w: 200, h: 200 },
					})
				}
			})
			.add(() => {
				for (let i = 0; i < 200; i++) {
					editor.updateShape({
						type: 'geo',
						id: ids[i],
						x: (i % 10) * 220 + 1,
						props: {
							w: 201,
						},
					})
				}
			})

		const withUpdateShapes = new PerformanceMeasurer(
			'Update 200 shapes using Editor.updateShapes',
			{
				warmupIterations: 10,
				iterations: 10,
			}
		)
			.before(() => {
				editor = new TestEditor()
				for (let i = 0; i < 200; i++) {
					editor.createShape({
						id: ids[i],
						type: 'geo',
						x: (i % 10) * 220,
						y: Math.floor(i / 10) * 220,
						props: { w: 200, h: 200 },
					})
				}
			})
			.add(() => {
				const shapesToUpdate: TLShapePartial[] = []
				for (let i = 0; i < 200; i++) {
					shapesToUpdate.push({
						id: ids[i],
						type: 'geo',
						x: (i % 10) * 220 + 1,
						props: {
							w: 201,
						},
					})
				}
				editor.updateShapes(shapesToUpdate)
			})

		PerformanceMeasurer.Table(withUpdateShape, withUpdateShapes)
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

		PerformanceMeasurer.Table(renderingShapes, renderingShapes2)
	}, 10000)
})

it.skip('measures dist', () => {
	const ITEMS = 100000
	const MIN_DIST = 0.712311
	const vecs = Array.from(Array(ITEMS)).map(
		() => new Vec((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2)
	)
	const withDistA = new PerformanceMeasurer('old', {
		warmupIterations: 10,
		iterations: 100,
	}).add(() => {
		for (let i = 0; i < ITEMS - 1; i++) {
			const _result = Vec.Dist(vecs[i], vecs[i + 1]) < MIN_DIST
		}
	})
	const withDistB = new PerformanceMeasurer('new', {
		warmupIterations: 10,
		iterations: 100,
	}).add(() => {
		for (let i = 0; i < ITEMS - 1; i++) {
			const _result = Vec.DistMin(vecs[i], vecs[i + 1], MIN_DIST)
		}
	})
	PerformanceMeasurer.Table(withDistA, withDistB)
})
