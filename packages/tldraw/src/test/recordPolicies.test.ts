import {
	PolicyActor,
	TLPolicies,
	TLShape,
	createPolicyActor,
	createShapeId,
	isOwnedBy,
	mayUpdate,
} from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

// The editor side of per-record-type policies: what a student feels in the classroom case. The
// same policies run on the sync server (see sync-core's recordPolicies.test.ts).

vi.useFakeTimers()

const classroom: TLPolicies = {
	shape: {
		create: (ctx) =>
			ctx.base() ||
			(ctx.can('shapes:create') &&
				isOwnedBy(ctx.actor, ctx.next.meta.ownerId) &&
				(ctx.next.parentId.startsWith('page:') || mayUpdate(ctx, ctx.get(ctx.next.parentId)))),
		update: (ctx) =>
			ctx.base() ||
			(ctx.can('shapes:create') &&
				isOwnedBy(ctx.actor, ctx.prev.meta.ownerId) &&
				ctx.next.meta.ownerId === ctx.prev.meta.ownerId &&
				(ctx.next.parentId === ctx.prev.parentId ||
					ctx.next.parentId.startsWith('page:') ||
					mayUpdate(ctx, ctx.get(ctx.next.parentId)))),
		delete: (ctx) =>
			ctx.base() || (ctx.can('shapes:create') && isOwnedBy(ctx.actor, ctx.prev.meta.ownerId)),
	},
}

const teacher = createPolicyActor({ id: 'teacher', actions: ['document:write'] })
const student = createPolicyActor({ id: 'sam', actions: ['shapes:create'] })
const viewer = createPolicyActor({ id: 'vi', actions: [] })

const ids = {
	teacherBox: createShapeId('teacherBox'),
	samBox: createShapeId('samBox'),
}

let editor: TestEditor
let denied: string[]

function setActor(actor: PolicyActor) {
	editor.setActor(actor)
	// The editor stamps the owner on new shapes; the policy (and the server) only verify it.
	editor.getInitialMetaForShape = () => ({ ownerId: actor.id })
}

beforeEach(() => {
	editor = new TestEditor({}, { policies: classroom })
	denied = []
	editor.store.addPolicyDeniedListener((requests) => denied.push(...requests.map((r) => r.verb)))
	setActor(teacher)
	editor.createShapes([{ id: ids.teacherBox, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])
	setActor(student)
	editor.createShapes([{ id: ids.samBox, type: 'geo', x: 300, y: 0, props: { w: 100, h: 100 } }])
})
afterEach(() => {
	editor?.dispose()
})

const shape = (id: TLShape['id']) => editor.getShape(id)!

describe('the classroom, as a student', () => {
	it('stamps the owner on shapes drawn with a tool', () => {
		editor.setCurrentTool('geo').pointerDown(600, 300).pointerMove(700, 400).pointerUp()
		const created = editor.getOnlySelectedShape()!
		expect(created.meta.ownerId).toBe('sam')
	})

	it('treats the teacher’s shape like a locked shape: it cannot be selected or dragged', () => {
		expect(editor.isShapeOrAncestorLocked(ids.teacherBox)).toBe(true)
		expect(editor.isShapeOrAncestorLocked(ids.samBox)).toBe(false)
		editor.setCurrentTool('select').pointerDown(50, 50).pointerMove(150, 150).pointerUp()
		expect(shape(ids.teacherBox).x).toBe(0)
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('moves only their own shapes from a mixed selection', () => {
		editor.select(ids.teacherBox, ids.samBox)
		editor.nudgeShapes(editor.getSelectedShapeIds(), { x: 10, y: 0 })
		expect(shape(ids.samBox).x).toBe(310)
		expect(shape(ids.teacherBox).x).toBe(0)
	})

	it('reverts a whole store operation when one change in it is denied', () => {
		editor.store.put([
			{ ...shape(ids.samBox), x: 999 },
			{ ...shape(ids.teacherBox), x: 999 },
		])
		expect(shape(ids.samBox).x).toBe(300)
		expect(shape(ids.teacherBox).x).toBe(0)
		expect(denied).toEqual(['update'])
	})

	it('checks each store operation in editor.run on its own (limit: run is not one unit)', () => {
		editor.run(() => {
			editor.store.update(ids.samBox, (s) => ({ ...s, x: 999 }))
			editor.store.update(ids.teacherBox, (s) => ({ ...s, x: 999 }))
		})
		expect(shape(ids.samBox).x).toBe(999)
		expect(shape(ids.teacherBox).x).toBe(0)
	})

	it('leaves undo and redo working after a denied operation', () => {
		editor.markHistoryStoppingPoint()
		editor.updateShape({ id: ids.samBox, type: 'geo', x: 400 })
		editor.store.update(ids.teacherBox, (s) => ({ ...s, x: 999 }))
		editor.undo()
		expect(shape(ids.samBox).x).toBe(300)
		expect(shape(ids.teacherBox).x).toBe(0)
		editor.redo()
		expect(shape(ids.samBox).x).toBe(400)
		expect(shape(ids.teacherBox).x).toBe(0)
	})

	it('deletes only their own shapes', () => {
		editor.deleteShapes([ids.teacherBox, ids.samBox])
		expect(editor.getShape(ids.samBox)).toBeUndefined()
		expect(editor.getShape(ids.teacherBox)).toBeDefined()
	})

	it('cannot drop their shape into the teacher’s frame', () => {
		setActor(teacher)
		const frameId = createShapeId('frame')
		editor.createShapes([{ id: frameId, type: 'frame', x: 0, y: 300, props: { w: 400, h: 400 } }])
		setActor(student)
		editor.reparentShapes([ids.samBox], frameId)
		expect(shape(ids.samBox).parentId).toBe(editor.getCurrentPageId())
		expect(denied).toEqual(['update'])
	})

	it('binds their own arrow to the teacher’s shape', () => {
		editor.setCurrentTool('arrow').pointerDown(350, 50).pointerMove(50, 50).pointerUp()
		const arrow = editor.getOnlySelectedShape()!
		expect(arrow.meta.ownerId).toBe('sam')
		const bindings = editor.getBindingsFromShape(arrow, 'arrow')
		expect(bindings.map((b) => b.toId).sort()).toEqual([ids.samBox, ids.teacherBox].sort())
		expect(denied).toEqual([])
	})

	it('asks the same policy for UI', () => {
		const t = shape(ids.teacherBox)
		const s = shape(ids.samBox)
		expect(editor.can({ verb: 'update', prev: t, next: t })).toBe(false)
		expect(editor.can({ verb: 'update', prev: s, next: s })).toBe(true)
		setActor(teacher)
		expect(editor.can({ verb: 'update', prev: s, next: s })).toBe(true)
	})
})

describe('a viewer', () => {
	it('changes nothing with any tool', () => {
		setActor(viewer)
		const before = editor.store.serialize('document')
		editor.setCurrentTool('geo').pointerDown(600, 300).pointerMove(700, 400).pointerUp()
		editor.setCurrentTool('draw').pointerDown(600, 300).pointerMove(700, 400).pointerUp()
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
		expect(editor.store.serialize('document')).toEqual(before)
	})
})

describe('without an actor', () => {
	it('checks nothing, so existing apps see no change', () => {
		editor.setActor(null)
		editor.store.update(ids.teacherBox, (s) => ({ ...s, x: 5 }))
		expect(shape(ids.teacherBox).x).toBe(5)
		expect(editor.isShapeOrAncestorLocked(ids.teacherBox)).toBe(false)
	})
})
