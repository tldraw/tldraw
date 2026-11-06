import { PermissionChain, TLRecord, allow, atomic, createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

// The editor side of a permission chain (`Store.setPermissions`): what the user may not change
// acts as locked, and what the chain puts back leaves no undo entry.

let editor: TestEditor
const ids = {
	mine: createShapeId('mine'),
	theirs: createShapeId('theirs'),
	frame: createShapeId('frame'),
	inFrame: createShapeId('inFrame'),
}

const chain = new PermissionChain<TLRecord, { userId: string }>(
	allow((access, { actor }) => {
		if (access.type === 'read' || access.type === 'action') return
		const record = access.prev ?? access.next
		if (record.typeName !== 'shape') return
		if (access.prev && record.meta.ownerId !== actor.userId) return 'not your shape'
		const next = access.next
		if (next?.typeName === 'shape' && next.x > 1000) return 'too far'
	})
)

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
		{ id: ids.mine, type: 'geo', x: 0, y: 0, meta: { ownerId: 'me' } },
		{ id: ids.theirs, type: 'geo', x: 300, y: 0, meta: { ownerId: 'them' } },
		{
			id: ids.frame,
			type: 'frame',
			x: 0,
			y: 400,
			props: { w: 400, h: 400 },
			meta: { ownerId: 'them' },
		},
		{ id: ids.inFrame, type: 'geo', parentId: ids.frame, x: 50, y: 50, meta: { ownerId: 'me' } },
	])
	editor.store.setPermissions({ chain, getActor: () => ({ userId: 'me' }) })
	editor.clearHistory()
})

describe('a shape that the chain does not let the user change', () => {
	it('acts as locked, with the reason', () => {
		expect({
			theirs: [
				editor.isShapeOrAncestorLocked(ids.theirs),
				editor.getShapePermissionDenial(ids.theirs),
			],
			mine: [editor.isShapeOrAncestorLocked(ids.mine), editor.getShapePermissionDenial(ids.mine)],
		}).toEqual({ theirs: [true, 'not your shape'], mine: [false, undefined] })
	})

	it('cannot be selected or dragged, so nothing snaps back', () => {
		const onDenied = vi.fn()
		editor.store.setPermissions({ chain, getActor: () => ({ userId: 'me' }), onDenied })
		editor.pointerDown(350, 50).pointerMove(450, 150).pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
		expect(editor.getShape(ids.theirs)!.x).toBe(300)
		expect(onDenied).not.toHaveBeenCalled()
	})

	it('does not lock a shape of the user inside it', () => {
		expect(editor.isShapeOrAncestorLocked(ids.frame)).toBe(true)
		expect(editor.isShapeOrAncestorLocked(ids.inFrame)).toBe(false)
	})

	it('follows a change of actor or chain', () => {
		editor.store.setPermissions({ chain, getActor: () => ({ userId: 'them' }) })
		expect([
			editor.isShapeOrAncestorLocked(ids.theirs),
			editor.isShapeOrAncestorLocked(ids.mine),
		]).toEqual([false, true])
		editor.store.setPermissions(null)
		expect(editor.isShapeOrAncestorLocked(ids.mine)).toBe(false)
	})

	it('is not skipped by updateShapes: the store checks the write and puts it back', () => {
		const onDenied = vi.fn()
		editor.store.setPermissions({ chain, getActor: () => ({ userId: 'me' }), onDenied })
		editor.updateShape({ id: ids.theirs, type: 'geo', x: 999 })
		editor.deleteShapes([ids.theirs])
		expect(editor.getShape(ids.theirs)!.x).toBe(300)
		expect(onDenied).toHaveBeenCalledTimes(2)
	})

	it('can be changed by the host in withoutPermissions', () => {
		editor.store.withoutPermissions(() =>
			editor.updateShape({ id: ids.theirs, type: 'geo', x: 500 })
		)
		expect(editor.getShape(ids.theirs)!.x).toBe(500)
	})

	it('is not hit or selected by select all', () => {
		editor.selectAll()
		expect(editor.getSelectedShapeIds().sort()).toEqual([ids.mine])
		expect(editor.getShapeAtPoint({ x: 350, y: 50 })).toBeUndefined()
	})
})

describe('a write that the chain denies at the end of the operation', () => {
	it('is put back, and leaves no undo entry', () => {
		const onDenied = vi.fn()
		editor.store.setPermissions({ chain, getActor: () => ({ userId: 'me' }), onDenied })
		editor.markHistoryStoppingPoint('first')
		editor.updateShape({ id: ids.mine, type: 'geo', x: 10 })
		editor.markHistoryStoppingPoint('second')
		editor.updateShape({ id: ids.mine, type: 'geo', x: 2000 })
		expect(editor.getShape(ids.mine)!.x).toBe(10)
		expect(onDenied.mock.calls[0][0].map((d: { reason: string }) => d.reason)).toEqual(['too far'])
		// One undo reverts the allowed change: the denied write left nothing to undo.
		editor.undo()
		expect(editor.getShape(ids.mine)!.x).toBe(0)
	})

	it('leaves the allowed part of the operation undoable', () => {
		editor.markHistoryStoppingPoint('before')
		editor.updateShapes([
			{ id: ids.mine, type: 'geo', x: 2000 },
			{ id: ids.inFrame, type: 'geo', x: 60 },
		])
		expect([editor.getShape(ids.mine)!.x, editor.getShape(ids.inFrame)!.x]).toEqual([0, 60])
		editor.undo()
		expect([editor.getShape(ids.mine)!.x, editor.getShape(ids.inFrame)!.x]).toEqual([0, 50])
	})
})

describe('the store puts back a denied create', () => {
	it('with the editor cleanup, so no selection points at the removed shape', () => {
		const id = createShapeId('far')
		// one store operation: the create and the selection are checked together
		editor.store.atomic(() => {
			editor.createShape({ id, type: 'geo', x: 2000, y: 0 })
			editor.select(id)
		})
		expect([editor.getShape(id), editor.getSelectedShapeIds()]).toEqual([undefined, []])
	})
})

describe('one editor operation', () => {
	it('is one batch: with atomic(), a partly denied operation changes nothing', () => {
		editor.store.setPermissions({
			chain: new PermissionChain<TLRecord, { userId: string }>(atomic(), chain),
			getActor: () => ({ userId: 'me' }),
		})
		editor.run(() => {
			editor.updateShapes([{ id: ids.mine, type: 'geo', x: 100 }])
			editor.updateShapes([{ id: ids.theirs, type: 'geo', x: 400 }])
		})
		expect([editor.getShape(ids.mine)!.x, editor.getShape(ids.theirs)!.x]).toEqual([0, 300])
	})

	it('is checked when it ends, so a denied record does not vanish while the operation reads it', () => {
		const id = createShapeId('far')
		let seenInside: unknown
		editor.run(() => {
			editor.createShape({ id, type: 'geo', x: 2000, y: 0 })
			seenInside = editor.getShape(id)?.id
		})
		expect([seenInside, editor.getShape(id)]).toEqual([id, undefined])
	})
})
