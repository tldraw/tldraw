import {
	commentSchemaRecords,
	createCommentThread,
	createShapeId,
	createTLSchema,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTools,
	Editor,
	toRichText,
	createComment as tlCreateComment,
	TLPageId,
	TLShapeId,
} from 'tldraw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { registerCommentAnchorLifecycle } from './anchor-lifecycle'
import { getCommentRecord, getComments, putCommentRecords } from './comment-store'
import { commitCommentMutation } from './state'

/**
 * These tests need a real editor: the behavior under test is the interplay between store
 * side effects (beforeDelete capture, operation-complete settlement) and real editor
 * operations like `deleteShapes` and `moveShapesToPage` — exactly what a stub can't model.
 */

let editor: Editor
let dispose: () => void

beforeEach(() => {
	editor = new Editor({
		store: createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: defaultTools,
		getContainer: () => document.body,
	})
	dispose = registerCommentAnchorLifecycle(editor)
})

afterEach(() => {
	dispose()
	editor.dispose()
})

function makeShape(x = 100, y = 100, w = 100, h = 50): TLShapeId {
	const id = createShapeId()
	editor.createShape({ id, type: 'geo', x, y, props: { w, h } })
	return id
}

function makeThread(shapeId: TLShapeId, anchorX = 0.5, anchorY = 0.5, isPrecise = true) {
	const thread = createCommentThread({
		pageId: editor.getCurrentPageId(),
		anchor: { type: 'shape', shapeId, x: anchorX, y: anchorY, isPrecise },
		createdBy: 'me',
	})
	const comment = tlCreateComment({
		threadId: thread.id,
		pageId: thread.pageId,
		authorId: 'me',
		body: toRichText('hello'),
	})
	putCommentRecords(editor, [thread, comment])
	return { thread, comment }
}

function makeSecondPage(): TLPageId {
	editor.createPage({ name: 'page 2' })
	return editor.getPages()[1].id
}

describe('shape deletion', () => {
	it('converts a precise shape anchor to a point anchor where the pin sat', () => {
		const shapeId = makeShape(100, 100, 100, 50)
		const { thread } = makeThread(shapeId, 0.5, 0.5, true)

		editor.deleteShape(shapeId)

		const updated = getCommentRecord(editor, thread.id)!
		expect(updated.typeName).toBe('comment-thread')
		expect((updated as typeof thread).anchor).toEqual({ type: 'point', x: 150, y: 125 })
	})

	it('converts an imprecise shape anchor at the imprecise pin spot (top-right by default)', () => {
		const shapeId = makeShape(100, 100, 100, 50)
		const { thread } = makeThread(shapeId, 0.2, 0.9, false)

		editor.deleteShape(shapeId)

		const updated = getCommentRecord(editor, thread.id) as typeof thread
		expect(updated.anchor).toEqual({ type: 'point', x: 200, y: 100 })
	})

	it('converts anchors on children when their frame is deleted with them', () => {
		const frameId = createShapeId()
		editor.createShape({ id: frameId, type: 'frame', x: 0, y: 0, props: { w: 400, h: 400 } })
		const childId = createShapeId()
		editor.createShape({
			id: childId,
			type: 'geo',
			parentId: frameId,
			x: 50,
			y: 50,
			props: { w: 100, h: 100 },
		})
		const { thread } = makeThread(childId, 0.5, 0.5, true)

		editor.deleteShape(frameId)

		const updated = getCommentRecord(editor, thread.id) as typeof thread
		expect(updated.anchor).toEqual({ type: 'point', x: 100, y: 100 })
	})

	it('re-attaches the thread when the delete is undone', () => {
		const shapeId = makeShape(100, 100, 100, 50)
		const { thread } = makeThread(shapeId, 0.5, 0.5, true)
		editor.markHistoryStoppingPoint()

		editor.deleteShape(shapeId)
		expect((getCommentRecord(editor, thread.id) as typeof thread).anchor.type).toBe('point')

		editor.undo()

		const updated = getCommentRecord(editor, thread.id) as typeof thread
		expect(updated.anchor).toEqual(thread.anchor)
	})

	it('keeps the restore when a returning shape cannot resolve its page yet', () => {
		const frameId = createShapeId()
		editor.createShape({ id: frameId, type: 'frame', x: 0, y: 0, props: { w: 400, h: 400 } })
		const childId = createShapeId()
		editor.createShape({
			id: childId,
			type: 'geo',
			parentId: frameId,
			x: 50,
			y: 50,
			props: { w: 100, h: 100 },
		})
		const { thread } = makeThread(childId, 0.5, 0.5, true)
		const childRecord = editor.getShape(childId)!
		const frameRecord = editor.getShape(frameId)!

		editor.deleteShape(frameId)
		expect((getCommentRecord(editor, thread.id) as typeof thread).anchor.type).toBe('point')

		// The child returns in an earlier operation than its parent, so its ancestor page can't
		// resolve when it first reappears.
		editor.store.put([childRecord])
		editor.store.put([frameRecord])

		const updated = getCommentRecord(editor, thread.id) as typeof thread
		expect(updated.anchor).toEqual(thread.anchor)
	})

	it('re-attaches on undo even when the lifecycle was re-registered in between', () => {
		const shapeId = makeShape(100, 100, 100, 50)
		const { thread } = makeThread(shapeId, 0.5, 0.5, true)
		editor.markHistoryStoppingPoint()

		editor.deleteShape(shapeId)
		expect((getCommentRecord(editor, thread.id) as typeof thread).anchor.type).toBe('point')

		// The registering effect re-runs whenever its inputs change identity; conversion memory
		// must not live and die with any one registration.
		dispose()
		dispose = registerCommentAnchorLifecycle(editor)

		editor.undo()

		const updated = getCommentRecord(editor, thread.id) as typeof thread
		expect(updated.anchor).toEqual(thread.anchor)
	})

	it('does not re-attach on undo when the pin was moved after the conversion', () => {
		const shapeId = makeShape(100, 100, 100, 50)
		const { thread } = makeThread(shapeId, 0.5, 0.5, true)
		editor.markHistoryStoppingPoint()

		editor.deleteShape(shapeId)
		const converted = getCommentRecord(editor, thread.id) as typeof thread
		commitCommentMutation(editor, () =>
			putCommentRecords(editor, [{ ...converted, anchor: { type: 'point', x: 900, y: 900 } }])
		)

		editor.undo()

		const updated = getCommentRecord(editor, thread.id) as typeof thread
		expect(updated.anchor).toEqual({ type: 'point', x: 900, y: 900 })
	})

	it('leaves threads on other shapes untouched', () => {
		const shapeId = makeShape()
		const otherId = makeShape(300, 300)
		const { thread } = makeThread(otherId)

		editor.deleteShape(shapeId)

		const updated = getCommentRecord(editor, thread.id) as typeof thread
		expect(updated.anchor.type).toBe('shape')
	})
})

