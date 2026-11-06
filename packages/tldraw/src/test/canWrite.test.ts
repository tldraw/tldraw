import {
	atom,
	createShapeId,
	PageRecordType,
	RecordsDiff,
	TLArrowBinding,
	TLRecord,
	TLRecordWrite,
	TLShape,
} from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

const ids = {
	mine: createShapeId('mine'),
	theirs: createShapeId('theirs'),
}

// Only shapes whose meta.owner is the current user may be written. Everything else is allowed.
const me = atom('me', 'alice')
function ownsShape({ record }: TLRecordWrite) {
	if (record.typeName !== 'shape') return true
	return (record as TLShape).meta.owner === me.get()
}

let editor: TestEditor
let checks: TLRecordWrite[]

// What this client would send to the server
function listenForPush(e: TestEditor) {
	const pushed: RecordsDiff<TLRecord>[] = []
	e.store.listen(({ changes }) => pushed.push(changes), { source: 'user', scope: 'document' })
	return () => {
		e.store._flushHistory()
		return pushed
	}
}

function numUndos(e: TestEditor) {
	return (e as any).history.getNumUndos() as number
}

beforeEach(() => {
	me.set('alice')
	checks = []
	editor = new TestEditor({
		canWrite: (write) => {
			checks.push(write)
			return ownsShape(write)
		},
	})
	editor.store.mergeRemoteChanges(() => {
		editor.createShapes([
			{ id: ids.mine, type: 'geo', x: 0, y: 0, meta: { owner: 'alice' } },
			{ id: ids.theirs, type: 'geo', x: 200, y: 0, meta: { owner: 'bob' } },
		])
	})
	checks = []
})

describe('canWrite option', () => {
	it('blocks a local update, and allows one the check accepts', () => {
		editor.updateShapes([{ id: ids.theirs, type: 'geo', x: 250 }])
		expect(editor.getShape(ids.theirs)!.x).toBe(200)
		editor.updateShapes([{ id: ids.mine, type: 'geo', x: 50 }])
		expect(editor.getShape(ids.mine)!.x).toBe(50)
	})

	it('blocks a local create and a local delete', () => {
		const id = createShapeId('new')
		editor.createShapes([{ id, type: 'geo', meta: { owner: 'bob' } }])
		expect(editor.getShape(id)).toBeUndefined()

		editor.deleteShapes([ids.theirs])
		expect(editor.getShape(ids.theirs)).toBeDefined()

		editor.deleteShapes([ids.mine])
		expect(editor.getShape(ids.mine)).toBeUndefined()
	})

	it('checks the stored record for an update, not the new values', () => {
		// Changing the owner to yourself does not make the write allowed.
		editor.updateShapes([{ id: ids.theirs, type: 'geo', meta: { owner: 'alice' } }])
		expect(editor.getShape(ids.theirs)!.meta.owner).toBe('bob')
	})

	it('never blocks remote changes', () => {
		editor.store.mergeRemoteChanges(() => {
			editor.updateShapes([{ id: ids.theirs, type: 'geo', x: 999 }])
		})
		expect(editor.getShape(ids.theirs)!.x).toBe(999)
	})

	it('does not check session records', () => {
		editor.setCamera({ x: 10, y: 10, z: 1 })
		editor.select(ids.theirs)
		expect(editor.getSelectedShapeIds()).toEqual([ids.theirs])
		expect(checks.every((c) => editor.store.scopedTypes.document.has(c.record.typeName))).toBe(true)
	})

	it('treats a check that throws as false', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const throwing = new TestEditor({
			canWrite: () => {
				throw new Error('nope')
			},
		})
		const id = createShapeId('x')
		throwing.createShapes([{ id, type: 'geo' }])
		expect(throwing.getShape(id)).toBeUndefined()
		expect(throwing.canWrite({ type: 'create', record: { id, typeName: 'shape' } as any })).toBe(
			false
		)
		expect(spy).toHaveBeenCalled()
		spy.mockRestore()
	})
})

