import { assert, assertExists, createShapeId, TLShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

/**
 * When we're comparing shape indexes, we don't actually care about the specific
 * indexes involved. We're only interested in the ordering of those indexes.
 * This function rewrites indexes to be a range of consecutive numbers starting
 * at 0, where in reality the way we allocate indexes might produce gaps.
 */
function normalizeIndexes(
	renderingShapes: { id: TLShapeId; index: number; backgroundIndex: number }[]
): [id: TLShapeId, index: number, backgroundIndex: number][] {
	const allIndexes = renderingShapes
		.flatMap(({ index, backgroundIndex }) => [index, backgroundIndex])
		.sort((a, b) => a - b)

	const positionsByIndex = new Map<number, number>()
	for (let position = 0; position < allIndexes.length; position++) {
		const index = allIndexes[position]
		assert(!positionsByIndex.has(index), `Duplicate index ${index}`)
		positionsByIndex.set(index, position)
	}

	return renderingShapes.map(({ id, index, backgroundIndex }) => [
		id,
		assertExists(positionsByIndex.get(index)),
		assertExists(positionsByIndex.get(backgroundIndex)),
	])
}

beforeEach(() => {
	editor = new TestEditor()
	editor.setScreenBounds({ x: 0, y: 0, w: 1800, h: 900 })
})

function createShapes() {
	const ids = {
		A: createShapeId('A'),
		B: createShapeId('B'),
		C: createShapeId('C'),
		D: createShapeId('D'),
	}
	editor.createShapes([
		{ id: ids.A, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
		{ id: ids.B, type: 'frame', x: 200, y: 200, props: { w: 300, h: 300 } },
		{ id: ids.C, type: 'geo', x: 200, y: 200, parentId: ids.B, props: { w: 50, h: 50 } },
		{ id: ids.D, type: 'geo', x: 1000, y: 1000, parentId: ids.B, props: { w: 50, h: 50 } },
	])
	return ids
}

it('lists shapes in viewport sorted by id with correct indexes & background indexes', () => {
	const ids = createShapes()
	// Expect the results to be sorted correctly by id
	expect(normalizeIndexes(editor.getRenderingShapes())).toStrictEqual([
		[ids.A, 2, 0],
		[ids.B, 3, 1],
		[ids.C, 6, 4], // the background of C is above B
		[ids.D, 7, 5],
		// A is at the back, then B, and then B's children
	])

	// Send B to the back
	editor.sendToBack([ids.B])

	// The items should still be sorted by id
	expect(normalizeIndexes(editor.getRenderingShapes())).toStrictEqual([
		[ids.A, 7, 1],
		[ids.B, 2, 0],
		[ids.C, 5, 3],
		[ids.D, 6, 4],
		// B is now at the back, then its children, and A is below the group
	])
})

it('handles frames in frames', () => {
	const ids = {
		A: createShapeId('A'),
		B: createShapeId('B'),
		C: createShapeId('C'),
		D: createShapeId('D'),
		E: createShapeId('E'),
		F: createShapeId('F'),
		G: createShapeId('G'),
	}
	editor.createShapes([
		{ id: ids.A, type: 'geo', x: 0, y: 0, props: { w: 10, h: 10 } },
		{ id: ids.B, type: 'frame', x: 100, y: 0, props: { w: 100, h: 100 } },
		{ id: ids.C, type: 'geo', x: 100, y: 0, parentId: ids.B, props: { w: 10, h: 10 } },
		{ id: ids.D, type: 'frame', x: 150, y: 0, parentId: ids.B, props: { w: 100, h: 100 } },
		{ id: ids.E, type: 'geo', x: 150, y: 0, parentId: ids.D, props: { w: 10, h: 10 } },
		{ id: ids.F, type: 'geo', x: 100, y: 0, parentId: ids.B, props: { w: 10, h: 10 } },
		{ id: ids.G, type: 'geo', x: 100, y: 0, props: { w: 10, h: 10 } },
	])

	expect(normalizeIndexes(editor.getRenderingShapes())).toStrictEqual([
		[ids.A, 3, 0],
		[ids.B, 4, 1],
		[ids.C, 8, 5], // frame B creates a background, so C's background layer is above B's foreground
		[ids.D, 9, 6],
		[ids.E, 11, 10], // frame D creates a background too
		[ids.F, 12, 7], // F is above the nested frame, but it's background is still below frame D
		[ids.G, 13, 2], // G is on top of everything, but its BG is behind both frames
	])
})

it('handles groups in frames', () => {
	const ids = {
		A: createShapeId('A'),
		B: createShapeId('B'),
		C: createShapeId('C'),
		D: createShapeId('D'),
		E: createShapeId('E'),
		F: createShapeId('F'),
		G: createShapeId('G'),
	}
	editor.createShapes([
		{ id: ids.A, type: 'geo', x: 0, y: 0, props: { w: 10, h: 10 } },
		{ id: ids.B, type: 'frame', x: 100, y: 0, props: { w: 100, h: 100 } },
		{ id: ids.C, type: 'geo', x: 100, y: 0, parentId: ids.B, props: { w: 10, h: 10 } },
		{ id: ids.D, type: 'group', x: 150, y: 0, parentId: ids.B, props: {} },
		{ id: ids.E, type: 'geo', x: 150, y: 0, parentId: ids.D, props: { w: 10, h: 10 } },
		{ id: ids.F, type: 'geo', x: 100, y: 0, parentId: ids.B, props: { w: 10, h: 10 } },
		{ id: ids.G, type: 'geo', x: 100, y: 0, props: { w: 10, h: 10 } },
	])

	expect(normalizeIndexes(editor.getRenderingShapes())).toStrictEqual([
		[ids.A, 3, 0],
		[ids.B, 4, 1],
		[ids.C, 9, 5], // frame B creates a background, so C's background layer is above B's foreground
		[ids.D, 10, 6],
		[ids.E, 11, 7], // group D doesn't create a background, so E's background remains in order
		[ids.F, 12, 8],
		[ids.G, 13, 2], // G is on top of everything, but its BG is behind the frame
	])
})

it('handles frames in groups', () => {
	const ids = {
		A: createShapeId('A'),
		B: createShapeId('B'),
		C: createShapeId('C'),
		D: createShapeId('D'),
		E: createShapeId('E'),
		F: createShapeId('F'),
		G: createShapeId('G'),
	}
	editor.createShapes([
		{ id: ids.A, type: 'geo', x: 0, y: 0, props: { w: 10, h: 10 } },
		{ id: ids.B, type: 'group', x: 100, y: 0, props: {} },
		{ id: ids.C, type: 'geo', x: 100, y: 0, parentId: ids.B, props: { w: 10, h: 10 } },
		{ id: ids.D, type: 'frame', x: 150, y: 0, parentId: ids.B, props: { w: 100, h: 100 } },
		{ id: ids.E, type: 'geo', x: 150, y: 0, parentId: ids.D, props: { w: 10, h: 10 } },
		{ id: ids.F, type: 'geo', x: 100, y: 0, parentId: ids.B, props: { w: 10, h: 10 } },
		{ id: ids.G, type: 'geo', x: 100, y: 0, props: { w: 10, h: 10 } },
	])

	expect(normalizeIndexes(editor.getRenderingShapes())).toStrictEqual([
		[ids.A, 6, 0],
		[ids.B, 7, 1],
		[ids.C, 8, 2], // groups don't create backgrounds, so things within the group stay in order
		[ids.D, 9, 3],
		[ids.E, 11, 10], // frame G creates a background, so the BG of E is skipped up above D
		[ids.F, 12, 4], // but F after the frame returns to the normal background ordering
		[ids.G, 13, 5], //
	])
})

it('handles groups in groups', () => {
	const ids = {
		A: createShapeId('A'),
		B: createShapeId('B'),
		C: createShapeId('C'),
		D: createShapeId('D'),
		E: createShapeId('E'),
		F: createShapeId('F'),
		G: createShapeId('G'),
	}
	editor.createShapes([
		{ id: ids.A, type: 'geo', x: 0, y: 0, props: { w: 10, h: 10 } },
		{ id: ids.B, type: 'group', x: 100, y: 0, props: {} },
		{ id: ids.C, type: 'geo', x: 100, y: 0, parentId: ids.B, props: { w: 10, h: 10 } },
		{ id: ids.D, type: 'group', x: 150, y: 0, parentId: ids.B, props: {} },
		{ id: ids.E, type: 'geo', x: 150, y: 0, parentId: ids.D, props: { w: 10, h: 10 } },
		{ id: ids.F, type: 'geo', x: 100, y: 0, parentId: ids.B, props: { w: 10, h: 10 } },
		{ id: ids.G, type: 'geo', x: 100, y: 0, props: { w: 10, h: 10 } },
	])

	expect(normalizeIndexes(editor.getRenderingShapes())).toStrictEqual([
		// as groups don't create backgrounds, everything is consecutive
		[ids.A, 7, 0],
		[ids.B, 8, 1],
		[ids.C, 9, 2],
		[ids.D, 10, 3],
		[ids.E, 11, 4],
		[ids.F, 12, 5],
		[ids.G, 13, 6],
	])
})
