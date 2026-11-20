import {
	TLAuthorize,
	TLRecordChange,
	TLShape,
	TLRefusal,
	TLStoreOptions,
	TLUserPreferences,
	TLWriteRefusal,
	atom,
	createShapeId,
	createTLCurrentUser,
} from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

const ids = {
	mine: createShapeId('mine'),
	theirs: createShapeId('theirs'),
	frame: createShapeId('frame'),
	child: createShapeId('child'),
}

// a user may change only the shapes they own
const ownShapesOnly: TLAuthorize['write'] = (changes, { userId }) => {
	return changes.some(
		(c) =>
			(c.prev?.typeName === 'shape' && c.prev.meta.owner !== userId) ||
			(c.next?.typeName === 'shape' && c.next.meta.owner !== userId)
	)
		? { reason: 'not-yours' }
		: null
}

function setup(authorize: TLAuthorize, storeOptions: Partial<TLStoreOptions> = {}) {
	const prefs = atom<TLUserPreferences>('prefs', { id: 'alice' })
	const user = createTLCurrentUser({
		userPreferences: prefs,
		setUserPreferences: (p) => prefs.set(p),
	})
	const editor = new TestEditor({ user }, { authorize, ...storeOptions })
	const refusals: TLRefusal[] = []
	editor.on('refused', (refusal) => refusals.push(refusal))
	return { editor, refusals }
}

describe('authorize.write in the editor', () => {
	it('allows operations the hook allows', () => {
		const { editor, refusals } = setup({ write: ownShapesOnly })
		editor.createShape({ id: ids.mine, type: 'geo', meta: { owner: 'alice' } })
		expect(editor.getShape(ids.mine)).toBeDefined()
		expect(refusals).toEqual([])
	})

	it('reverts a refused operation, emits refused, and leaves no undo step', () => {
		const { editor, refusals } = setup({ write: ownShapesOnly })
		const undos = () => editor.getHistory().getNumUndos()
		const before = undos()
		editor.createShape({ id: ids.theirs, type: 'geo', meta: { owner: 'bob' } })
		expect(editor.getShape(ids.theirs)).toBeUndefined()
		expect(refusals).toEqual([{ reason: 'not-yours', source: 'local' }])
		expect(undos()).toBe(before)
	})

	it('judges an editor.run as one operation, so a refusal reverts all of it', () => {
		const { editor } = setup({ write: ownShapesOnly })
		editor.run(() => {
			editor.createShape({ id: ids.mine, type: 'geo', meta: { owner: 'alice' } })
			editor.createShape({ id: ids.theirs, type: 'geo', meta: { owner: 'bob' } })
		})
		expect(editor.getShape(ids.mine)).toBeUndefined()
		expect(editor.getShape(ids.theirs)).toBeUndefined()
	})

	it('includes side effects, so deleting a frame that holds a refused child is refused', () => {
		// start without the hook, so the setup itself is allowed
		const write = vi.fn<NonNullable<TLAuthorize['write']>>(() => null)
		const { editor, refusals } = setup({ write: (...args) => write(...args) })
		editor.createShape({ id: ids.frame, type: 'frame', meta: { owner: 'alice' } })
		editor.createShape({
			id: ids.child,
			type: 'geo',
			parentId: ids.frame,
			meta: { owner: 'bob' },
		})
		write.mockImplementation(ownShapesOnly)

		editor.deleteShapes([ids.frame])
		expect(editor.getShape(ids.frame)).toBeDefined()
		expect(editor.getShape(ids.child)).toBeDefined()
		expect(refusals).toEqual([{ reason: 'not-yours', source: 'local' }])
	})

	it('sees only document records, and gets before and after lookups', () => {
		let seen: { changes: TLRecordChange[]; before: unknown; after: unknown } | null = null
		const { editor } = setup({
			write: (changes, { before, after }) => {
				seen = { changes, before: before.get(ids.mine), after: after.get(ids.mine) }
				return null
			},
		})
		editor.createShape({ id: ids.mine, type: 'geo', meta: { owner: 'alice' } })
		expect(seen!.changes.map((c) => `${c.type}:${c.id}`)).toEqual([`create:${ids.mine}`])
		expect(seen!.before).toBeUndefined()
		expect(seen!.after).toMatchObject({ id: ids.mine })

		// selection and camera changes are session state, not document records
		seen = null
		editor.select(ids.mine)
		expect(seen).toBeNull()
	})

	it('gives the hook ctx.can, so write and editor.can use the same rules', () => {
		const { editor, refusals } = setup({
			// a user may edit and delete only the shapes they own
			can: (_permission, data, { userId }) =>
				!data || !('shape' in data) || data.shape.meta.owner === userId,
			write: (changes, ctx) =>
				changes.some(
					(c) =>
						c.type === 'update' &&
						c.prev.typeName === 'shape' &&
						!ctx.can('tl:shape:edit', { shape: c.prev })
				)
					? { reason: 'cannot-edit' }
					: null,
		})
		editor.createShapes([
			{ id: ids.mine, type: 'geo', meta: { owner: 'alice' } },
			{ id: ids.theirs, type: 'geo', meta: { owner: 'bob' } },
		])
		expect(editor.can('tl:shape:edit', { shape: editor.getShape(ids.theirs)! })).toBe(false)
		editor.updateShape({ id: ids.mine, type: 'geo', x: 10 })
		editor.updateShape({ id: ids.theirs, type: 'geo', x: 10 })
		expect(editor.getShape(ids.mine)!.x).toBe(10)
		expect(editor.getShape(ids.theirs)!.x).toBe(0)
		expect(refusals).toEqual([{ reason: 'cannot-edit', source: 'local' }])
	})

	it('refuses when the hook throws', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const { editor, refusals } = setup({
			write: () => {
				throw new Error('boom')
			},
		})
		editor.createShape({ id: ids.mine, type: 'geo' })
		error.mockRestore()
		expect(editor.getShape(ids.mine)).toBeUndefined()
		expect(refusals).toEqual([{ reason: 'error', source: 'local' }])
	})

	it('still undoes and redoes, and a refused undo leaves history as it was', () => {
		const write = vi.fn<NonNullable<TLAuthorize['write']>>(() => null)
		const { editor, refusals } = setup({ write: (...args) => write(...args) })
		editor.markHistoryStoppingPoint()
		editor.createShape({ id: ids.theirs, type: 'geo', meta: { owner: 'bob' } })
		write.mockImplementation(ownShapesOnly)

		editor.undo()
		expect(editor.getShape(ids.theirs)).toBeDefined()
		expect(refusals).toEqual([{ reason: 'not-yours', source: 'local' }])
		expect(editor.getCanUndo()).toBe(true)

		write.mockImplementation(() => null)
		editor.undo()
		expect(editor.getShape(ids.theirs)).toBeUndefined()
		editor.redo()
		expect(editor.getShape(ids.theirs)).toBeDefined()
	})
})

