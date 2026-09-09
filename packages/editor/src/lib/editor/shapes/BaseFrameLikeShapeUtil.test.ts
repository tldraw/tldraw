import { RecordProps, TLShape, TLShapeId, createShapeId } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { vi } from 'vitest'
import { TestEditor } from '../../test/TestEditor'
import { TEST_BOX_TYPE as BOX_TYPE, TEST_FRAME_TYPE as FRAME_TYPE } from '../../test/testShapeTypes'
import { BaseBoxShapeUtil } from './BaseBoxShapeUtil'
import { BaseFrameLikeShapeUtil } from './BaseFrameLikeShapeUtil'

type IFrameShape = TLShape<typeof FRAME_TYPE>
type IBoxShape = TLShape<typeof BOX_TYPE>

class TestFrameShapeUtil extends BaseFrameLikeShapeUtil<IFrameShape> {
	static override type = FRAME_TYPE
	static override props: RecordProps<IFrameShape> = { w: T.number, h: T.number }
	getDefaultProps(): IFrameShape['props'] {
		return { w: 200, h: 100 }
	}
	getIndicatorPath() {
		return undefined
	}
	component() {
		return null
	}
}

class TestBoxShapeUtil extends BaseBoxShapeUtil<IBoxShape> {
	static override type = BOX_TYPE
	static override props: RecordProps<IBoxShape> = { w: T.number, h: T.number }
	getDefaultProps(): IBoxShape['props'] {
		return { w: 10, h: 10 }
	}
	getIndicatorPath() {
		return undefined
	}
	component() {
		return null
	}
}

let editor: TestEditor
let util: TestFrameShapeUtil
const frameId = createShapeId('frame')
const boxAId = createShapeId('boxA')
const boxBId = createShapeId('boxB')

function getFrame() {
	return editor.getShape<IFrameShape>(frameId)!
}

function getShapes(...ids: TLShapeId[]) {
	return ids.map((id) => editor.getShape(id)!)
}

function dragInfo(shapes: TLShape[]) {
	return {
		initialDraggingOverShapeId: null,
		prevDraggingOverShapeId: null,
		nextDraggingOverShapeId: null,
		initialParentIds: new Map(shapes.map((s) => [s.id, s.parentId])),
		initialIndices: new Map(shapes.map((s) => [s.id, s.index])),
	}
}

beforeEach(() => {
	editor = new TestEditor({ shapeUtils: [TestFrameShapeUtil, TestBoxShapeUtil] })
	util = editor.getShapeUtil(FRAME_TYPE) as TestFrameShapeUtil
	editor.createShapes([
		{ id: frameId, type: FRAME_TYPE, x: 100, y: 100 },
		{ id: boxAId, type: BOX_TYPE, x: 500, y: 500 },
		{ id: boxBId, type: BOX_TYPE, x: 600, y: 600 },
	])
})

afterEach(() => {
	editor.dispose()
})

