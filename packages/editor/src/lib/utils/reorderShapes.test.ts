import { TLParentId, TLShape, TLShapeId, TLShapePartial, createShapeId } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { BaseBoxShapeUtil } from '../editor/shapes/BaseBoxShapeUtil'
import { TestEditor } from '../test/TestEditor'
import { TEST_BOX_TYPE as BOX } from '../test/testShapeTypes'
import { getReorderingShapesChanges } from './reorderShapes'

class BoxUtil extends BaseBoxShapeUtil<TLShape<typeof BOX>> {
	static override type = BOX
	static override props = { w: T.number, h: T.number }
	getDefaultProps() {
		return { w: 100, h: 100 }
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

const ids = {
	A: createShapeId('A'),
	B: createShapeId('B'),
	C: createShapeId('C'),
	D: createShapeId('D'),
	E: createShapeId('E'),
}

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({ shapeUtils: [BoxUtil] })
	// A, B and E overlap each other; C and D sit far to the right and overlap nothing.
	editor.createShapes([
		{ id: ids.A, type: BOX, x: 0, y: 0 },
		{ id: ids.B, type: BOX, x: 50, y: 50 },
		{ id: ids.C, type: BOX, x: 500, y: 0 },
		{ id: ids.D, type: BOX, x: 700, y: 0 },
		{ id: ids.E, type: BOX, x: 0, y: 0 },
	])
})

afterEach(() => {
	editor.dispose()
})

function orderOf(parentId: TLParentId = editor.getCurrentPageId()) {
	return editor.getSortedChildIdsForParent(parentId)
}

function apply(changes: TLShapePartial[]) {
	editor.updateShapes(changes)
	return orderOf()
}

function reorder(
	operation: 'toBack' | 'toFront' | 'forward' | 'backward',
	shapeIds: TLShapeId[],
	opts?: { considerAllShapes?: boolean }
) {
	return getReorderingShapesChanges(editor, operation, shapeIds, opts)
}