describe('Editor.canWrite', () => {
	it('gives the same answer as the gate', () => {
		const mine = editor.getShape(ids.mine)!
		const theirs = editor.getShape(ids.theirs)!
		expect(editor.canWrite({ type: 'update', record: mine })).toBe(true)
		expect(editor.canWrite({ type: 'update', record: theirs })).toBe(false)
		expect(editor.canWrite({ type: 'delete', record: theirs })).toBe(false)
	})

	it('is reactive, and caches the answer for a stored record', () => {
		const theirs = editor.getShape(ids.theirs)!
		expect(editor.canWrite({ type: 'update', record: theirs })).toBe(false)
		const count = checks.length
		expect(editor.canWrite({ type: 'update', record: theirs })).toBe(false)
		expect(checks.length).toBe(count)

		// The check read the `me` atom, so a change to it updates the answer.
		me.set('bob')
		expect(editor.canWrite({ type: 'update', record: theirs })).toBe(true)
		editor.updateShapes([{ id: ids.theirs, type: 'geo', x: 300 }])
		expect(editor.getShape(ids.theirs)!.x).toBe(300)
	})

	it('allows everything without the option', () => {
		const plain = new TestEditor()
		expect(plain.canWrite({ type: 'delete', record: editor.getShape(ids.theirs)! })).toBe(true)
	})

	it('makes a shape not editable or croppable', () => {
		expect(editor.canEditShape(ids.theirs)).toBe(false)
		expect(editor.canCropShape(ids.theirs)).toBe(false)
	})
})

describe('shape tools when a create is blocked', () => {
	it.each(['geo', 'draw', 'note', 'text', 'arrow', 'line', 'frame'])(
		'%s does not throw and creates nothing',
		(tool) => {
			const before = editor.getCurrentPageShapeIds().size
			editor.setCurrentTool(tool)
			expect(() => {
				editor.pointerDown(500, 500).pointerMove(600, 600).pointerMove(650, 650).pointerUp(650, 650)
				editor.cancel()
			}).not.toThrow()
			expect(editor.getCrashingError()).toBeNull()
			expect(editor.getCurrentPageShapeIds().size).toBe(before)
		}
	)
})

