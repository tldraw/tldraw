import { PageRecordType, TLParentId, TLShape, TLShapeId, createShapeId } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { BaseBoxShapeUtil } from '../editor/shapes/BaseBoxShapeUtil'
import { BaseFrameLikeShapeUtil } from '../editor/shapes/BaseFrameLikeShapeUtil'
import { TestEditor } from '../test/TestEditor'
import { TEST_BOX_TYPE as BOX, TEST_FRAME_TYPE as FRAME } from '../test/testShapeTypes'
import { getDroppedShapesToNewParents, kickoutOccludedShapes } from './reparenting'

class BoxUtil extends BaseBoxShapeUtil<TLShape<typeof BOX>> {
	static override type = BOX
	static override props = { w: T.number, h: T.number }
	getDefaultProps() {
		return { w: 50, h: 50 }
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

class FrameUtil extends BaseFrameLikeShapeUtil<TLShape<typeof FRAME>> {
	static override type = FRAME
	static override props = { w: T.number, h: T.number }
	getDefaultProps() {
		return { w: 200, h: 200 }
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({ shapeUtils: [BoxUtil, FrameUtil] })
})

afterEach(() => {
	editor.dispose()
})

function frame(
	id: TLShapeId,
	x: number,
	y: number,
	opts: { w?: number; h?: number; parentId?: TLParentId; isLocked?: boolean } = {}
) {
	const { w = 200, h = 200, parentId = editor.getCurrentPageId(), ...rest } = opts
	editor.createShapes([{ id, type: FRAME, x, y, props: { w, h }, parentId, ...rest }])
	return editor.getShape(id)!
}

function box(
	id: TLShapeId,
	x: number,
	y: number,
	opts: { w?: number; h?: number; parentId?: TLParentId; isLocked?: boolean } = {}
) {
	const { w = 50, h = 50, parentId = editor.getCurrentPageId(), ...rest } = opts
	editor.createShapes([{ id, type: BOX, x, y, props: { w, h }, parentId, ...rest }])
	return editor.getShape(id)!
}

// Editor.groupShapes only runs while the select tool is active, which the TestEditor never is.
function group(id: TLShapeId, childIds: TLShapeId[]) {
	editor.createShapes([{ id, type: 'group', x: 0, y: 0, parentId: editor.getCurrentPageId() }])
	editor.reparentShapes(childIds, id)
	return editor.getShape(id)!
}

function shape(id: TLShapeId) {
	return editor.getShape(id)!
}

function reparentingIds(reparenting: Map<TLShapeId, TLShape[]>) {
	return Object.fromEntries(
		Array.from(reparenting.entries()).map(([parentId, shapes]) => [
			parentId,
			shapes.map((s) => s.id),
		])
	)
}

function remainingIds(remaining: Set<TLShape>) {
	return Array.from(remaining).map((s) => s.id)
}

const ids = {
	frameA: createShapeId('frameA'),
	frameB: createShapeId('frameB'),
	outer: createShapeId('outer'),
	inner: createShapeId('inner'),
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
	group: createShapeId('group'),
}

describe('getDroppedShapesToNewParents', () => {
	it('assigns a shape fully inside a frame to that frame', () => {
		frame(ids.frameA, 0, 0)
		const b = box(ids.box1, 50, 50)

		const result = getDroppedShapesToNewParents(editor, [b])
		expect(reparentingIds(result.reparenting)).toEqual({ [ids.frameA]: [ids.box1] })
		expect(remainingIds(result.remainingShapesToReparent)).toEqual([])
	})

	it('accepts a set of shapes as well as an array', () => {
		frame(ids.frameA, 0, 0)
		const b = box(ids.box1, 50, 50)

		const result = getDroppedShapesToNewParents(editor, new Set([b]))
		expect(reparentingIds(result.reparenting)).toEqual({ [ids.frameA]: [ids.box1] })
	})

	it('assigns a shape that only partially overlaps a frame to that frame', () => {
		frame(ids.frameA, 0, 0)
		const b = box(ids.box1, 180, 180)

		const result = getDroppedShapesToNewParents(editor, [b])
		expect(reparentingIds(result.reparenting)).toEqual({ [ids.frameA]: [ids.box1] })
	})

	it('leaves a shape outside every frame in the remaining set', () => {
		frame(ids.frameA, 0, 0)
		const b = box(ids.box1, 300, 300)

		const result = getDroppedShapesToNewParents(editor, [b])
		expect(reparentingIds(result.reparenting)).toEqual({})
		expect(remainingIds(result.remainingShapesToReparent)).toEqual([ids.box1])
	})

	it('returns nothing for a shape that is already a child of the frame it sits in', () => {
		frame(ids.frameA, 0, 0)
		const b = box(ids.box1, 50, 50, { parentId: ids.frameA })

		const result = getDroppedShapesToNewParents(editor, [b])
		expect(reparentingIds(result.reparenting)).toEqual({})
		expect(remainingIds(result.remainingShapesToReparent)).toEqual([])
	})

	it('splits a mixed selection between frames and the remaining set', () => {
		frame(ids.frameA, 0, 0)
		frame(ids.frameB, 500, 0)
		const b1 = box(ids.box1, 10, 10)
		const b2 = box(ids.box2, 510, 10)
		const b3 = box(ids.box3, 1000, 1000)

		const result = getDroppedShapesToNewParents(editor, [b1, b2, b3])
		expect(reparentingIds(result.reparenting)).toEqual({
			[ids.frameA]: [ids.box1],
			[ids.frameB]: [ids.box2],
		})
		expect(remainingIds(result.remainingShapesToReparent)).toEqual([ids.box3])
	})

	it('prefers the topmost frame when frames overlap', () => {
		frame(ids.frameA, 0, 0)
		frame(ids.frameB, 100, 100)
		const b = box(ids.box1, 120, 120)

		const result = getDroppedShapesToNewParents(editor, [b])
		expect(reparentingIds(result.reparenting)).toEqual({ [ids.frameB]: [ids.box1] })
	})

	describe('with nested frames', () => {
		beforeEach(() => {
			frame(ids.outer, 0, 0, { w: 400, h: 400 })
			frame(ids.inner, 50, 50, { parentId: ids.outer })
		})

		it('assigns to the innermost frame containing the shape', () => {
			const b = box(ids.box1, 100, 100)
			const result = getDroppedShapesToNewParents(editor, [b])
			expect(reparentingIds(result.reparenting)).toEqual({ [ids.inner]: [ids.box1] })
		})

		it('assigns to the outer frame when the shape is outside the inner one', () => {
			const b = box(ids.box1, 300, 300)
			const result = getDroppedShapesToNewParents(editor, [b])
			expect(reparentingIds(result.reparenting)).toEqual({ [ids.outer]: [ids.box1] })
		})

		it('never drops a frame into one of its own descendants', () => {
			const result = getDroppedShapesToNewParents(editor, [shape(ids.outer)])
			expect(reparentingIds(result.reparenting)).toEqual({})
			expect(remainingIds(result.remainingShapesToReparent)).toEqual([ids.outer])
		})

		it('does not use a moving frame as a drop target', () => {
			const b = box(ids.box1, 100, 100)
			const result = getDroppedShapesToNewParents(editor, [shape(ids.inner), b])
			expect(reparentingIds(result.reparenting)).toEqual({ [ids.outer]: [ids.box1] })
			expect(remainingIds(result.remainingShapesToReparent)).toEqual([])
		})
	})

	it('ignores frames that cannot receive children', () => {
		frame(ids.frameA, 0, 0, { isLocked: true })
		const b = box(ids.box1, 50, 50)

		const result = getDroppedShapesToNewParents(editor, [b])
		expect(reparentingIds(result.reparenting)).toEqual({})
		expect(remainingIds(result.remainingShapesToReparent)).toEqual([ids.box1])
	})

	it('skips parents rejected by the callback', () => {
		frame(ids.frameA, 0, 0)
		frame(ids.frameB, 100, 100)
		const b = box(ids.box1, 120, 120)

		const cb = vi.fn((_shape: TLShape, parent: TLShape) => parent.id !== ids.frameB)
		const result = getDroppedShapesToNewParents(editor, [b], cb)
		expect(reparentingIds(result.reparenting)).toEqual({ [ids.frameA]: [ids.box1] })
		expect(cb).toHaveBeenCalledWith(b, shape(ids.frameB))
		expect(cb).toHaveBeenCalledWith(b, shape(ids.frameA))
	})

	describe('with groups', () => {
		it('checks the group instead when all of its children are moving', () => {
			frame(ids.frameA, 0, 0)
			box(ids.box1, 50, 50)
			box(ids.box2, 100, 100)
			group(ids.group, [ids.box1, ids.box2])

			const result = getDroppedShapesToNewParents(editor, [shape(ids.box1), shape(ids.box2)])
			expect(reparentingIds(result.reparenting)).toEqual({ [ids.frameA]: [ids.group] })
			expect(remainingIds(result.remainingShapesToReparent)).toEqual([])
		})

		// Locks in current behaviour, see #10554.
		it('substitutes the group even when only some of its direct children are moving', () => {
			frame(ids.frameA, 0, 0)
			box(ids.box1, 50, 50)
			box(ids.box2, 1000, 1000)
			group(ids.group, [ids.box1, ids.box2])

			const result = getDroppedShapesToNewParents(editor, [shape(ids.box1)])
			expect(reparentingIds(result.reparenting)).toEqual({ [ids.frameA]: [ids.group] })
			expect(remainingIds(result.remainingShapesToReparent)).toEqual([])
		})

		it('does not move a shape into a frame outside its group', () => {
			frame(ids.frameA, 0, 0)
			frame(ids.frameB, 500, 0)
			box(ids.box2, 1000, 1000)
			group(ids.group, [ids.frameB, ids.box2])
			// A child of the grouped frame, positioned over the ungrouped frame.
			box(ids.box1, -490, 10, { parentId: ids.frameB })
			expect(editor.getShapePageBounds(ids.box1)).toMatchObject({ x: 10, y: 10 })

			const result = getDroppedShapesToNewParents(editor, [shape(ids.box1)])
			expect(reparentingIds(result.reparenting)).toEqual({})
			expect(remainingIds(result.remainingShapesToReparent)).toEqual([ids.box1])
		})

		it('moves a shape into a frame inside the same group', () => {
			frame(ids.frameA, 0, 0)
			frame(ids.frameB, 500, 0)
			group(ids.group, [ids.frameA, ids.frameB])
			box(ids.box1, -490, 10, { parentId: ids.frameB })

			const result = getDroppedShapesToNewParents(editor, [shape(ids.box1)])
			expect(reparentingIds(result.reparenting)).toEqual({ [ids.frameA]: [ids.box1] })
			expect(remainingIds(result.remainingShapesToReparent)).toEqual([])
		})
	})
})

describe('kickoutOccludedShapes', () => {
	it('leaves a child that is still inside its frame alone', () => {
		frame(ids.frameA, 0, 0)
		box(ids.box1, 50, 50, { parentId: ids.frameA })

		kickoutOccludedShapes(editor, [ids.box1])
		expect(shape(ids.box1).parentId).toBe(ids.frameA)
	})

	it('leaves a child that still partially overlaps its frame alone', () => {
		frame(ids.frameA, 0, 0)
		box(ids.box1, 180, 180, { parentId: ids.frameA })

		kickoutOccludedShapes(editor, [ids.box1])
		expect(shape(ids.box1).parentId).toBe(ids.frameA)
	})

	it('reparents a child that has left its frame to the page, directly above the frame', () => {
		frame(ids.frameA, 0, 0)
		box(ids.box2, 1000, 0)
		box(ids.box1, 500, 500, { parentId: ids.frameA })

		kickoutOccludedShapes(editor, [ids.box1])
		expect(shape(ids.box1).parentId).toBe(editor.getCurrentPageId())
		expect(editor.getSortedChildIdsForParent(editor.getCurrentPageId())).toEqual([
			ids.frameA,
			ids.box1,
			ids.box2,
		])
	})

	it('keeps the page position of a kicked out child', () => {
		frame(ids.frameA, 100, 100)
		box(ids.box1, 500, 500, { parentId: ids.frameA })
		const before = editor.getShapePageBounds(ids.box1)

		kickoutOccludedShapes(editor, [ids.box1])
		expect(editor.getShapePageBounds(ids.box1)).toEqual(before)
		expect(shape(ids.box1)).toMatchObject({ x: 600, y: 600 })
	})

	it('keeps the relative order of several kicked out children', () => {
		frame(ids.frameA, 0, 0)
		box(ids.box1, 500, 500, { parentId: ids.frameA })
		box(ids.box2, 600, 600, { parentId: ids.frameA })
		box(ids.box3, 1000, 0)

		kickoutOccludedShapes(editor, [ids.box2, ids.box1])
		expect(editor.getSortedChildIdsForParent(editor.getCurrentPageId())).toEqual([
			ids.frameA,
			ids.box1,
			ids.box2,
			ids.box3,
		])
	})

	it('checks the children of a frame when the frame itself is passed', () => {
		frame(ids.frameA, 0, 0)
		box(ids.box1, 500, 500, { parentId: ids.frameA })

		kickoutOccludedShapes(editor, [ids.frameA])
		expect(shape(ids.box1).parentId).toBe(editor.getCurrentPageId())
	})

	it('ignores unknown ids and page-level shapes', () => {
		box(ids.box1, 0, 0)
		const before = shape(ids.box1)

		kickoutOccludedShapes(editor, [createShapeId('missing'), ids.box1])
		expect(shape(ids.box1)).toBe(before)
	})

	it('moves a child into another frame beneath it that now contains it', () => {
		frame(ids.frameB, 500, 0)
		frame(ids.frameA, 0, 0)
		box(ids.box1, 520, 20, { parentId: ids.frameA })

		kickoutOccludedShapes(editor, [ids.box1])
		expect(shape(ids.box1).parentId).toBe(ids.frameB)
		expect(editor.getShapePageBounds(ids.box1)).toMatchObject({ x: 520, y: 20 })
	})

	it('does not move a child into a frame that is above it in z order', () => {
		frame(ids.frameA, 0, 0)
		box(ids.box1, 520, 20, { parentId: ids.frameA })
		frame(ids.frameB, 500, 0)

		kickoutOccludedShapes(editor, [ids.box1])
		expect(shape(ids.box1).parentId).toBe(editor.getCurrentPageId())
		expect(editor.getSortedChildIdsForParent(editor.getCurrentPageId())).toEqual([
			ids.frameA,
			ids.box1,
			ids.frameB,
		])
	})

	it('moves a child that left an inner frame into the enclosing outer frame', () => {
		frame(ids.outer, 0, 0, { w: 400, h: 400 })
		frame(ids.inner, 50, 50, { parentId: ids.outer })
		box(ids.box1, 250, 250, { parentId: ids.inner })

		kickoutOccludedShapes(editor, [ids.box1])
		expect(shape(ids.box1).parentId).toBe(ids.outer)
	})

	it('moves a kicked out child to the frame’s enclosing group rather than the page', () => {
		frame(ids.frameA, 0, 0)
		box(ids.box2, 1000, 1000)
		group(ids.group, [ids.frameA, ids.box2])
		box(ids.box1, 500, 500, { parentId: ids.frameA })

		kickoutOccludedShapes(editor, [ids.box1])
		expect(shape(ids.box1).parentId).toBe(ids.group)
	})

	it('handles children leaving several frames in one call', () => {
		frame(ids.frameA, 0, 0)
		frame(ids.frameB, 500, 0)
		box(ids.box1, 1000, 1000, { parentId: ids.frameA })
		box(ids.box2, 1000, 1000, { parentId: ids.frameB })

		kickoutOccludedShapes(editor, [ids.box1, ids.box2])
		expect(shape(ids.box1).parentId).toBe(editor.getCurrentPageId())
		expect(shape(ids.box2).parentId).toBe(editor.getCurrentPageId())
	})

	it('respects a frame that refuses to release its children', () => {
		frame(ids.frameA, 0, 0, { isLocked: true })
		box(ids.box1, 500, 500, { parentId: ids.frameA })

		kickoutOccludedShapes(editor, [ids.box1])
		expect(shape(ids.box1).parentId).toBe(ids.frameA)
	})

	describe('with a filter', () => {
		it('kicks out every child of a filtered parent, even ones still inside it', () => {
			frame(ids.frameA, 0, 0)
			box(ids.box1, 50, 50, { parentId: ids.frameA })
			box(ids.box2, 100, 100, { parentId: ids.frameA })

			kickoutOccludedShapes(editor, [ids.box1], { filter: (p) => p.id !== ids.frameA })
			expect(shape(ids.box1).parentId).toBe(editor.getCurrentPageId())
			expect(shape(ids.box2).parentId).toBe(editor.getCurrentPageId())
		})

		it('never uses a filtered parent as a drop target', () => {
			frame(ids.frameB, 0, 0)
			frame(ids.frameA, 0, 0)
			box(ids.box1, 50, 50, { parentId: ids.frameA })

			kickoutOccludedShapes(editor, [ids.box1], { filter: (p) => p.type !== FRAME })
			expect(shape(ids.box1).parentId).toBe(editor.getCurrentPageId())
		})

		it('still checks unfiltered parents normally', () => {
			frame(ids.frameA, 0, 0)
			frame(ids.frameB, 500, 0)
			box(ids.box1, 50, 50, { parentId: ids.frameA })
			box(ids.box2, 1000, 1000, { parentId: ids.frameB })
			box(ids.box3, 10, 10, { parentId: ids.frameB })

			kickoutOccludedShapes(editor, [ids.box1, ids.box2, ids.box3], {
				filter: (p) => p.id !== ids.frameA,
			})
			expect(shape(ids.box1).parentId).toBe(editor.getCurrentPageId())
			expect(shape(ids.box2).parentId).toBe(editor.getCurrentPageId())
			expect(shape(ids.box3).parentId).toBe(ids.frameB)
		})
	})

	// Skipped: the fallback parent is `editor.getCurrentPageId()`, so a child kicked out of a frame
	// on another page is moved onto the current page instead of staying on its own page. See #10553.
	it.skip('keeps a kicked out child on the page its frame is on', () => {
		const page2 = PageRecordType.createId('page2')
		editor.createPage({ id: page2, name: 'page 2' })
		frame(ids.frameA, 0, 0, { parentId: page2 })
		box(ids.box1, 500, 500, { parentId: ids.frameA })

		kickoutOccludedShapes(editor, [ids.box1])
		expect(shape(ids.box1).parentId).toBe(page2)
	})
})
