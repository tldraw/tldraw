import { TLRefusal, TLShape, TLShapeId, createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

const id: TLShapeId = createShapeId('note')

function setup() {
	const listeners = new Set<(refusal: TLRefusal) => void>()
	const feed = {
		subscribe(listener: (refusal: TLRefusal) => void) {
			listeners.add(listener)
			return () => void listeners.delete(listener)
		},
	}
	const emit = (refusal: TLRefusal) => listeners.forEach((l) => l(refusal))
	const editor = new TestEditor({}, { collaboration: { status: null, refusals: feed } })
	editor.createShapes([{ id, type: 'geo', x: 0, y: 0 }])
	editor.clearHistory()
	return { editor, emit }
}

// What TLSyncClient does when the server refuses a delete: the store merge brings the shape back
// as a remote change, then the refusal is reported with the user's change.
function refuseDelete(
	editor: TestEditor,
	emit: (r: TLRefusal) => void,
	restored: TLShape,
	opts: { withChanges: boolean } = { withChanges: true }
) {
	editor.store.mergeRemoteChanges(() => editor.store.put([restored]))
	emit({
		reason: 'not your page',
		source: 'server',
		ids: [id],
		...(opts.withChanges
			? { changes: { added: {}, updated: {}, removed: { [id]: restored } } }
			: null),
	} as TLRefusal)
}

describe('undo after a refusal', () => {
	it('does not offer to undo the refused change', () => {
		const { editor, emit } = setup()
		editor.markHistoryStoppingPoint('before delete')
		const prev = editor.getShape(id)!
		editor.deleteShapes([id])
		expect(editor.getShape(id)).toBeUndefined()

		refuseDelete(editor, emit, prev)

		expect(editor.getShape(id)).toBeDefined()
		expect(editor.getCanUndo()).toBe(false)
	})

	it('does not write a stale record over newer remote state', () => {
		const { editor, emit } = setup()
		editor.markHistoryStoppingPoint('before delete')
		const prev = editor.getShape(id)!
		editor.deleteShapes([id])

		refuseDelete(editor, emit, prev)
		// someone else moves the note after the refusal
		editor.store.mergeRemoteChanges(() => editor.store.put([{ ...prev, x: 50 }]))

		editor.undo()

		expect(editor.getShape(id)!.x).toBe(50)
	})

	it('keeps earlier undoable work', () => {
		const { editor, emit } = setup()
		editor.markHistoryStoppingPoint('move')
		editor.updateShapes([{ id, type: 'geo', x: 10 }])
		editor.markHistoryStoppingPoint('before delete')
		const prev = editor.getShape(id)!
		editor.deleteShapes([id])

		refuseDelete(editor, emit, prev)
		editor.undo()

		expect(editor.getShape(id)!.x).toBe(0)
	})

	it('drops only the refused steps of a record changed twice', () => {
		const { editor, emit } = setup()
		const server = editor.getShape(id)!
		editor.markHistoryStoppingPoint('a')
		editor.updateShapes([{ id, type: 'geo', x: 5 }])
		editor.markHistoryStoppingPoint('b')
		editor.updateShapes([{ id, type: 'geo', x: 10 }])
		const user = editor.getShape(id)!

		// both moves were in the refused push; the server's version is x=0
		editor.store.mergeRemoteChanges(() => editor.store.put([server]))
		emit({
			reason: 'not your page',
			source: 'server',
			ids: [id],
			changes: { added: {}, updated: { [id]: [server, user] }, removed: {} },
		} as TLRefusal)

		expect(editor.getCanUndo()).toBe(false)
	})

	it('without changes, drops every undo step on the refused ids', () => {
		const { editor, emit } = setup()
		editor.markHistoryStoppingPoint('move')
		editor.updateShapes([{ id, type: 'geo', x: 10 }])
		const prev = editor.getShape(id)!
		editor.markHistoryStoppingPoint('before delete')
		editor.deleteShapes([id])

		refuseDelete(editor, emit, prev, { withChanges: false })

		expect(editor.getCanUndo()).toBe(false)
	})

	it('leaves other records alone', () => {
		const { editor, emit } = setup()
		const other = createShapeId('other')
		editor.markHistoryStoppingPoint('other')
		editor.createShapes([{ id: other, type: 'geo', x: 20, y: 0 }])
		editor.markHistoryStoppingPoint('before delete')
		const prev = editor.getShape(id)!
		editor.deleteShapes([id])

		refuseDelete(editor, emit, prev)
		editor.undo()

		expect(editor.getShape(other)).toBeUndefined()
	})
})
