import { Editor, TLGeoShape, createShapeId } from '@tldraw/editor'
import { afterEach, describe, expect, it } from 'vitest'
import { createHeadlessEditor } from '../lib/createHeadlessEditor'

const editors: Editor[] = []
function makeEditor(...args: Parameters<typeof createHeadlessEditor>) {
	const editor = createHeadlessEditor({ frameLoop: 'manual', ...args[0] })
	editors.push(editor)
	return editor
}

afterEach(() => {
	for (const editor of editors.splice(0)) editor.dispose()
})

function makeBox(editor: Editor, x = 0, y = 0) {
	const id = createShapeId()
	editor.createShape<TLGeoShape>({ id, type: 'geo', x, y, props: { w: 100, h: 100 } })
	return id
}

describe('undo and redo', () => {
	it('a fresh editor has nothing to undo or redo', () => {
		const editor = makeEditor()
		expect(editor.getCanUndo()).toBe(false)
		expect(editor.getCanRedo()).toBe(false)
	})

	it('undoes and redoes a create', () => {
		const editor = makeEditor()
		editor.markHistoryStoppingPoint()
		const id = makeBox(editor)

		editor.undo()
		expect(editor.getShape(id)).toBeUndefined()
		editor.redo()
		expect(editor.getShape(id)).toBeDefined()
	})

	it('undoes and redoes an update', () => {
		const editor = makeEditor()
		const id = makeBox(editor, 100, 100)
		editor.markHistoryStoppingPoint()
		editor.updateShape({ id, type: 'geo', x: 500 })

		editor.undo()
		expect(editor.getShape(id)!.x).toBe(100)
		editor.redo()
		expect(editor.getShape(id)!.x).toBe(500)
	})

	it('undoing a delete restores the shape and its bindings', () => {
		const editor = makeEditor()
		const a = makeBox(editor, 0, 0)
		const b = makeBox(editor, 300, 0)
		const arrow = createShapeId()
		editor.createShape({ id: arrow, type: 'arrow', x: 0, y: 0 })
		editor.createBindings([
			{ type: 'arrow', fromId: arrow, toId: a, props: { terminal: 'start' } },
			{ type: 'arrow', fromId: arrow, toId: b, props: { terminal: 'end' } },
		])
		editor.markHistoryStoppingPoint()

		editor.deleteShape(b)
		expect(editor.getBindingsFromShape(arrow, 'arrow')).toHaveLength(1)

		// the side-effect binding cleanup was recorded in the same diff as the delete, so one
		// undo brings back shape and binding together
		editor.undo()
		expect(editor.getShape(b)).toBeDefined()
		expect(editor.getBindingsFromShape(arrow, 'arrow')).toHaveLength(2)
	})

	it('squashes all edits since the last mark into a single undo', () => {
		const editor = makeEditor()
		const id = makeBox(editor, 100, 100)
		editor.markHistoryStoppingPoint()

		editor.updateShape({ id, type: 'geo', x: 200 })
		editor.updateShape({ id, type: 'geo', x: 300 })
		editor.updateShape({ id, type: 'geo', x: 400 })

		// undo granularity is delimited by marks, not by calls: one undo reverts all three
		// updates back to the mark
		editor.undo()
		expect(editor.getShape(id)!.x).toBe(100)
		// the creation before the mark is still on the stack, so a second undo removes the shape
		expect(editor.getCanUndo()).toBe(true)

		// redo reapplies the whole squashed batch
		editor.redo()
		expect(editor.getShape(id)!.x).toBe(400)
	})

	it('without any mark, a single undo reverts everything back to editor creation', () => {
		const editor = makeEditor()
		const a = makeBox(editor)
		const b = makeBox(editor)
		editor.updateShape({ id: a, type: 'geo', x: 999 })

		editor.undo()
		expect(editor.getShape(a)).toBeUndefined()
		expect(editor.getShape(b)).toBeUndefined()
	})

	it('marks separate edits into distinct undo steps', () => {
		const editor = makeEditor()
		editor.markHistoryStoppingPoint()
		const a = makeBox(editor)
		editor.markHistoryStoppingPoint()
		const b = makeBox(editor)

		editor.undo()
		expect(editor.getShape(a)).toBeDefined()
		expect(editor.getShape(b)).toBeUndefined()
		editor.undo()
		expect(editor.getShape(a)).toBeUndefined()
	})

	it('editor.run batches nested operations into the pending diff as one undo', () => {
		const editor = makeEditor()
		editor.markHistoryStoppingPoint()
		let a!: ReturnType<typeof makeBox>
		let b!: ReturnType<typeof makeBox>
		editor.run(() => {
			a = makeBox(editor)
			b = makeBox(editor, 300, 0)
			editor.updateShape({ id: a, type: 'geo', x: 50 })
		})

		editor.undo()
		expect(editor.getShape(a)).toBeUndefined()
		expect(editor.getShape(b)).toBeUndefined()
	})

	it('clears the redo stack when a new edit lands after an undo', () => {
		const editor = makeEditor()
		const id = makeBox(editor, 100, 0)
		editor.markHistoryStoppingPoint()
		editor.updateShape({ id, type: 'geo', x: 200 })

		editor.undo()
		expect(editor.getCanRedo()).toBe(true)

		editor.updateShape({ id, type: 'geo', x: 300 })
		expect(editor.getCanRedo()).toBe(false)
		editor.redo()
		expect(editor.getShape(id)!.x).toBe(300)
	})
})

