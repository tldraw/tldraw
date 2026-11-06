import { createShapeId, createUserId, TLShapeId } from '@tldraw/editor'
import { useCaseRules } from '@tldraw/rules'
import { TestEditor } from './TestEditor'

// The editor side of rules-as-data: the same definitions the sync room enforces, used here for
// affordances (tools, locks, read-only) and for the local write check.

let editor: TestEditor
const frameA = createShapeId('ann-frame')
const frameB = createShapeId('bob-frame')

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
		{ id: frameA, type: 'frame', x: 0, y: 0, props: { w: 400, h: 400 }, meta: { assignee: 'ann' } },
		{
			id: frameB,
			type: 'frame',
			x: 500,
			y: 0,
			props: { w: 400, h: 400 },
			meta: { assignee: 'bob' },
		},
	])
})

function asStudent(id = 'ann') {
	editor.rules.setAccess({ rules: useCaseRules.classroom, user: { id, role: 'student' } })
}

describe('affordances from analysis', () => {
	it('hides tools a student can never use, and keeps the ones that depend on where they draw', () => {
		asStudent()
		expect(editor.rules.canUseTool('frame')).toBe(false)
		expect(editor.rules.canUseTool('line')).toBe(false)
		expect(editor.rules.canUseTool('draw')).toBe(true)
		expect(editor.rules.canUseTool('select')).toBe(true)
	})

	it('locks shapes the user may not touch, but not their own shapes inside them', () => {
		const mine = createShapeId('mine')
		editor.createShapes([
			{ id: mine, type: 'geo', parentId: frameA, x: 10, y: 10, meta: { ownerId: 'ann' } },
		])
		asStudent()
		expect(editor.isShapeOrAncestorLocked(frameA)).toBe(true)
		expect(editor.isShapeOrAncestorLocked(mine)).toBe(false)
	})

	it('derives read-only when no shape write is possible', () => {
		editor.rules.setAccess({ rules: useCaseRules.shareLinks, user: { id: 'v', access: 'view' } })
		expect(editor.getIsReadonly()).toBe(true)
		editor.rules.setAccess({ rules: useCaseRules.shareLinks, user: { id: 'e', access: 'edit' } })
		expect(editor.getIsReadonly()).toBe(false)
	})

	it('follows a document field live: locking the lesson turns tools off', () => {
		asStudent()
		expect(
			editor.rules.decide('create', 'shape', { next: { type: 'draw', parentId: frameA } })
		).toBe('allow')
		editor.rules.setAccess(null)
		editor.updateDocumentSettings({ meta: { locked: true } })
		asStudent()
		expect(
			editor.rules.decide('create', 'shape', { next: { type: 'draw', parentId: frameA } })
		).toBe('deny')
	})
})

describe('local write checks', () => {
	it('stamps a create with the same owner the server will', () => {
		asStudent()
		const id = createShapeId('drawn')
		editor.createShapes([{ id, type: 'geo', parentId: frameA, x: 10, y: 10 }])
		expect(editor.getShape(id)!.meta).toEqual({ ownerId: 'ann' })
	})

	it('vetoes a create the rules deny, and keeps the reason', () => {
		asStudent()
		const id = createShapeId('outside')
		editor.createShapes([{ id, type: 'geo', x: 2000, y: 2000 }])
		expect(editor.getShape(id)).toBeUndefined()
		expect(editor.rules.getLastDenial()?.denial).toMatchObject({
			rule: 'shape.create',
			message: 'Draw inside your own frame, with the student tools',
		})
	})

	it('vetoes moving your shape into another frame', () => {
		asStudent()
		const id = createShapeId('drawn')
		editor.createShapes([{ id, type: 'geo', parentId: frameA, x: 10, y: 10 }])
		editor.reparentShapes([id], frameB)
		expect(editor.getShape(id)!.parentId).toBe(frameA)
	})

	it('vetoes deleting someone else’s shape', () => {
		const bobs: TLShapeId = createShapeId('bobs')
		editor.createShapes([{ id: bobs, type: 'geo', parentId: frameB, meta: { ownerId: 'bob' } }])
		asStudent()
		editor.deleteShapes([bobs])
		expect(editor.getShape(bobs)).toBeDefined()
	})

	it('does not deny a no-op re-put of a record the user may not write', () => {
		const frame = editor.getShape(frameA)!
		asStudent()
		editor.store.put([structuredClone(frame)])
		expect(editor.rules.getLastDenial()).toBeNull()
	})

	it('lets each person write only their own user record', () => {
		asStudent()
		const own = {
			id: createUserId('ann'),
			typeName: 'user',
			name: 'Ann',
			color: '#000',
			imageUrl: '',
			meta: {},
		} as const
		editor.store.put([own])
		expect(editor.store.get(own.id)).toBeDefined()
		const other = { ...own, id: createUserId('bob'), name: 'Not Bob' }
		editor.store.put([other])
		expect(editor.store.get(other.id)).toBeUndefined()
		expect(editor.rules.getLastDenial()?.denial.message).toBe('You can only add your own name')
	})

	it('lets everything through when no rules are set', () => {
		const id = createShapeId('free')
		editor.createShapes([{ id, type: 'geo', x: 2000, y: 2000 }])
		expect(editor.getShape(id)).toBeDefined()
		expect(editor.rules.isActive()).toBe(false)
	})
})

describe('the draw tool with a denied create', () => {
	it('does not throw when the stroke starts outside the frame', () => {
		asStudent()
		editor.setCurrentTool('draw')
		expect(() => {
			editor.pointerDown(2000, 2000).pointerMove(2050, 2050).pointerUp()
		}).not.toThrow()
		expect(editor.getCurrentPageShapes().filter((s) => s.type === 'draw')).toHaveLength(0)
	})

	it('draws inside the student’s frame', () => {
		asStudent()
		editor.setCurrentTool('draw')
		editor.pointerDown(50, 50).pointerMove(100, 100).pointerUp()
		const drawn = editor.getCurrentPageShapes().filter((s) => s.type === 'draw')
		expect(drawn).toHaveLength(1)
		expect(drawn[0]).toMatchObject({ parentId: frameA, meta: { ownerId: 'ann' } })
	})
})

describe('review findings stay fixed', () => {
	it('does not delete a frame when a shape in it must stay', () => {
		const frame = createShapeId('own-frame')
		const theirs = createShapeId('theirs')
		editor.createShapes([
			{
				id: frame,
				type: 'frame',
				x: 0,
				y: 600,
				props: { w: 300, h: 300 },
				meta: { ownerId: 'ann' },
			},
			{ id: theirs, type: 'geo', parentId: frame, x: 10, y: 10, meta: { ownerId: 'bob' } },
		])
		editor.rules.setAccess({
			rules: {
				version: 1,
				types: { shape: { delete: 'prev.meta.ownerId == user.id' } },
				default: { read: 'true', write: 'true' },
			},
			user: { id: 'ann' },
		})
		editor.deleteShapes([frame])
		expect(editor.getShape(frame)).toBeDefined()
		expect(editor.getShape(theirs)?.parentId).toBe(frame)
	})
})