describe('operations on more than one record', () => {
	it('rolls back the whole operation when one record is blocked', () => {
		const pushed = listenForPush(editor)
		const undos = numUndos(editor)
		editor.updateShapes([
			{ id: ids.mine, type: 'geo', x: 50 },
			{ id: ids.theirs, type: 'geo', x: 250 },
		])
		expect(editor.getShape(ids.mine)!.x).toBe(0)
		expect(editor.getShape(ids.theirs)!.x).toBe(200)
		expect(pushed()).toEqual([])
		expect(numUndos(editor)).toBe(undos)
	})

	it('rolls back every write in one run', () => {
		const pushed = listenForPush(editor)
		editor.run(() => {
			editor.updateShapes([{ id: ids.mine, type: 'geo', x: 50 }])
			editor.createShapes([{ id: createShapeId('new'), type: 'geo', meta: { owner: 'alice' } }])
			editor.deleteShapes([ids.theirs])
		})
		expect(editor.getShape(ids.mine)!.x).toBe(0)
		expect(editor.getShape(createShapeId('new'))).toBeUndefined()
		expect(editor.getShape(ids.theirs)).toBeDefined()
		expect(pushed()).toEqual([])
	})

	it('keeps the undo history of earlier steps when an operation rolls back', () => {
		editor.markHistoryStoppingPoint()
		editor.updateShapes([{ id: ids.mine, type: 'geo', x: 50 }])
		editor.updateShapes([
			{ id: ids.mine, type: 'geo', x: 100 },
			{ id: ids.theirs, type: 'geo', x: 250 },
		])
		expect(editor.getShape(ids.mine)!.x).toBe(50)
		editor.undo()
		expect(editor.getShape(ids.mine)!.x).toBe(0)
		editor.redo()
		expect(editor.getShape(ids.mine)!.x).toBe(50)
	})

	it('keeps the redo stack when an operation rolls back', () => {
		editor.markHistoryStoppingPoint()
		editor.updateShapes([{ id: ids.mine, type: 'geo', x: 50 }])
		editor.undo()
		editor.run(() => {
			editor.markHistoryStoppingPoint()
			editor.updateShapes([{ id: ids.theirs, type: 'geo', x: 250 }])
		})
		editor.redo()
		expect(editor.getShape(ids.mine)!.x).toBe(50)
	})

	it('does not delete a frame whose child cannot be deleted, or the other shapes', () => {
		const frame = createShapeId('frame')
		const child = createShapeId('child')
		editor.store.mergeRemoteChanges(() => {
			editor.createShapes([
				{ id: frame, type: 'frame', x: 500, y: 0, meta: { owner: 'alice' } },
				{ id: child, type: 'geo', parentId: frame, x: 10, y: 10, meta: { owner: 'bob' } },
			])
		})
		editor.deleteShapes([frame, ids.mine])
		expect(editor.getShape(frame)).toBeDefined()
		expect(editor.getShape(child)!.parentId).toBe(frame)
		expect(editor.getShape(ids.mine)).toBeDefined()
	})

	it('sends nothing when the group create is blocked', () => {
		const blocksGroups = new TestEditor({
			canWrite: ({ type, record }) =>
				!(type === 'create' && record.typeName === 'shape' && (record as TLShape).type === 'group'),
		})
		const a = createShapeId('a')
		const b = createShapeId('b')
		blocksGroups.createShapes([
			{ id: a, type: 'geo', x: 0, y: 0 },
			{ id: b, type: 'geo', x: 300, y: 0 },
		])
		const pushed = listenForPush(blocksGroups)
		blocksGroups.groupShapes([a, b])
		expect(blocksGroups.getShape(a)!.parentId).toBe(blocksGroups.getCurrentPageId())
		expect(blocksGroups.getShape(b)!.parentId).toBe(blocksGroups.getCurrentPageId())
		expect(blocksGroups.getCurrentPageShapeIds().size).toBe(2)
		expect(pushed()).toEqual([])
	})

	it('keeps the shapes of a page whose delete is blocked', () => {
		const blocksPageDeletes = new TestEditor({
			canWrite: ({ type, record }) => !(type === 'delete' && record.typeName === 'page'),
		})
		const page2 = PageRecordType.createId('page2')
		const shape = createShapeId('shape')
		blocksPageDeletes.createPage({ id: page2, name: 'Page 2' })
		blocksPageDeletes.createShapes([{ id: shape, type: 'geo', parentId: page2 }])
		const pushed = listenForPush(blocksPageDeletes)
		blocksPageDeletes.deletePage(page2)
		expect(blocksPageDeletes.getPage(page2)).toBeDefined()
		expect(blocksPageDeletes.getShape(shape)!.parentId).toBe(page2)
		expect(pushed()).toEqual([])
	})

	it('does not delete a page that holds a shape the check blocks', () => {
		const page2 = PageRecordType.createId('page2')
		editor.store.mergeRemoteChanges(() => {
			editor.createPage({ id: page2, name: 'Page 2' })
			editor.createShapes([
				{ id: createShapeId('bobs'), type: 'geo', parentId: page2, meta: { owner: 'bob' } },
			])
		})
		editor.deletePage(page2)
		expect(editor.getPage(page2)).toBeDefined()
	})

	it('does not double the page when the duplicate page create is blocked', () => {
		const blocksPages = new TestEditor({
			canWrite: ({ type, record }) => !(type === 'create' && record.typeName === 'page'),
		})
		blocksPages.createShapes([{ id: createShapeId('a'), type: 'geo' }])
		const page = blocksPages.getCurrentPageId()
		blocksPages.duplicatePage(page)
		expect(blocksPages.getPages()).toHaveLength(1)
		expect(blocksPages.getCurrentPageId()).toBe(page)
		expect(blocksPages.getPageShapeIds(page).size).toBe(1)
	})

	it('does not move shapes to another page when one of them cannot be deleted', () => {
		const page2 = PageRecordType.createId('page2')
		editor.store.mergeRemoteChanges(() => {
			editor.createPage({ id: page2, name: 'Page 2' })
		})
		editor.moveShapesToPage([ids.mine, ids.theirs], page2)
		expect(editor.getShape(ids.mine)!.parentId).toBe(editor.getCurrentPageId())
		expect(editor.getShape(ids.theirs)!.parentId).toBe(editor.getCurrentPageId())
		expect(editor.getCurrentPageShapeIds().size).toBe(2)
	})

	it('does not ungroup a group that cannot be deleted', () => {
		const group = createShapeId('group')
		editor.store.mergeRemoteChanges(() => {
			editor.groupShapes([ids.mine, ids.theirs], { groupId: group })
			editor.updateShape({ id: group, type: 'group', meta: { owner: 'bob' } })
		})
		editor.ungroupShapes([group])
		expect(editor.getShape(group)).toBeDefined()
		expect(editor.getShape(ids.mine)!.parentId).toBe(group)
	})

	it('removes the bindings of a deleted shape, even when binding deletes are blocked', () => {
		const plain = new TestEditor({
			canWrite: ({ type, record }) => !(type === 'delete' && record.typeName === 'binding'),
		})
		const box = createShapeId('box')
		plain.createShapes([{ id: box, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])
		plain.setCurrentTool('arrow')
		plain.pointerDown(50, 50).pointerMove(300, 300).pointerUp(300, 300)
		expect(plain.getBindingsToShape(box, 'arrow')).toHaveLength(1)
		plain.deleteShapes([box])
		expect(plain.store.query.records('binding').get()).toHaveLength(0)
	})

	it('does not leave a stale arrow when the shape it is bound to is deleted', () => {
		// alice may write her box, but not the arrow that bob drew to it
		const box = createShapeId('box')
		editor.store.mergeRemoteChanges(() => {
			editor.createShapes([
				{ id: box, type: 'geo', x: 0, y: 500, props: { w: 100, h: 100 }, meta: { owner: 'alice' } },
			])
		})
		const blocksNothing = new TestEditor()
		blocksNothing.store.put(editor.store.allRecords())
		blocksNothing.setCurrentTool('arrow')
		blocksNothing.pointerDown(50, 550).pointerMove(400, 900).pointerUp(400, 900)
		const arrow = blocksNothing.getOnlySelectedShape()!
		editor.store.mergeRemoteChanges(() => {
			editor.store.put([
				{ ...arrow, meta: { owner: 'bob' } },
				...blocksNothing.store.query.records('binding').get(),
			])
		})
		const bindings = editor.getBindingsToShape<TLArrowBinding>(box, 'arrow')
		expect(bindings).toHaveLength(1)
		const before = editor.getShape(arrow.id)

		editor.deleteShapes([box])
		expect(editor.getShape(box)).toBeDefined()
		expect(editor.getShape(arrow.id)).toEqual(before)
		expect(editor.getBindingsToShape(box, 'arrow')).toEqual(bindings)
	})

	it('does not roll back an operation that merged remote changes', () => {
		editor.run(() => {
			editor.updateShapes([{ id: ids.theirs, type: 'geo', x: 250 }])
			editor.store.mergeRemoteChanges(() => {
				editor.updateShapes([{ id: ids.theirs, type: 'geo', y: 999 }])
			})
		})
		expect(editor.getShape(ids.theirs)!.y).toBe(999)
	})

	it('keeps a side effect that blocks one record to that record', () => {
		const plain = new TestEditor()
		const a = createShapeId('a')
		const b = createShapeId('b')
		plain.createShapes([
			{ id: a, type: 'geo', x: 0 },
			{ id: b, type: 'geo', x: 0 },
		])
		plain.sideEffects.registerBeforeChangeHandler('shape', (prev, next) =>
			prev.id === a ? prev : next
		)
		plain.updateShapes([
			{ id: a, type: 'geo', x: 50 },
			{ id: b, type: 'geo', x: 50 },
		])
		expect(plain.getShape(a)!.x).toBe(0)
		expect(plain.getShape(b)!.x).toBe(50)
	})
})

describe('undo and redo', () => {
	it('does not undo a step in part', () => {
		const other = createShapeId('other')
		editor.store.mergeRemoteChanges(() => {
			editor.createShapes([{ id: other, type: 'geo', x: 400, meta: { owner: 'alice' } }])
		})
		editor.markHistoryStoppingPoint()
		editor.updateShapes([
			{ id: ids.mine, type: 'geo', x: 50 },
			{ id: other, type: 'geo', x: 450 },
		])
		// bob takes `other` over
		editor.store.mergeRemoteChanges(() => {
			editor.store.update(other, (s) => ({ ...s, meta: { owner: 'bob' } }))
		})

		const pushed = listenForPush(editor)
		editor.undo()
		expect(editor.getShape(ids.mine)!.x).toBe(50)
		expect(editor.getShape(other)!.x).toBe(450)
		expect(pushed()).toEqual([])
		expect(editor.canUndo()).toBe(true)
		expect(editor.canRedo()).toBe(false)

		// once alice owns it again, the undo applies whole
		editor.store.mergeRemoteChanges(() => {
			editor.store.update(other, (s) => ({ ...s, meta: { owner: 'alice' } }))
		})
		editor.undo()
		expect(editor.getShape(ids.mine)!.x).toBe(0)
		expect(editor.getShape(other)!.x).toBe(400)
	})

	it('does not redo a step in part', () => {
		editor.markHistoryStoppingPoint()
		editor.updateShapes([{ id: ids.mine, type: 'geo', x: 50 }])
		editor.undo()
		editor.store.mergeRemoteChanges(() => {
			editor.store.update(ids.mine, (s) => ({ ...s, meta: { owner: 'bob' } }))
		})
		editor.redo()
		expect(editor.getShape(ids.mine)!.x).toBe(0)
		expect(editor.canRedo()).toBe(true)
	})
})