describe('marks, bail, and squash', () => {
	it('bailToMark reverts to the mark without leaving anything to redo', () => {
		const editor = makeEditor()
		const id = makeBox(editor, 100, 0)
		const mark = editor.markHistoryStoppingPoint()
		editor.updateShape({ id, type: 'geo', x: 200 })
		editor.markHistoryStoppingPoint()
		editor.updateShape({ id, type: 'geo', x: 300 })

		// bailing to the outer mark skips over the inner mark and reverts both edits
		editor.bailToMark(mark)
		expect(editor.getShape(id)!.x).toBe(100)
		expect(editor.getCanRedo()).toBe(false)
	})

	it('bails to a nested inner mark first, then the outer one', () => {
		const editor = makeEditor()
		const id = makeBox(editor, 100, 0)
		const outer = editor.markHistoryStoppingPoint()
		editor.updateShape({ id, type: 'geo', x: 200 })
		const inner = editor.markHistoryStoppingPoint()
		editor.updateShape({ id, type: 'geo', x: 300 })

		editor.bailToMark(inner)
		expect(editor.getShape(id)!.x).toBe(200)
		editor.bailToMark(outer)
		expect(editor.getShape(id)!.x).toBe(100)
	})

	it('bailToMark with an unknown mark id is a no-op', () => {
		const editor = makeEditor()
		const id = makeBox(editor, 100, 0)
		editor.markHistoryStoppingPoint()
		editor.updateShape({ id, type: 'geo', x: 200 })

		editor.bailToMark('missing-mark')
		expect(editor.getShape(id)!.x).toBe(200)
	})

	it('squashToMark collapses the steps since the mark into one undo entry', () => {
		const editor = makeEditor()
		const id = makeBox(editor, 100, 0)
		editor.markHistoryStoppingPoint()
		const mark = editor.markHistoryStoppingPoint()
		editor.updateShape({ id, type: 'geo', x: 200 })
		editor.markHistoryStoppingPoint()
		editor.updateShape({ id, type: 'geo', x: 300 })

		editor.squashToMark(mark)
		editor.undo()
		expect(editor.getShape(id)!.x).toBe(100)
	})
})

describe('history modes', () => {
	it("run with history: 'ignore' makes a persistent change that undo skips", () => {
		const editor = makeEditor()
		const id = makeBox(editor, 100, 0)
		editor.markHistoryStoppingPoint()

		editor.run(() => editor.updateShape({ id, type: 'geo', x: 999 }), { history: 'ignore' })

		expect(editor.getShape(id)!.x).toBe(999)
		// nothing was recorded since the mark, so undo reaches past it to the creation —
		// and the ignored change survives because it never entered the undo stack
		editor.undo()
		expect(editor.getShape(id)).toBeUndefined()
		editor.redo()
		// redo restores the created shape at its recorded position; the ignored x change is
		// lost because it exists in no diff
		expect(editor.getShape(id)!.x).toBe(100)
	})

	it("run with history: 'record-preserveRedoStack' keeps redos alive", () => {
		const editor = makeEditor()
		const id = makeBox(editor, 100, 0)
		editor.markHistoryStoppingPoint()
		editor.updateShape({ id, type: 'geo', x: 200 })
		editor.undo()
		expect(editor.getCanRedo()).toBe(true)

		editor.run(() => editor.updateShape({ id, type: 'geo', y: 50 }), {
			history: 'record-preserveRedoStack',
		})

		// a normal recorded edit would have cleared the redo stack here
		expect(editor.getCanRedo()).toBe(true)
		expect(editor.getShape(id)).toMatchObject({ x: 100, y: 50 })
		editor.redo()
		// Known limitation, pinned deliberately: history diffs store whole record snapshots,
		// so redoing the x change also rolls the same record's y back to its value at the
		// time the redone edit was made — the preserved-redo-stack edit to an overlapping
		// record is lost on redo. Fixing this means property-level diffs or rebase-on-redo
		// in the history manager; too invasive to bundle here. If this assertion starts
		// failing, the limitation was fixed — update this pin, don't restore the old values.
		expect(editor.getShape(id)).toMatchObject({ x: 200, y: 0 })
	})

	it("an inner history: 'ignore' run inside a recorded run keeps its changes out of the undo", () => {
		const editor = makeEditor()
		const a = makeBox(editor, 100, 0)
		const b = makeBox(editor, 300, 0)
		editor.markHistoryStoppingPoint()

		editor.run(() => {
			editor.updateShape({ id: a, type: 'geo', x: 200 })
			editor.run(() => editor.updateShape({ id: b, type: 'geo', x: 999 }), { history: 'ignore' })
		})

		expect(editor.getShape(a)!.x).toBe(200)
		expect(editor.getShape(b)!.x).toBe(999)

		// undo reverts only the recorded outer change; the inner ignored change survives
		editor.undo()
		expect(editor.getShape(a)!.x).toBe(100)
		expect(editor.getShape(b)!.x).toBe(999)
	})

	it("an inner history: 'record' run cannot re-enable recording inside an ignore run", () => {
		const editor = makeEditor()
		const a = makeBox(editor, 100, 0)
		const b = makeBox(editor, 300, 0)
		editor.markHistoryStoppingPoint()

		editor.run(
			() => {
				editor.updateShape({ id: a, type: 'geo', x: 200 })
				editor.run(() => editor.updateShape({ id: b, type: 'geo', x: 999 }), {
					history: 'record',
				})
			},
			{ history: 'ignore' }
		)

		expect(editor.getShape(a)!.x).toBe(200)
		expect(editor.getShape(b)!.x).toBe(999)

		// once a run has paused history, nested runs stay paused: neither update was recorded,
		// so undo reaches past the mark and removes the shapes entirely
		editor.undo()
		expect(editor.getShape(a)).toBeUndefined()
		expect(editor.getShape(b)).toBeUndefined()
	})

	it('run with ignoreShapeLock mutates a locked shape that a plain update skips', () => {
		const editor = makeEditor()
		const id = makeBox(editor, 100, 0)
		editor.toggleLock([id])

		editor.updateShape({ id, type: 'geo', x: 500 })
		// plain updates on a locked shape are silently dropped
		expect(editor.getShape(id)!.x).toBe(100)

		editor.run(() => editor.updateShape({ id, type: 'geo', x: 500 }), { ignoreShapeLock: true })
		expect(editor.getShape(id)!.x).toBe(500)
	})
})

