import {
	createShapeId,
	Editor,
	PageRecordType,
	TLGeoShape,
	TLRecord,
	TLShape,
	TLShapeId,
	TLStoreAuthorize,
	TLWriteRule,
	TLWriteRuleSession,
} from '@tldraw/editor'
import { fakeLicense } from './fakeLicense'
import { TestEditor } from './TestEditor'

// "Create but not update" can't draw (every drag frame is an update), so the supported way to keep
// people off each other's shapes is ownership. This is the recipe from the docs: the editor stamps
// the creator before the first local check, and one rule, shared with the server, judges it.

interface Meta {
	manage: boolean
}

/** Stamps `meta.createdBy` on every shape this user creates; copies become theirs. */
function stampOwnership(editor: Editor, getUserId: () => string | null) {
	// moveShapesToPage deletes and re-creates with the same ids: that's a move, keep the owner
	const recreated = new Map<TLShapeId, unknown>()
	editor.sideEffects.registerBeforeDeleteHandler('shape', (shape, source) => {
		if (source !== 'user') return
		if (recreated.size === 0) queueMicrotask(() => recreated.clear())
		recreated.set(shape.id, shape.meta.createdBy)
	})
	editor.sideEffects.registerBeforeCreateHandler('shape', (shape, source) => {
		// remote shapes keep the server's owner, undo restores the one it had
		if (source !== 'user' || editor.isReplayingHistory()) return shape
		const createdBy = recreated.has(shape.id) ? recreated.get(shape.id) : getUserId()
		return { ...shape, meta: { ...shape.meta, createdBy } } as TLShape
	})
}

/** Yours to change, unless you manage the board. Ownership itself never changes. */
const ownershipRule: TLWriteRule<TLRecord, Meta> = ({ session, changes }) => {
	const me = session.userId
	const mine = (shape: TLShape) => !!me && (shape.meta.createdBy === me || session.meta.manage)
	for (const c of changes) {
		const shape = (c.next ?? c.prev) as TLShape
		if (shape.typeName !== 'shape') continue
		const ok =
			c.type === 'create'
				? !!me && (c.next.meta.createdBy === me || session.meta.manage)
				: c.type === 'update'
					? mine(c.prev as TLShape) && c.next.meta.createdBy === c.prev.meta.createdBy
					: mine(c.prev as TLShape)
		if (!ok) return { reason: 'not yours', ids: [shape.id] }
	}
	return null
}

function setup(userId: string | null = 'alice') {
	let session: TLWriteRuleSession<Meta> = {
		sessionId: 's',
		userId,
		meta: { manage: false },
		access: { document: 'write', objects: 'write' },
		permissions: null,
	}
	const authorize: TLStoreAuthorize<Meta> = { rule: ownershipRule, getSession: () => session }
	const editor = new TestEditor({}, { authorize })
	fakeLicense(editor)
	stampOwnership(editor, () => session.userId)
	const refusals: string[] = []
	editor.on('refused', (r) => refusals.push(r.reason))
	return {
		editor,
		refusals,
		setManage: (manage: boolean) => (session = { ...session, meta: { manage } }),
	}
}

const bobs = createShapeId('bobs')
function addBobsShape(editor: Editor) {
	editor.store.mergeRemoteChanges(() =>
		editor.createShapes([
			{
				id: bobs,
				type: 'geo',
				x: 500,
				y: 500,
				props: { w: 50, h: 50 },
				meta: { createdBy: 'bob' },
			},
		])
	)
}

