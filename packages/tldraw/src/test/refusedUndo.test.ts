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

	it('keeps an accepted earlier step when a peer changed another field before the refusal', () => {
		const { editor, emit } = setup()
		editor.markHistoryStoppingPoint('accepted move')
		editor.updateShapes([{ id, type: 'geo', x: 5 }])
		const accepted = editor.getShape(id)!
		editor.markHistoryStoppingPoint('refused move')
		editor.updateShapes([{ id, type: 'geo', x: 10 }])
		const mine = editor.getShape(id)!

		// the server keeps the accepted move, a peer recolours, then this user's second move is refused
		const server = { ...accepted, props: { ...accepted.props, color: 'red' } } as TLShape
		editor.store.mergeRemoteChanges(() => editor.store.put([server]))
		emit({
			reason: 'not your page',
			source: 'server',
			ids: [id],
			changes: { added: {}, updated: { [id]: [server, mine] }, removed: {} },
		} as TLRefusal)

		expect(editor.getCanUndo()).toBe(true)
		editor.undo()
		expect(editor.getShape(id)).toMatchObject({ x: 0 })
	})

	it('drops a refused push and the pending one after it, and nothing earlier', () => {
		const { editor, emit } = setup()
		editor.markHistoryStoppingPoint('accepted move')
		editor.updateShapes([{ id, type: 'geo', x: 5 }])
		const accepted = editor.getShape(id)!
		editor.markHistoryStoppingPoint('refused move')
		editor.updateShapes([{ id, type: 'geo', x: 10 }])
		editor.markHistoryStoppingPoint('pending move')
		editor.updateShapes([{ id, type: 'geo', x: 15 }])
		const mine = editor.getShape(id)!

		editor.store.mergeRemoteChanges(() => editor.store.put([accepted]))
		emit({
			reason: 'not your page',
			source: 'server',
			ids: [id],
			changes: { added: {}, updated: { [id]: [accepted, mine] }, removed: {} },
		} as TLRefusal)

		editor.undo()
		expect(editor.getShape(id)).toMatchObject({ x: 0 })
		expect(editor.getCanUndo()).toBe(false)
	})

	it('keeps accepted steps when the refused push is followed by a pending one', () => {
		const { editor, emit } = setup()
		editor.markHistoryStoppingPoint('accepted move')
		editor.updateShapes([{ id, type: 'geo', x: 5 }])
		const accepted = editor.getShape(id)!
		editor.markHistoryStoppingPoint('refused move')
		editor.updateShapes([{ id, type: 'geo', x: 10 }])
		const refused = editor.getShape(id)!
		editor.markHistoryStoppingPoint('pending move')
		editor.updateShapes([{ id, type: 'geo', x: 15 }])

		// the merge reverts to x=5 and re-applies the pending push, so the store ends at x=15
		editor.store.mergeRemoteChanges(() => editor.store.put([editor.getShape(id)!]))
		emit({
			reason: 'not your page',
			source: 'server',
			ids: [id],
			changes: { added: {}, updated: { [id]: [accepted, refused] }, removed: {} },
		} as TLRefusal)

		editor.undo()
		expect(editor.getShape(id)).toMatchObject({ x: 5 })
		editor.undo()
		expect(editor.getShape(id)).toMatchObject({ x: 0 })
		expect(editor.getCanUndo()).toBe(false)

		editor.redo()
		expect(editor.getShape(id)).toMatchObject({ x: 5 })
		editor.redo()
		expect(editor.getShape(id)).toMatchObject({ x: 15 })
		expect(editor.getCanRedo()).toBe(false)
	})

	it('does not redo the refused value through a pending step on another field', () => {
		const { editor, emit } = setup()
		editor.markHistoryStoppingPoint('accepted move')
		editor.updateShapes([{ id, type: 'geo', x: 5 }])
		const accepted = editor.getShape(id)!
		editor.markHistoryStoppingPoint('refused move')
		editor.updateShapes([{ id, type: 'geo', x: 10 }])
		const refused = editor.getShape(id)!
		editor.markHistoryStoppingPoint('pending move')
		editor.updateShapes([{ id, type: 'geo', y: 7 }])

		editor.store.mergeRemoteChanges(() => editor.store.put([{ ...accepted, y: 7 }]))
		emit({
			reason: 'not your page',
			source: 'server',
			ids: [id],
			changes: { added: {}, updated: { [id]: [accepted, refused] }, removed: {} },
		} as TLRefusal)

		editor.undo()
		expect(editor.getShape(id)).toMatchObject({ x: 5, y: 0 })
		editor.redo()
		expect(editor.getShape(id)).toMatchObject({ x: 5, y: 7 })
	})

	it('keeps an accepted change that shares a history step with a refused one', () => {
		const { editor, emit } = setup()
		editor.updateShapes([{ id, type: 'geo', x: 5 }])
		editor.clearHistory()
		const server = editor.getShape(id)!
		editor.markHistoryStoppingPoint('move')
		// push A (refused) then push B (accepted), with no mark between them
		editor.updateShapes([{ id, type: 'geo', x: 10 }])
		const refused = editor.getShape(id)!
		editor.updateShapes([{ id, type: 'geo', y: 7 }])

		editor.store.mergeRemoteChanges(() => editor.store.put([{ ...server, y: 7 }]))
		emit({
			reason: 'not your page',
			source: 'server',
			ids: [id],
			changes: { added: {}, updated: { [id]: [server, refused] }, removed: {} },
		} as TLRefusal)

		expect(editor.getShape(id)).toMatchObject({ x: 5, y: 7 })
		editor.undo()
		expect(editor.getShape(id)).toMatchObject({ x: 5, y: 0 })
		editor.redo()
		expect(editor.getShape(id)).toMatchObject({ x: 5, y: 7 })
	})

	it('drops every step of a refused push that changed different fields', () => {
		const { editor, emit } = setup()
		editor.updateShapes([{ id, type: 'geo', x: 5 }])
		editor.clearHistory()
		const server = editor.getShape(id)!
		editor.markHistoryStoppingPoint('a')
		editor.updateShapes([{ id, type: 'geo', x: 10 }])
		editor.markHistoryStoppingPoint('b')
		editor.updateShapes([{ id, type: 'geo', y: 3 }])
		const user = editor.getShape(id)!

		editor.store.mergeRemoteChanges(() => editor.store.put([server]))
		emit({
			reason: 'not your page',
			source: 'server',
			ids: [id],
			changes: { added: {}, updated: { [id]: [server, user] }, removed: {} },
		} as TLRefusal)

		expect(editor.getCanUndo()).toBe(false)
		editor.undo()
		editor.redo()
		expect(editor.getShape(id)).toMatchObject({ x: 5, y: 0 })
	})
})
