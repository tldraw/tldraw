import {
	Box,
	Editor,
	TLGeoShape,
	TLShapeId,
	createShapeId,
	getSnapshot,
	loadSnapshot,
} from '@tldraw/editor'
import { parseTldrawJsonFile, serializeTldrawJson } from 'tldraw/headless-defaults'
import { afterEach, describe, expect, it } from 'vitest'
import { createHeadlessEditor } from '../lib/createHeadlessEditor'

const editors: Editor[] = []
function makeEditor(opts: Parameters<typeof createHeadlessEditor>[0] = {}) {
	const editor = createHeadlessEditor({ frameLoop: 'manual', ...opts })
	editors.push(editor)
	return editor
}

afterEach(() => {
	for (const editor of editors.splice(0)) editor.dispose()
})

const SHAPE_COUNT = 1000
const COLS = 40
const CELL = 150

function makeBigEditor() {
	// the default page cap is 4000; raise it so this document has headroom
	const editor = makeEditor({ editorOptions: { maxShapesPerPage: 5000 } })
	const ids: TLShapeId[] = []
	for (let i = 0; i < SHAPE_COUNT; i++) ids.push(createShapeId(`s${i}`))
	editor.createShapes<TLGeoShape>(
		ids.map((id, i) => ({
			id,
			type: 'geo',
			x: (i % COLS) * CELL,
			y: Math.floor(i / COLS) * CELL,
			props: { w: 100, h: 100 },
		}))
	)
	return { editor, ids }
}

// Loose per-step ceiling: each of these operations is comfortably sub-second on a
// healthy build — 10s only trips on accidentally quadratic behavior, never on a slow CI box.
const STEP_BUDGET_MS = 10_000

function timed<T>(fn: () => T): [T, number] {
	const start = performance.now()
	const result = fn()
	return [result, performance.now() - start]
}

describe('big document smoke', () => {
	it('batch-creates and reads back 1000 shapes', () => {
		const [{ editor, ids }, createMs] = timed(() => makeBigEditor())
		expect(createMs).toBeLessThan(STEP_BUDGET_MS)
		expect(editor.getCurrentPageShapes()).toHaveLength(SHAPE_COUNT)

		const [sorted, sortMs] = timed(() => editor.getCurrentPageShapesSorted())
		expect(sortMs).toBeLessThan(STEP_BUDGET_MS)
		// one createShapes call assigns ascending indexes, so sorted order is creation order
		expect(sorted.map((s) => s.id)).toEqual(ids)

		// spot-check geometry at the far corner of the grid: shape 999 sits at column 39, row 24
		expect(editor.getShapePageBounds(ids[SHAPE_COUNT - 1])).toEqual(
			new Box(39 * CELL, 24 * CELL, 100, 100)
		)
	}, 30_000)

	it('snapshots a 1000-shape document and loads it into a fresh editor', () => {
		const { editor, ids } = makeBigEditor()

		const [snapshot, snapMs] = timed(() => getSnapshot(editor.store))
		expect(snapMs).toBeLessThan(STEP_BUDGET_MS)
		expect(
			Object.values(snapshot.document.store).filter((r) => r.typeName === 'shape')
		).toHaveLength(SHAPE_COUNT)

		const fresh = makeEditor({ editorOptions: { maxShapesPerPage: 5000 } })
		const [, loadMs] = timed(() => loadSnapshot(fresh.store, snapshot))
		expect(loadMs).toBeLessThan(STEP_BUDGET_MS)
		expect(fresh.getCurrentPageShapes()).toHaveLength(SHAPE_COUNT)
		expect(fresh.getShapePageBounds(ids[500])).toEqual(editor.getShapePageBounds(ids[500]))
	}, 30_000)

	it('serializes a 1000-shape document to a .tldr file and parses it back', async () => {
		const { editor, ids } = makeBigEditor()

		const start = performance.now()
		const json = await serializeTldrawJson(editor)
		expect(performance.now() - start).toBeLessThan(STEP_BUDGET_MS)

		const [result, parseMs] = timed(() =>
			parseTldrawJsonFile({ schema: editor.store.schema, json })
		)
		expect(parseMs).toBeLessThan(STEP_BUDGET_MS)
		expect(result.ok).toBe(true)
		if (!result.ok) throw new Error('unreachable')

		try {
			const loaded = makeEditor({
				editorOptions: { maxShapesPerPage: 5000 },
				snapshot: result.value.getStoreSnapshot(),
			})
			expect(loaded.getCurrentPageShapes()).toHaveLength(SHAPE_COUNT)
			expect(loaded.getShapePageBounds(ids[0])).toEqual(new Box(0, 0, 100, 100))
			expect(loaded.getShapePageBounds(ids[SHAPE_COUNT - 1])).toEqual(
				new Box(39 * CELL, 24 * CELL, 100, 100)
			)
		} finally {
			// The parsed store isn't owned by any editor — dispose it even when an assertion fails
			result.value.dispose()
		}
	}, 30_000)
})
