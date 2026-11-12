import {
	TLRecord,
	TLRefusal,
	TLShapeId,
	TLStoreAuthorize,
	TLWriteRule,
	TLWriteRuleSession,
	createShapeId,
} from '@tldraw/editor'
import { vi } from 'vitest'
import { fakeLicense } from './fakeLicense'
import { TestEditor } from './TestEditor'

const writer: TLWriteRuleSession = {
	sessionId: 'local',
	userId: 'alice',
	meta: null,
	access: { document: 'write', objects: 'write' },
	permissions: null,
}

function setup(opts: Partial<TLStoreAuthorize> & { rule?: TLWriteRule<TLRecord> } = {}) {
	let session: TLWriteRuleSession | null = writer
	const authorize: TLStoreAuthorize = {
		rule: opts.rule ?? (() => null),
		getSession: () => session,
		objectTypes: opts.objectTypes,
	}
	const editor = new TestEditor({}, { authorize })
	fakeLicense(editor)
	const refusals: TLRefusal[] = []
	editor.on('refused', (r) => refusals.push(r))
	editor.clearHistory()
	return {
		editor,
		refusals,
		setSession: (s: TLWriteRuleSession | null) => (session = s),
	}
}

// refuses every change that writes a record the predicate picks
const refuseWhere =
	(pick: (record: TLRecord) => boolean, reason = 'no'): TLWriteRule<TLRecord> =>
	({ changes }) => {
		const ids = changes
			.map((c) => c.next ?? c.prev)
			.filter(pick)
			.map((r) => r.id)
		return ids.length ? { reason, ids } : null
	}

const a = createShapeId('a')
const b = createShapeId('b')
const isShape = (id: TLShapeId) => (r: TLRecord) => r.id === id

