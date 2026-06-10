import { appendFileSync } from 'node:fs'
import { Box, TLArrowShape, TLShapeId, createBindingId, createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

// Wall-clock micro-benchmark for SpatialIndexManager incremental updates.
// Not a correctness suite — numbers are logged for before/after comparison
// of the bounds-recheck strategy. Run with:
//   yarn test run --grep "spatialIndex perf"

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({ options: { maxShapesPerPage: 50_000 } })
	editor.updateViewportScreenBounds(new Box(0, 0, 1000, 1000))
	editor.setCamera({ x: 0, y: 0, z: 1 })
})

afterEach(() => {
	editor?.dispose()
})

const GRID_COLS = 100

function setupGrid(n: number): TLShapeId[] {
	const ids: TLShapeId[] = []
	const shapes = []
	for (let i = 0; i < n; i++) {
		const id = createShapeId(`box-${i}`)
		ids.push(id)
		shapes.push({
			id,
			type: 'geo' as const,
			x: (i % GRID_COLS) * 150,
			y: Math.floor(i / GRID_COLS) * 150,
			props: { w: 100, h: 100 },
		})
	}
	editor.createShapes(shapes)
	return ids
}

function pullIndex() {
	return editor.getShapeIdsInsideBounds(editor.getViewportPageBounds())
}

function time(label: string, steps: number, fn: (i: number) => void): number {
	const start = performance.now()
	for (let i = 0; i < steps; i++) fn(i)
	const elapsed = performance.now() - start
	const line = `[spatialIndex perf] ${label}: ${elapsed.toFixed(1)}ms (${steps} steps)\n`
	// vitest swallows console output for passing tests; append to a file so
	// before/after runs can be compared reliably
	appendFileSync('/tmp/spatial-index-bench.log', line)
	return elapsed
}

describe('spatialIndex perf', () => {
	it('drag one of 10k plain shapes', () => {
		const ids = setupGrid(10_000)
		pullIndex()

		const mover = ids[0]
		time('drag 1 of 10k', 200, (i) => {
			editor.updateShapes([{ id: mover, type: 'geo', x: i }])
			pullIndex()
		})
	}, 120_000)

	it('drag a shape with a bound arrow among 10k shapes', () => {
		const ids = setupGrid(10_000)

		// 200 arrows, each bound from the arrow to a grid box
		const arrowIds: TLShapeId[] = []
		for (let i = 0; i < 200; i++) {
			const arrowId = createShapeId(`arrow-${i}`)
			arrowIds.push(arrowId)
			editor.createShapes<TLArrowShape>([
				{
					id: arrowId,
					type: 'arrow',
					x: 0,
					y: 0,
					props: { start: { x: 0, y: 0 }, end: { x: 100, y: 100 } },
				},
			])
			editor.createBinding({
				id: createBindingId(),
				type: 'arrow',
				fromId: arrowId,
				toId: ids[i],
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
				},
			})
		}
		pullIndex()

		// move the box that arrow-0 is bound to; the arrow's bounds are
		// derived and must follow without its own record changing
		const mover = ids[0]
		time('drag bound shape, 10k page', 200, (i) => {
			editor.updateShapes([{ id: mover, type: 'geo', x: 20_000 + i * 10, y: 20_000 }])
			pullIndex()
		})

		// correctness: the index must know the arrow now stretches to the
		// target's new position (derived bounds, no arrow record change)
		const nearTarget = editor.getShapeIdsInsideBounds(new Box(21_500, 19_500, 1000, 1000))
		expect(nearTarget.has(arrowIds[0])).toBe(true)
		expect(nearTarget.has(arrowIds[1])).toBe(false)
	}, 120_000)

	it('drag a group of 1k children among 10k shapes', () => {
		const ids = setupGrid(10_000)
		const groupId = createShapeId('group')
		editor.groupShapes(ids.slice(0, 1000), { groupId })
		pullIndex()

		time('drag group of 1k, 10k page', 50, (i) => {
			editor.updateShapes([{ id: groupId, type: 'group', x: i * 10 }])
			pullIndex()
		})

		// correctness: children must follow the group in the index even though
		// their records never changed
		editor.updateShapes([{ id: groupId, type: 'group', x: 100_000, y: 100_000 }])
		expect(pullIndex().has(ids[0])).toBe(false)
		const nearGroup = editor.getShapeIdsInsideBounds(new Box(99_500, 99_500, 1000, 1000))
		expect(nearGroup.has(ids[0])).toBe(true)
		expect(nearGroup.has(ids[1001])).toBe(false)
	}, 120_000)

	it('move 1k of 10k shapes per step', () => {
		const ids = setupGrid(10_000)
		pullIndex()

		const movers = ids.slice(0, 1000)
		time('move 1k of 10k', 20, (i) => {
			editor.updateShapes(
				movers.map((id, j) => ({
					id,
					type: 'geo' as const,
					x: (j % GRID_COLS) * 150 + i,
				}))
			)
			pullIndex()
		})
	}, 120_000)
})