describe('BaseFrameLikeShapeUtil', () => {
	it('is frame-like and provides a background for its children', () => {
		expect(util.isFrameLike(getFrame())).toBe(true)
		expect(util.providesBackgroundForChildren()).toBe(true)
	})

	it('accepts and releases children of any type unless locked', () => {
		const frame = getFrame()
		expect(util.canReceiveNewChildrenOfType(frame, BOX_TYPE)).toBe(true)
		expect(util.canRemoveChildrenOfType(frame, BOX_TYPE)).toBe(true)

		const locked = { ...frame, isLocked: true }
		expect(util.canReceiveNewChildrenOfType(locked, BOX_TYPE)).toBe(false)
		expect(util.canRemoveChildrenOfType(locked, BOX_TYPE)).toBe(false)
	})

	it('clips children to the frame geometry vertices', () => {
		expect(util.getClipPath(getFrame())!.map((v) => ({ x: v.x, y: v.y }))).toEqual([
			{ x: 0, y: 0 },
			{ x: 200, y: 0 },
			{ x: 200, y: 100 },
			{ x: 0, y: 100 },
		])
	})

	it('clips every child type except arrows', () => {
		expect(util.shouldClipChild(editor.getShape(boxAId)!)).toBe(true)
		expect(util.shouldClipChild({ type: 'arrow' } as TLShape)).toBe(false)
	})

	describe('onDragShapesIn', () => {
		it('reparents the dragged shapes into the frame, preserving page position', () => {
			const shapes = getShapes(boxAId, boxBId)
			util.onDragShapesIn(getFrame(), shapes, dragInfo(shapes))

			expect(editor.getSortedChildIdsForParent(frameId)).toEqual([boxAId, boxBId])
			expect(editor.getShape(boxAId)).toMatchObject({ parentId: frameId, x: 400, y: 400 })
			expect(editor.getShapePageBounds(boxBId)!.toJson()).toEqual({ x: 600, y: 600, w: 10, h: 10 })
		})

		it('does nothing when every dragged shape is already a child', () => {
			editor.reparentShapes([boxAId, boxBId], frameId)
			const before = getShapes(boxAId, boxBId)
			const spy = vi.spyOn(editor, 'reparentShapes')
			try {
				util.onDragShapesIn(getFrame(), before, dragInfo(before))
				expect(spy).not.toHaveBeenCalled()
				expect(getShapes(boxAId, boxBId)).toEqual(before)
			} finally {
				spy.mockRestore()
			}
		})

		it('restores the original child index of a shape dragged back in', () => {
			editor.reparentShapes([boxAId, boxBId], frameId)
			const initial = getShapes(boxAId, boxBId)
			const info = dragInfo(initial)

			editor.reparentShapes([boxAId], editor.getCurrentPageId())
			expect(editor.getShape(boxAId)!.parentId).toBe(editor.getCurrentPageId())

			util.onDragShapesIn(getFrame(), getShapes(boxAId), info)

			expect(editor.getShape(boxAId)).toMatchObject({ parentId: frameId, index: initial[0].index })
			expect(editor.getSortedChildIdsForParent(frameId)).toEqual([boxAId, boxBId])
		})

		it('does not restore an index that another child has taken in the meantime', () => {
			editor.reparentShapes([boxAId], frameId)
			const initial = getShapes(boxAId)
			const info = dragInfo(initial)
			const originalIndex = initial[0].index

			editor.reparentShapes([boxAId], editor.getCurrentPageId())
			editor.reparentShapes([boxBId], frameId)
			editor.updateShape({ id: boxBId, type: BOX_TYPE, index: originalIndex })

			util.onDragShapesIn(getFrame(), getShapes(boxAId), info)

			expect(editor.getShape(boxAId)!.parentId).toBe(frameId)
			expect(editor.getShape(boxAId)!.index).not.toBe(originalIndex)
			expect(editor.getSortedChildIdsForParent(frameId)).toEqual([boxBId, boxAId])
		})

		it('refuses to reparent an ancestor of the frame into it', () => {
			const outerId = createShapeId('outer')
			editor.createShape({ id: outerId, type: FRAME_TYPE, x: 0, y: 0, props: { w: 1000, h: 1000 } })
			editor.reparentShapes([frameId], outerId)

			const outer = getShapes(outerId)
			util.onDragShapesIn(getFrame(), outer, dragInfo(outer))

			expect(editor.getShape(outerId)!.parentId).toBe(editor.getCurrentPageId())
			expect(editor.getShape(frameId)!.parentId).toBe(outerId)
		})
	})

	describe('onDragShapesOut', () => {
		it('reparents its own children to the page when nothing else is being dragged over', () => {
			editor.reparentShapes([boxAId, boxBId], frameId)
			const shapes = getShapes(boxAId, boxBId)

			util.onDragShapesOut(getFrame(), shapes, dragInfo(shapes))

			const pageId = editor.getCurrentPageId()
			expect(editor.getShape(boxAId)).toMatchObject({ parentId: pageId, x: 500, y: 500 })
			expect(editor.getShape(boxBId)).toMatchObject({ parentId: pageId, x: 600, y: 600 })
			expect(editor.getSortedChildIdsForParent(frameId)).toEqual([])
		})

		it('leaves shapes that belong to another parent alone', () => {
			editor.reparentShapes([boxAId], frameId)
			const otherId = createShapeId('other')
			editor.createShape({ id: otherId, type: FRAME_TYPE, x: 1000, y: 1000 })
			editor.reparentShapes([boxBId], otherId)

			const shapes = getShapes(boxAId, boxBId)
			util.onDragShapesOut(getFrame(), shapes, dragInfo(shapes))

			expect(editor.getShape(boxAId)!.parentId).toBe(editor.getCurrentPageId())
			expect(editor.getShape(boxBId)!.parentId).toBe(otherId)
		})

		it('does nothing when the shapes are being dragged over another shape', () => {
			editor.reparentShapes([boxAId, boxBId], frameId)
			const shapes = getShapes(boxAId, boxBId)

			util.onDragShapesOut(getFrame(), shapes, {
				...dragInfo(shapes),
				nextDraggingOverShapeId: createShapeId('next'),
			})

			expect(editor.getSortedChildIdsForParent(frameId)).toEqual([boxAId, boxBId])
		})
	})
})