describe('editor.can', () => {
	it('passes every permission when there is no can', () => {
		const editor = new TestEditor()
		expect(editor.can('tl:shape:create')).toBe(true)
	})

	it('asks authorize.can with the permission, its data and the user', () => {
		const can = vi.fn<NonNullable<TLAuthorize['can']>>(() => false)
		const { editor } = setup({ can })
		editor.createShape({ id: ids.mine, type: 'geo' })
		const shape = editor.getShape(ids.mine) as TLShape
		expect(editor.can('tl:shape:edit', { shape })).toBe(false)
		expect(can).toHaveBeenCalledWith('tl:shape:edit', { shape }, { userId: 'alice' })
	})

	it('grants nothing in a read-only editor', () => {
		const { editor } = setup({ can: () => true })
		editor.updateInstanceState({ isReadonly: true })
		expect(editor.can('tl:shape:create')).toBe(false)
	})
})

describe('with a sync room', () => {
	it('judges the user the room sends, once it has sent one', () => {
		const roomUserId = atom<string | null | undefined>('room user', undefined)
		const write = vi.fn<NonNullable<TLAuthorize['write']>>(() => null)
		const can = vi.fn<NonNullable<TLAuthorize['can']>>(() => true)
		const { editor } = setup(
			{ write, can },
			{ collaboration: { status: null, userId: roomUserId } }
		)
		editor.createShape({ id: ids.mine, type: 'geo' })
		expect(write.mock.lastCall![1].userId).toBe('alice')

		// a guest: the room has no user for this session, whatever the editor's local id is
		roomUserId.set(null)
		editor.createShape({ id: ids.theirs, type: 'geo' })
		expect(write.mock.lastCall![1].userId).toBe(null)
		editor.can('tl:shape:create')
		expect(can.mock.lastCall![2]).toEqual({ userId: null })
	})

	it("emits the room's refusals as refused with source server", () => {
		const listeners = new Set<(refusal: TLWriteRefusal) => void>()
		const { refusals } = setup(
			{},
			{
				collaboration: {
					status: null,
					refusals: {
						subscribe: (listener) => {
							listeners.add(listener)
							return () => listeners.delete(listener)
						},
					},
				},
			}
		)
		for (const listener of listeners) listener({ reason: 'not-yours' })
		expect(refusals).toEqual([{ reason: 'not-yours', source: 'server' }])
	})
})