describe('grouping round trips', () => {
	it('group and ungroup round-trip through undo and redo with a stable group id', () => {
		const editor = makeEditor()
		const a = makeBox(editor, 0, 0)
		const b = makeBox(editor, 300, 0)
		const pageId = editor.getCurrentPageId()
		editor.markHistoryStoppingPoint()

		const groupId = createShapeId()
		editor.groupShapes([a, b], { groupId })
		expect(editor.getShape(a)!.parentId).toBe(groupId)

		// one undo deletes the group and restores both children to the page
		editor.undo()
		expect(editor.getShape(groupId)).toBeUndefined()
		expect(editor.getShape(a)!.parentId).toBe(pageId)
		expect(editor.getShape(b)!.parentId).toBe(pageId)

		// redo replays the recorded diff, so the group comes back under the same id
		editor.redo()
		expect(editor.getShape(groupId)!.type).toBe('group')
		expect(editor.getShape(a)!.parentId).toBe(groupId)

		editor.markHistoryStoppingPoint()
		editor.ungroupShapes([groupId])
		expect(editor.getShape(groupId)).toBeUndefined()
		expect(editor.getShape(a)!.parentId).toBe(pageId)

		// undoing the ungroup restores the group and the children's membership
		editor.undo()
		expect(editor.getShape(groupId)!.type).toBe('group')
		expect(editor.getShape(a)!.parentId).toBe(groupId)
		expect(editor.getShape(b)!.parentId).toBe(groupId)
	})
})

describe('selection and ephemeral state', () => {
	it('records selection changes so undo restores the previous selection', () => {
		const editor = makeEditor()
		const a = makeBox(editor)
		const b = makeBox(editor, 300, 0)
		editor.select(a)
		editor.markHistoryStoppingPoint()
		editor.select(b)

		editor.undo()
		expect(editor.getSelectedShapeIds()).toEqual([a])
	})

	it('selection changes do not clear the redo stack', () => {
		const editor = makeEditor()
		const a = makeBox(editor, 100, 0)
		const b = makeBox(editor, 300, 0)
		editor.markHistoryStoppingPoint()
		editor.updateShape({ id: a, type: 'geo', x: 200 })
		editor.undo()
		expect(editor.getCanRedo()).toBe(true)

		// setSelectedShapes records with 'record-preserveRedoStack', so selecting after an
		// undo does not destroy the redo
		editor.select(b)
		expect(editor.getCanRedo()).toBe(true)
		editor.redo()
		expect(editor.getShape(a)!.x).toBe(200)
	})

	it('camera moves are not undoable and survive undo', () => {
		const editor = makeEditor()
		const id = makeBox(editor, 100, 0)
		editor.markHistoryStoppingPoint()
		editor.updateShape({ id, type: 'geo', x: 200 })

		editor.setCamera({ x: -500, y: -250, z: 2 })
		expect(editor.getCamera()).toMatchObject({ x: -500, y: -250, z: 2 })

		// undo skips the camera change entirely and reverts the shape edit before it
		editor.undo()
		expect(editor.getShape(id)!.x).toBe(100)
		expect(editor.getCamera()).toMatchObject({ x: -500, y: -250, z: 2 })
	})
})
