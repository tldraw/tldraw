import { createShapeId, PageRecordType, TLParentId, TLShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

const pageId = PageRecordType.createId('p2')
const frameId = createShapeId('frame')
const shapeId = createShapeId('shape')

function getOrphanIds() {
	return editor.store
		.allRecords()
		.filter((r) => r.typeName === 'shape' && !editor.store.has(r.parentId))
		.map((r) => r.id)
}

function createAsPeer(id: TLShapeId, parentId: TLParentId) {
	editor.store.mergeRemoteChanges(() => {
		editor.createShape({ id, type: 'geo', parentId })
	})
}

function removeAsPeer(id: TLParentId) {
	editor.store.mergeRemoteChanges(() => editor.store.remove([id]))
}

function createFrame() {
	editor.createShape({ id: frameId, type: 'frame', props: { w: 400, h: 400 } })
}

describe('removing a parent removes its children', () => {
	it('undoing a page create removes a shape a peer added to it', () => {
		editor.markHistoryStoppingPoint()
		editor.createPage({ id: pageId, name: 'p2' })
		createAsPeer(shapeId, pageId)
		editor.undo()
		expect(editor.store.has(shapeId)).toBe(false)
		editor.redo()
		expect(editor.store.has(pageId)).toBe(true)
		expect(getOrphanIds()).toEqual([])
	})

	it.each([
		['a frame create', createFrame],
		[
			'grouping',
			() => {
				const ids = [createShapeId('a'), createShapeId('b')]
				editor.createShapes(ids.map((id, i) => ({ id, type: 'geo', x: i * 200 })))
				editor.markHistoryStoppingPoint()
				editor.groupShapes(ids, { groupId: frameId })
			},
		],
	])('undoing %s removes a shape a peer added inside', (_, makeParent) => {
		editor.markHistoryStoppingPoint()
		makeParent()
		createAsPeer(shapeId, frameId)
		editor.undo()
		expect(editor.store.has(shapeId)).toBe(false)
		expect(getOrphanIds()).toEqual([])
	})

	it('redoing a page delete removes a shape a peer added after the undo', () => {
		editor.createPage({ id: pageId, name: 'p2' })
		editor.markHistoryStoppingPoint()
		editor.deletePage(pageId)
		editor.undo()
		createAsPeer(shapeId, pageId)
		editor.redo()
		expect(editor.store.has(shapeId)).toBe(false)
	})

	it('store.remove takes a page with nested frames and locked children', () => {
		editor.createPage({ id: pageId, name: 'p2' })
		const innerId = createShapeId('inner')
		editor.createShape({ id: frameId, type: 'frame', parentId: pageId, props: { w: 400, h: 400 } })
		editor.createShape({ id: innerId, type: 'frame', parentId: frameId, props: { w: 200, h: 200 } })
		editor.createShape({ id: shapeId, type: 'geo', parentId: innerId, isLocked: true })
		editor.store.remove([pageId])
		expect(editor.store.allRecords().filter((r) => r.typeName === 'shape')).toEqual([])
	})

	it('keeps the children when a handler refuses the delete', () => {
		editor.sideEffects.registerBeforeDeleteHandler('shape', (shape) =>
			shape.type === 'frame' ? false : undefined
		)
		createFrame()
		editor.createShape({ id: shapeId, type: 'geo', parentId: frameId })
		editor.store.remove([frameId])
		expect(editor.getShape(shapeId)?.parentId).toBe(frameId)
	})

	it("does not cascade a peer's page delete", () => {
		editor.createPage({ id: pageId, name: 'p2' })
		editor.createShape({ id: shapeId, type: 'geo', parentId: pageId })
		removeAsPeer(pageId)
		expect(editor.store.has(shapeId)).toBe(true)
	})

	it("leaves a peer's orphan alone when its change runs more side effects", () => {
		editor.createPage({ id: pageId, name: 'p2' })
		editor.createShape({ id: shapeId, type: 'geo', parentId: pageId })
		// adding a page runs a second round of side effects
		editor.store.mergeRemoteChanges(() => {
			editor.store.remove([pageId])
			editor.store.put([
				PageRecordType.create({
					id: PageRecordType.createId('p3'),
					name: 'p3',
					index: 'a9' as any,
				}),
			])
		})
		expect(editor.store.has(shapeId)).toBe(true)
	})
})

describe('replaying history into a deleted parent', () => {
	it('drops a shape restored by undoing its delete after a peer deleted its page', () => {
		editor.createPage({ id: pageId, name: 'p2' })
		editor.createShape({ id: shapeId, type: 'geo', parentId: pageId })
		editor.markHistoryStoppingPoint()
		editor.deleteShapes([shapeId])
		removeAsPeer(pageId)
		editor.undo()
		expect(editor.store.has(shapeId)).toBe(false)
	})

	it('drops a shape restored by redoing its create after a peer deleted its frame', () => {
		createFrame()
		editor.markHistoryStoppingPoint()
		editor.createShape({ id: shapeId, type: 'geo', parentId: frameId })
		editor.undo()
		removeAsPeer(frameId)
		editor.redo()
		expect(editor.store.has(shapeId)).toBe(false)
	})

	it('keeps a shape where it is when undo would move it back into a deleted frame', () => {
		createFrame()
		editor.createShape({ id: shapeId, type: 'geo', parentId: frameId, x: 10, y: 20 })
		editor.markHistoryStoppingPoint()
		editor.reparentShapes([shapeId], editor.getCurrentPageId())
		const moved = editor.getShape(shapeId)!
		removeAsPeer(frameId)
		editor.undo()
		expect(editor.getShape(shapeId)).toEqual(moved)
	})

	it('keeps a shape on its new page when undo would move it back to a deleted page', () => {
		const originalPageId = editor.getCurrentPageId()
		editor.createPage({ id: pageId, name: 'p2' })
		editor.createShape({ id: shapeId, type: 'geo' })
		editor.markHistoryStoppingPoint()
		editor.moveShapesToPage([shapeId], pageId)
		removeAsPeer(originalPageId)
		editor.undo()
		expect(editor.getShape(shapeId)?.parentId).toBe(pageId)
	})

	it('still restores a shape whose parent exists', () => {
		createFrame()
		editor.createShape({ id: shapeId, type: 'geo', parentId: frameId })
		editor.markHistoryStoppingPoint()
		editor.reparentShapes([shapeId], editor.getCurrentPageId())
		editor.undo()
		expect(editor.getShape(shapeId)?.parentId).toBe(frameId)
	})
})