describe('moving a shape to another page', () => {
	it('re-homes the thread and its comments to the new page, keeping the shape anchor', () => {
		const shapeId = makeShape()
		const { thread, comment } = makeThread(shapeId)
		const page2 = makeSecondPage()

		editor.moveShapesToPage([shapeId], page2)

		const updatedThread = getCommentRecord(editor, thread.id) as typeof thread
		expect(updatedThread.pageId).toBe(page2)
		expect(updatedThread.anchor).toEqual(thread.anchor)
		const updatedComment = getComments(editor).find((c) => c.id === comment.id)!
		expect(updatedComment.pageId).toBe(page2)
	})

	it('re-homes threads anchored to children of a moved frame', () => {
		const frameId = createShapeId()
		editor.createShape({ id: frameId, type: 'frame', x: 0, y: 0, props: { w: 400, h: 400 } })
		const childId = createShapeId()
		editor.createShape({
			id: childId,
			type: 'geo',
			parentId: frameId,
			x: 50,
			y: 50,
			props: { w: 100, h: 100 },
		})
		const { thread } = makeThread(childId)
		const page2 = makeSecondPage()

		editor.moveShapesToPage([frameId], page2)

		const updatedThread = getCommentRecord(editor, thread.id) as typeof thread
		expect(updatedThread.pageId).toBe(page2)
		expect(updatedThread.anchor.type).toBe('shape')
	})

	it('re-homes the thread back when the move is undone', () => {
		const shapeId = makeShape()
		const { thread } = makeThread(shapeId)
		const page1 = editor.getCurrentPageId()
		const page2 = makeSecondPage()
		editor.markHistoryStoppingPoint()

		editor.moveShapesToPage([shapeId], page2)
		expect((getCommentRecord(editor, thread.id) as typeof thread).pageId).toBe(page2)

		editor.undo()

		const updatedThread = getCommentRecord(editor, thread.id) as typeof thread
		expect(updatedThread.pageId).toBe(page1)
		expect(updatedThread.anchor.type).toBe('shape')
	})
})
