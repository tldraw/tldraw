import { TLRejectedWrite, TLShape, TLShapeId, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

const id: TLShapeId = createShapeId('note')

function setup() {
	const listeners = new Set<(rejected: TLRejectedWrite) => void>()
	const editor = new TestEditor(
		{},
		{
			collaboration: {
				status: null,
				onWriteRejected: (listener) => {
					listeners.add(listener)
					return () => void listeners.delete(listener)
				},
			},
		}
	)
	editor.createShapes([{ id, type: 'geo', x: 0, y: 0 }])
	editor.clearHistory()
	const report = (rejected: TLRejectedWrite) => listeners.forEach((listener) => listener(rejected))
	return { editor, report, listeners }
}

// What TLSyncClient does when the room rejects a delete: the merge brings the shape back as a
// remote change, then the rejection is reported with the user's change.
function rejectDelete(
	editor: TestEditor,
	report: (rejected: TLRejectedWrite) => void,
	restored: TLShape
) {
	editor.store.mergeRemoteChanges(() => editor.store.put([restored]))
	report({
		rejections: [{ id, reason: 'not-yours' }],
		changes: { added: {}, updated: {}, removed: { [id]: restored } } as TLRejectedWrite['changes'],
	})
}

describe('a write that the server rejected', () => {
	it('emits rejected-write with the rejections', () => {
		const { editor, report } = setup()
		const onRejected = vi.fn()
		editor.on('rejected-write', onRejected)
		const prev = editor.getShape(id)!
		editor.deleteShapes([id])

		rejectDelete(editor, report, prev)

		expect(onRejected).toHaveBeenCalledTimes(1)
		expect(onRejected).toHaveBeenCalledWith({
			rejections: [{ id, reason: 'not-yours' }],
			rejectedBy: 'server',
		})
	})

	it('stops listening when the editor is disposed', () => {
		const { editor, listeners } = setup()
		expect(listeners.size).toBe(1)
		editor.dispose()
		expect(listeners.size).toBe(0)
	})

	it('does not offer to undo the rejected change', () => {
		const { editor, report } = setup()
		editor.markHistoryStoppingPoint('before delete')
		const prev = editor.getShape(id)!
		editor.deleteShapes([id])
		expect(editor.getShape(id)).toBeUndefined()

		rejectDelete(editor, report, prev)

		expect(editor.getShape(id)).toBeDefined()
		expect(editor.getCanUndo()).toBe(false)
	})

	it('does not write a stale record over newer remote state', () => {
		const { editor, report } = setup()
		editor.markHistoryStoppingPoint('before delete')
		const prev = editor.getShape(id)!
		editor.deleteShapes([id])

		rejectDelete(editor, report, prev)
		// someone else moves the shape after the rejection
		editor.store.mergeRemoteChanges(() => editor.store.put([{ ...prev, x: 50 }]))

		editor.undo()

		expect(editor.getShape(id)!.x).toBe(50)
	})

	it('keeps earlier undoable work', () => {
		const { editor, report } = setup()
		editor.markHistoryStoppingPoint('move')
		editor.updateShapes([{ id, type: 'geo', x: 10 }])
		editor.markHistoryStoppingPoint('before delete')
		const prev = editor.getShape(id)!
		editor.deleteShapes([id])

		rejectDelete(editor, report, prev)
		editor.undo()

		expect(editor.getShape(id)!.x).toBe(0)
	})

	it('removes each rejected step of a record that changed twice', () => {
		const { editor, report } = setup()
		const server = editor.getShape(id)!
		editor.markHistoryStoppingPoint('a')
		editor.updateShapes([{ id, type: 'geo', x: 5 }])
		editor.markHistoryStoppingPoint('b')
		editor.updateShapes([{ id, type: 'geo', x: 10 }])
		const user = editor.getShape(id)!

		// both moves were in the rejected push
		editor.store.mergeRemoteChanges(() => editor.store.put([server]))
		report({
			rejections: [{ id, reason: 'not-yours' }],
			changes: {
				added: {},
				updated: { [id]: [server, user] },
				removed: {},
			} as TLRejectedWrite['changes'],
		})

		expect(editor.getCanUndo()).toBe(false)
	})

	it('removes the rejected change from redo', () => {
		const { editor, report } = setup()
		const server = editor.getShape(id)!
		editor.markHistoryStoppingPoint('move')
		editor.updateShapes([{ id, type: 'geo', x: 10 }])
		const user = editor.getShape(id)!
		editor.undo()
		expect(editor.getCanRedo()).toBe(true)

		// the room rejected the move after the user had already undone it
		report({
			rejections: [{ id, reason: 'not-yours' }],
			changes: {
				added: {},
				updated: { [id]: [server, user] },
				removed: {},
			} as TLRejectedWrite['changes'],
		})

		expect(editor.getCanRedo()).toBe(false)
	})

	it('leaves other records alone', () => {
		const { editor, report } = setup()
		const other = createShapeId('other')
		editor.markHistoryStoppingPoint('other')
		editor.createShapes([{ id: other, type: 'geo', x: 20, y: 0 }])
		editor.markHistoryStoppingPoint('before delete')
		const prev = editor.getShape(id)!
		editor.deleteShapes([id])

		rejectDelete(editor, report, prev)
		editor.undo()

		expect(editor.getShape(other)).toBeUndefined()
	})
})