describe('getReorderingShapesChanges', () => {
	it('starts from the creation order', () => {
		expect(orderOf()).toEqual([ids.A, ids.B, ids.C, ids.D, ids.E])
	})

	it('returns no changes for an empty selection or unknown ids', () => {
		expect(reorder('toFront', [])).toEqual([])
		expect(reorder('toFront', [createShapeId('missing')])).toEqual([])
	})

	it('returns whole shape records with only the index replaced', () => {
		const changes = reorder('toFront', [ids.A])
		expect(changes).toEqual([{ ...editor.getShape(ids.A), index: changes[0].index }])
		expect(changes[0].index! > editor.getShape(ids.E)!.index).toBe(true)
	})

	describe('toFront', () => {
		it('moves a single shape above everything', () => {
			expect(apply(reorder('toFront', [ids.A]))).toEqual([ids.B, ids.C, ids.D, ids.E, ids.A])
		})

		it('keeps the relative order of a non-contiguous selection', () => {
			const changes = reorder('toFront', [ids.C, ids.A])
			expect(changes.map((c) => c.id)).toEqual([ids.A, ids.C])
			expect(apply(changes)).toEqual([ids.B, ids.D, ids.E, ids.A, ids.C])
		})

		it('slots the moving shapes beneath a selected shape that is already at the front', () => {
			const changes = reorder('toFront', [ids.A, ids.E])
			expect(changes.map((c) => c.id)).toEqual([ids.A])
			expect(apply(changes)).toEqual([ids.B, ids.C, ids.D, ids.A, ids.E])
		})

		it('does nothing when the selection is already at the front', () => {
			expect(reorder('toFront', [ids.E])).toEqual([])
			expect(reorder('toFront', [ids.D, ids.E])).toEqual([])
		})

		it('does nothing when every sibling is selected', () => {
			expect(reorder('toFront', Object.values(ids))).toEqual([])
		})
	})

	describe('toBack', () => {
		it('moves a single shape below everything', () => {
			expect(apply(reorder('toBack', [ids.E]))).toEqual([ids.E, ids.A, ids.B, ids.C, ids.D])
		})

		it('keeps the relative order of a non-contiguous selection', () => {
			const changes = reorder('toBack', [ids.D, ids.B])
			expect(changes.map((c) => c.id)).toEqual([ids.B, ids.D])
			expect(apply(changes)).toEqual([ids.B, ids.D, ids.A, ids.C, ids.E])
		})

		it('only moves the shapes that are not already at the back', () => {
			const changes = reorder('toBack', [ids.A, ids.C])
			expect(changes.map((c) => c.id)).toEqual([ids.C])
			expect(apply(changes)).toEqual([ids.A, ids.C, ids.B, ids.D, ids.E])
		})

		it('does nothing when the selection is already at the back', () => {
			expect(reorder('toBack', [ids.A])).toEqual([])
			expect(reorder('toBack', [ids.A, ids.B])).toEqual([])
		})

		it('does nothing when every sibling is selected', () => {
			expect(reorder('toBack', Object.values(ids))).toEqual([])
		})
	})

	describe('forward', () => {
		it('moves a shape above the next sibling that overlaps it', () => {
			expect(apply(reorder('forward', [ids.A]))).toEqual([ids.B, ids.A, ids.C, ids.D, ids.E])
		})

		it('skips non-overlapping siblings to reach the next overlapping one', () => {
			expect(apply(reorder('forward', [ids.B]))).toEqual([ids.A, ids.C, ids.D, ids.E, ids.B])
		})

		it('does nothing when no sibling above overlaps the shape', () => {
			expect(reorder('forward', [ids.C])).toEqual([])
		})

		it('swaps with the immediate sibling when considering all shapes', () => {
			expect(apply(reorder('forward', [ids.C], { considerAllShapes: true }))).toEqual([
				ids.A,
				ids.B,
				ids.D,
				ids.C,
				ids.E,
			])
		})

		it('moves each run of a non-contiguous selection independently', () => {
			expect(apply(reorder('forward', [ids.A, ids.C], { considerAllShapes: true }))).toEqual([
				ids.B,
				ids.A,
				ids.D,
				ids.C,
				ids.E,
			])
		})

		it('moves a contiguous run together above the next sibling', () => {
			const changes = reorder('forward', [ids.A, ids.B], { considerAllShapes: true })
			expect(changes.map((c) => c.id)).toEqual([ids.A, ids.B])
			expect(apply(changes)).toEqual([ids.C, ids.A, ids.B, ids.D, ids.E])
		})

		it('does nothing when the selection is already at the front', () => {
			expect(reorder('forward', [ids.E], { considerAllShapes: true })).toEqual([])
			expect(reorder('forward', [ids.D, ids.E], { considerAllShapes: true })).toEqual([])
		})
	})

	describe('backward', () => {
		it('moves a shape below the next sibling beneath it that overlaps it', () => {
			expect(apply(reorder('backward', [ids.E]))).toEqual([ids.A, ids.E, ids.B, ids.C, ids.D])
		})

		it('does nothing when no sibling below overlaps the shape', () => {
			expect(reorder('backward', [ids.D])).toEqual([])
		})

		it('swaps with the immediate sibling when considering all shapes', () => {
			expect(apply(reorder('backward', [ids.C], { considerAllShapes: true }))).toEqual([
				ids.A,
				ids.C,
				ids.B,
				ids.D,
				ids.E,
			])
		})

		it('moves each run of a non-contiguous selection independently', () => {
			expect(apply(reorder('backward', [ids.B, ids.D], { considerAllShapes: true }))).toEqual([
				ids.B,
				ids.A,
				ids.D,
				ids.C,
				ids.E,
			])
		})

		it('moves a contiguous run together below the previous sibling', () => {
			const changes = reorder('backward', [ids.D, ids.E], { considerAllShapes: true })
			expect(changes.map((c) => c.id)).toEqual([ids.D, ids.E])
			expect(apply(changes)).toEqual([ids.A, ids.B, ids.D, ids.E, ids.C])
		})

		it('does nothing when the selection is already at the back', () => {
			expect(reorder('backward', [ids.A], { considerAllShapes: true })).toEqual([])
			expect(reorder('backward', [ids.A, ids.B], { considerAllShapes: true })).toEqual([])
		})
	})

	describe('with shapes under different parents', () => {
		beforeEach(() => {
			editor.reparentShapes([ids.D, ids.E], ids.A)
		})

		it('reorders each shape among its own siblings', () => {
			expect(orderOf()).toEqual([ids.A, ids.B, ids.C])
			expect(orderOf(ids.A)).toEqual([ids.D, ids.E])

			const changes = reorder('toFront', [ids.B, ids.D])
			expect(changes.map((c) => c.id).sort()).toEqual([ids.B, ids.D].sort())

			editor.updateShapes(changes)
			expect(orderOf()).toEqual([ids.A, ids.C, ids.B])
			expect(orderOf(ids.A)).toEqual([ids.E, ids.D])
		})

		it('treats a fully selected child set as a no-op for that parent only', () => {
			const changes = reorder('toBack', [ids.C, ids.D, ids.E])
			expect(changes.map((c) => c.id)).toEqual([ids.C])
		})
	})
})
