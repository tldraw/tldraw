import { Box, TLShapeId, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { MinimapManager } from '../../lib/ui/components/Minimap/MinimapManager'
import { TestEditor } from '../TestEditor'

// Opt-in micro-benchmark for the minimap's JS-side cost. Run with:
//   MINIMAP_BENCH=1 pnpm test run src/test/perf/minimap.perf.test.ts
//
// jsdom has no real canvas, so drawing calls are no-ops and Path2D is a stub that only
// counts calls. That isolates what we control in JS (reactive invalidation, cache
// lookups, path building, draw-call count) from browser raster cost, which needs the
// Playwright FPS suite to measure.

vi.useRealTimers()

const SIZES = [1_000, 10_000, 25_000]
const WARMUP = 5
const ITERATIONS = 40

const counts = { path2d: 0, rect: 0 }

class CountingPath2D {
	constructor() {
		counts.path2d++
	}
	rect() {
		counts.rect++
	}
	roundRect() {
		counts.rect++
	}
}

function median(values: number[]) {
	const sorted = [...values].sort((a, b) => a - b)
	const mid = sorted.length >> 1
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function setupBoard(n: number) {
	// The default maxShapesPerPage (4000) would silently drop most of the larger boards.
	const editor = new TestEditor({ options: { maxShapesPerPage: Infinity } })
	const cols = Math.ceil(Math.sqrt(n))
	const ids: TLShapeId[] = []
	const partials = []
	for (let i = 0; i < n; i++) {
		const id = createShapeId()
		ids.push(id)
		partials.push({
			id,
			type: 'geo' as const,
			x: (i % cols) * 120,
			y: Math.floor(i / cols) * 120,
			props: { w: 100, h: 100 },
		})
	}
	editor.createShapes(partials)
	if (editor.getCurrentPageShapeIds().size !== n)
		throw new Error(`board has fewer than ${n} shapes`)
	editor.selectNone()
	return { editor, ids }
}

function attachMinimap(editor: TestEditor) {
	const container = document.createElement('div')
	const canvas = document.createElement('canvas')
	container.appendChild(canvas)
	document.body.appendChild(container)

	const minimap = new MinimapManager(editor, canvas, container)
	// jsdom never lays out, so give the canvas a size the way the ResizeObserver would.
	;(minimap as any).canvasBoundingClientRect.set(new Box(0, 0, 200, 150))

	return () => {
		minimap.close()
		container.remove()
	}
}

interface Scenario {
	name: string
	setup?(): void
	op(): void
}

interface Sample {
	ms: number
	pathRebuilds: number
	rects: number
}

function measure(scenario: Scenario): Sample {
	scenario.setup?.()
	for (let i = 0; i < WARMUP; i++) scenario.op()

	const times: number[] = []
	counts.path2d = 0
	counts.rect = 0
	for (let i = 0; i < ITERATIONS; i++) {
		const t0 = performance.now()
		scenario.op()
		times.push(performance.now() - t0)
	}
	return {
		ms: median(times),
		// Each getShapePaths rebuild allocates two Path2Ds.
		pathRebuilds: counts.path2d / 2 / ITERATIONS,
		rects: counts.rect / ITERATIONS,
	}
}

function round(ms: number) {
	return +ms.toFixed(3)
}

describe.runIf(process.env.MINIMAP_BENCH)('minimap perf', () => {
	beforeAll(() => {
		vi.stubGlobal('Path2D', CountingPath2D)
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
			() => new Proxy({}, { get: () => () => {} }) as any
		)
	})

	afterAll(() => {
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
	})

	// The minimap's cost is the op time with it attached minus the op time without it.
	// Timing render() alone undercounts: the reaction's parent check recomputes
	// getShapePaths before render runs, and that rebuild is where the time goes.
	it("measures the minimap's added cost per editor change", () => {
		const results: Record<string, string | number>[] = []

		for (const n of SIZES) {
			const { editor, ids } = setupBoard(n)
			const many = ids.slice(0, 100)
			// Every op writes fresh values so none of them is a no-op.
			let tick = 0

			const scenarios: Scenario[] = [
				{
					name: 'move 1 shape',
					setup: () => editor.selectNone(),
					op: () => editor.updateShape({ id: ids[0], type: 'geo', x: ++tick }),
				},
				{
					name: 'move 100 shapes',
					op: () => {
						tick++
						editor.updateShapes(many.map((id, j) => ({ id, type: 'geo', x: tick + j * 120 })))
					},
				},
				{
					name: 'change selection',
					op: () => editor.select(ids[++tick % ids.length]),
				},
				{
					name: 'pan camera',
					op: () => editor.setCamera({ x: -(++tick % 1000) * 10, y: 0, z: 1 }),
				},
				{
					name: 'zoom camera',
					op: () => editor.setCamera({ x: 0, y: 0, z: 0.5 + (++tick % 10) * 0.05 }),
				},
				{
					// The drag case: moving selected shapes hits both the selection and shape paths.
					name: 'move 100 selected',
					setup: () => editor.select(...many),
					op: () => {
						tick++
						editor.updateShapes(many.map((id, j) => ({ id, type: 'geo', x: tick + j * 120 })))
					},
				},
			]

			const without = scenarios.map(measure)

			editor.selectNone()
			counts.path2d = 0
			counts.rect = 0
			const t0 = performance.now()
			const detach = attachMinimap(editor)
			const firstRenderMs = round(performance.now() - t0)
			results.push({
				scenario: 'first render',
				shapes: n,
				withoutMs: '-',
				withMs: firstRenderMs,
				minimapMs: firstRenderMs,
				pathRebuilds: counts.path2d / 2,
				rects: counts.rect,
			})

			const withMinimap = scenarios.map(measure)
			detach()

			scenarios.forEach((scenario, i) => {
				results.push({
					scenario: scenario.name,
					shapes: n,
					withoutMs: round(without[i].ms),
					withMs: round(withMinimap[i].ms),
					minimapMs: round(withMinimap[i].ms - without[i].ms),
					pathRebuilds: withMinimap[i].pathRebuilds,
					rects: withMinimap[i].rects,
				})
			})
		}

		const cols = Object.keys(results[0])
		const rows = [cols, ...results.map((r) => cols.map((c) => String(r[c])))]
		const widths = cols.map((_, i) => Math.max(...rows.map((r) => r[i].length)))
		process.stdout.write(
			'\n' + rows.map((r) => r.map((v, i) => v.padEnd(widths[i])).join('  ')).join('\n') + '\n'
		)
	}, 300_000)
})