describe('ownership', () => {
	it('draws a rectangle with no round trip: every drag frame is an update of your own shape', () => {
		const { editor, refusals } = setup()
		editor.setCurrentTool('geo')
		editor.pointerDown(0, 0).pointerMove(100, 50).pointerMove(200, 150).pointerUp()
		const [shape] = editor.getCurrentPageShapes() as TLGeoShape[]
		expect([shape.props.w, shape.props.h, shape.meta.createdBy]).toEqual([200, 150, 'alice'])
		expect(refusals).toEqual([])
	})

	it("keeps a remote shape's owner", () => {
		const { editor } = setup()
		addBobsShape(editor)
		expect(editor.getShape(bobs)!.meta.createdBy).toBe('bob')
	})

	it("makes a duplicate of someone else's shape yours", () => {
		const { editor, refusals } = setup()
		addBobsShape(editor)
		editor.duplicateShapes([bobs])
		const copy = editor.getCurrentPageShapes().find((s) => s.id !== bobs)!
		expect(copy.meta.createdBy).toBe('alice')
		expect(refusals).toEqual([])
	})

	it("makes a pasted copy of someone else's shape yours", () => {
		const { editor, refusals } = setup()
		addBobsShape(editor)
		editor.putContentOntoCurrentPage(editor.getContentFromCurrentPage([bobs])!)
		const copy = editor.getCurrentPageShapes().find((s) => s.id !== bobs)!
		expect(copy.meta.createdBy).toBe('alice')
		expect(refusals).toEqual([])
	})

	it("refuses changing someone else's shape, and taking it over", () => {
		const { editor, refusals } = setup()
		addBobsShape(editor)
		editor.updateShapes([{ id: bobs, type: 'geo', x: 0 }])
		editor.updateShapes([{ id: bobs, type: 'geo', meta: { createdBy: 'alice' } }])
		editor.deleteShapes([bobs])
		expect(editor.getShape(bobs)).toMatchObject({ x: 500, meta: { createdBy: 'bob' } })
		expect(refusals).toEqual(['not yours', 'not yours', 'not yours'])
	})

	it('moves your shape to another page with its owner, and refuses moving theirs', () => {
		const { editor, refusals } = setup()
		const pageB = PageRecordType.createId('b')
		editor.createPage({ id: pageB, name: 'B' })
		const mine = createShapeId('mine')
		editor.createShapes([{ id: mine, type: 'geo' }])
		addBobsShape(editor)
		const pageA = editor.getCurrentPageId()

		editor.moveShapesToPage([mine], pageB)
		expect(editor.getShape(mine)).toMatchObject({ parentId: pageB, meta: { createdBy: 'alice' } })
		expect(refusals).toEqual([])

		editor.setCurrentPage(pageA)
		editor.moveShapesToPage([bobs], pageB)
		expect(editor.getShape(bobs)).toMatchObject({ parentId: pageA, meta: { createdBy: 'bob' } })
		expect(refusals).toEqual(['not yours'])
	})

	it("keeps the owner when a manager moves someone else's shape to another page", () => {
		const { editor, setManage, refusals } = setup('teacher')
		setManage(true)
		const pageB = PageRecordType.createId('b')
		editor.createPage({ id: pageB, name: 'B' })
		addBobsShape(editor)
		editor.moveShapesToPage([bobs], pageB)
		expect(editor.getShape(bobs)).toMatchObject({ parentId: pageB, meta: { createdBy: 'bob' } })
		expect(refusals).toEqual([])
	})

	it("undoes a manager's delete with the owner the shape had", async () => {
		const { editor, setManage } = setup('teacher')
		setManage(true)
		addBobsShape(editor)
		editor.markHistoryStoppingPoint('delete')
		editor.deleteShapes([bobs])
		expect(editor.getShape(bobs)).toBeUndefined()
		// the undo comes later, not in the same task as the delete
		await Promise.resolve()
		editor.undo()
		expect(editor.getShape(bobs)!.meta.createdBy).toBe('bob')
	})

	it('refuses every create when anonymous', () => {
		const { editor, refusals } = setup(null)
		editor.createShapes([{ type: 'geo' }])
		expect(editor.getCurrentPageShapes()).toEqual([])
		expect(refusals).toEqual(['not yours'])
	})
})