describe('the store write rule, in the editor', () => {
	it('keeps an allowed operation as it is', () => {
		const { editor, refusals } = setup()
		editor.createShapes([{ id: a, type: 'geo' }])
		expect(editor.getShape(a)).toBeDefined()
		expect(refusals).toEqual([])
	})

	it('reverts a refused operation whole, says why, and leaves nothing to undo', () => {
		const { editor, refusals } = setup({ rule: refuseWhere(isShape(b)) })
		const before = editor.store.serialize('document')
		editor.markHistoryStoppingPoint()
		editor.createShapes([
			{ id: a, type: 'geo' },
			{ id: b, type: 'geo' },
		])
		expect(editor.getShape(a)).toBeUndefined()
		expect(editor.getShape(b)).toBeUndefined()
		expect(refusals).toEqual([{ reason: 'no', ids: [b], source: 'local' }])
		// the refused operation never became a step: undoing changes nothing
		editor.undo()
		expect(editor.store.serialize('document')).toEqual(before)
	})

	it('keeps earlier work undoable and redo intact after a refusal', () => {
		const { editor } = setup({ rule: refuseWhere(isShape(b)) })
		editor.markHistoryStoppingPoint('a')
		editor.createShapes([{ id: a, type: 'geo' }])
		editor.markHistoryStoppingPoint('b')
		editor.createShapes([{ id: b, type: 'geo' }])
		expect(editor.getShape(b)).toBeUndefined()
		editor.undo()
		expect(editor.getShape(a)).toBeUndefined()
		editor.redo()
		expect(editor.getShape(a)).toBeDefined()
	})

	it('refuses grouping as one operation: no group, children where they were', () => {
		const { editor, refusals } = setup({
			rule: refuseWhere((r) => r.typeName === 'shape' && (r as any).type === 'group', 'no groups'),
		})
		editor.createShapes([
			{ id: a, type: 'geo', x: 0, y: 0 },
			{ id: b, type: 'geo', x: 200, y: 0 },
		])
		const pageId = editor.getCurrentPageId()
		editor.markHistoryStoppingPoint('group')
		editor.groupShapes([a, b])
		expect(editor.getCurrentPageShapes().map((s) => s.type)).toEqual(['geo', 'geo'])
		expect(editor.getShape(a)!.parentId).toBe(pageId)
		expect(editor.getShape(b)!.parentId).toBe(pageId)
		expect(refusals.map((r) => r.reason)).toEqual(['no groups'])
	})

	it('refuses a delete whose binding cleanup is refused, keeping the shape and the binding', () => {
		const { editor, refusals } = setup({
			rule: ({ changes }) =>
				changes.some((c) => c.type === 'delete' && c.prev.typeName === 'binding')
					? { reason: 'binding is protected' }
					: null,
		})
		const arrow = createShapeId('arrow')
		editor.createShapes([
			{ id: a, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: arrow, type: 'arrow', x: 300, y: 50 },
		])
		editor.createBinding({
			type: 'arrow',
			fromId: arrow,
			toId: a,
			props: {
				terminal: 'end',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: false,
				snap: 'none',
			},
		})
		const arrowBefore = editor.getShape(arrow)
		editor.deleteShapes([a])
		expect(editor.getShape(a)).toBeDefined()
		expect(editor.getBindingsToShape(a, 'arrow')).toHaveLength(1)
		expect(editor.getShape(arrow)).toEqual(arrowBefore)
		expect(refusals.map((r) => r.reason)).toEqual(['binding is protected'])
	})

	it('judges writes made by side effects registered after the editor, in the same operation', () => {
		const { editor } = setup({ rule: refuseWhere(isShape(b)) })
		let once = false
		editor.sideEffects.registerOperationCompleteHandler(() => {
			if (once || !editor.getShape(a)) return
			once = true
			editor.createShapes([{ id: b, type: 'geo', x: 300 }])
		})
		editor.createShapes([{ id: a, type: 'geo' }])
		expect(editor.getShape(a)).toBeUndefined()
		expect(editor.getShape(b)).toBeUndefined()
	})

	it('never judges remote changes, and a refusal does not undo them', () => {
		const rule = vi.fn(refuseWhere(() => true))
		const { editor } = setup({ rule })
		const remoteId = createShapeId('remote')
		editor.store.mergeRemoteChanges(() => editor.createShapes([{ id: remoteId, type: 'geo' }]))
		expect(rule).not.toHaveBeenCalled()
		editor.createShapes([{ id: a, type: 'geo' }])
		expect(editor.getShape(a)).toBeUndefined()
		expect(editor.getShape(remoteId)).toBeDefined()
	})

	it('refuses every change while the session is not known, and allows once it is', () => {
		const { editor, refusals, setSession } = setup()
		setSession(null)
		editor.createShapes([{ id: a, type: 'geo' }])
		expect(editor.getShape(a)).toBeUndefined()
		expect(refusals.map((r) => r.reason)).toEqual(['session not ready'])
		setSession(writer)
		editor.createShapes([{ id: a, type: 'geo' }])
		expect(editor.getShape(a)).toBeDefined()
	})

	it('enforces read-only access before the rule, like the room', () => {
		const rule = vi.fn(() => null)
		const { editor, refusals, setSession } = setup({ rule })
		setSession({ ...writer, access: { document: 'read', objects: 'write' } })
		editor.createShapes([{ id: a, type: 'geo' }])
		expect(editor.getShape(a)).toBeUndefined()
		expect(rule).not.toHaveBeenCalled()
		expect(refusals).toEqual([{ reason: 'document is read-only', ids: [a], source: 'local' }])
	})

	it("applies the object store's access to the room's object types", () => {
		const { editor, refusals, setSession } = setup({ objectTypes: ['shape'] })
		setSession({ ...writer, access: { document: 'write', objects: 'read' } })
		editor.createShapes([{ id: a, type: 'geo' }])
		expect(editor.getShape(a)).toBeUndefined()
		expect(refusals.map((r) => r.reason)).toEqual(['object store is read-only'])
	})

	it('refuses when the rule throws', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const { editor, refusals } = setup({
			rule: () => {
				throw new Error('boom')
			},
		})
		editor.createShapes([{ id: a, type: 'geo' }])
		expect(editor.getShape(a)).toBeUndefined()
		expect(refusals.map((r) => r.reason)).toEqual(['something went wrong'])
		spy.mockRestore()
	})

	it('gives the rule before and after views of the whole operation', () => {
		const seen: unknown[] = []
		const { editor } = setup({
			rule: ({ changes, before, after }) => {
				for (const c of changes) {
					const id = (c.next ?? c.prev).id
					seen.push([c.type, !!before(id), !!after(id)])
				}
				return null
			},
		})
		editor.createShapes([{ id: a, type: 'geo' }])
		editor.updateShapes([{ id: a, type: 'geo', x: 10 }])
		editor.deleteShapes([a])
		expect(seen).toEqual([
			['create', false, true],
			['update', true, true],
			['delete', true, false],
		])
	})

	it('judges a store given only a rule with the default session, no user', () => {
		const seen: TLWriteRuleSession[] = []
		const editor = new TestEditor(
			{},
			{
				authorize: {
					rule: ({ session }) => {
						seen.push(session)
						return null
					},
				},
			}
		)
		fakeLicense(editor)
		editor.createShapes([{ id: a, type: 'geo' }])
		expect(editor.getShape(a)).toBeDefined()
		expect(seen.at(-1)).toEqual({
			sessionId: 'local',
			userId: null,
			meta: undefined,
			access: { document: 'write', objects: 'write' },
			permissions: null,
		})
	})

	it('uses getSession over the default session', () => {
		const seen: Array<string | null> = []
		const { editor } = setup({
			rule: ({ session }) => {
				seen.push(session.userId)
				return null
			},
		})
		editor.createShapes([{ id: a, type: 'geo' }])
		expect(seen.at(-1)).toBe('alice')
	})
})
