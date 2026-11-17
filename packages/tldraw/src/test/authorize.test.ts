import { TLAuthorize, TLRecordChange, TLShape, TLWriteRefusal, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

const ids = {
	mine: createShapeId('mine'),
	theirs: createShapeId('theirs'),
	frame: createShapeId('frame'),
	child: createShapeId('child'),
}

interface Meta {
	userId: string
}

// a user may change only the shapes they own
const ownShapesOnly: TLAuthorize['write'] = (changes, { session }) => {
	const userId = (session.meta as Meta).userId
	return changes.some(
		(c) =>
			(c.prev?.typeName === 'shape' && c.prev.meta.owner !== userId) ||
			(c.next?.typeName === 'shape' && c.next.meta.owner !== userId)
	)
		? { reason: 'not-yours' }
		: null
}

function setup(authorize: TLAuthorize, userId = 'alice') {
	const editor = new TestEditor({}, { authorize, sessionMeta: { userId } satisfies Meta })
	const refusals: TLWriteRefusal[] = []
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
		expect(refusals).toEqual([{ reason: 'not-yours' }])
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
		expect(refusals).toEqual([{ reason: 'not-yours' }])
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
		expect(refusals).toEqual([{ reason: 'error' }])
	})

	it('still undoes and redoes, and a refused undo leaves history as it was', () => {
		const write = vi.fn<NonNullable<TLAuthorize['write']>>(() => null)
		const { editor, refusals } = setup({ write: (...args) => write(...args) })
		editor.markHistoryStoppingPoint()
		editor.createShape({ id: ids.theirs, type: 'geo', meta: { owner: 'bob' } })
		write.mockImplementation(ownShapesOnly)

		editor.undo()
		expect(editor.getShape(ids.theirs)).toBeDefined()
		expect(refusals).toEqual([{ reason: 'not-yours' }])
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

	it('asks authorize.can with the session, the permission and its data', () => {
		const can = vi.fn<NonNullable<TLAuthorize['can']>>(() => false)
		const { editor } = setup({ can })
		editor.createShape({ id: ids.mine, type: 'geo' })
		const shape = editor.getShape(ids.mine) as TLShape
		expect(editor.can('tl:shape:edit', { shape })).toBe(false)
		expect(can).toHaveBeenCalledWith(
			{ sessionId: editor.store.id, meta: { userId: 'alice' } },
			'tl:shape:edit',
			{ shape }
		)
	})
})
