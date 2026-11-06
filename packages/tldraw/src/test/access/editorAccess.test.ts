import { atom } from '@tldraw/editor'
import {
	AccessEntry,
	SessionAccess,
	TL_ACCESS_ROOT,
	TLShapeId,
	accessSchemaRecords,
	createAccessEntry,
	createShapeId,
	createTLAccessModel,
	createUserId,
} from '@tldraw/tlschema'
import { TestEditor } from '../TestEditor'

const model = createTLAccessModel({
	roles: { student: ['viewer', 'comment', 'create'], teacher: ['admin'] },
	entries: [
		{
			resource: TL_ACCESS_ROOT,
			subject: { type: 'relation', relation: 'owner' },
			effect: 'allow',
			verbs: ['update', 'delete'],
		},
	],
})

const onRoot = (verbs: string[]): AccessEntry => ({
	resource: TL_ACCESS_ROOT,
	subject: { type: 'anyone' },
	effect: 'allow',
	verbs,
})

let editor: TestEditor
const session = atom<SessionAccess | null>('session', null)
const tessShape = createShapeId('tess')
const frame = createShapeId('frame')

function as(id: string, verbs: string[]) {
	session.set({ actor: { id }, entries: [onRoot(verbs)] })
}

beforeEach(() => {
	session.set(null)
	editor = new TestEditor({}, { records: accessSchemaRecords, access: { model, session } })
	// the teacher sets up the board
	as('tess', ['teacher'])
	editor.createShapes([
		{ id: tessShape, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
		{ id: frame, type: 'frame', x: 500, y: 0, props: { w: 400, h: 400 } },
	])
	editor.clearHistory()
})

const shapeCount = () => editor.getCurrentPageShapes().length
const denial = async () => {
	await Promise.resolve()
	return editor.access.getLastDenial()
}

it('stamps the owner on create, and keeps it on update', () => {
	expect(editor.getShape(tessShape)!.meta).toEqual({ ownerId: 'tess' })
	editor.updateShape({ id: tessShape, type: 'geo', meta: {} })
	expect(editor.getShape(tessShape)!.meta).toEqual({ ownerId: 'tess' })
})

describe('viewer', () => {
	beforeEach(() => as('vic', ['viewer']))

	it('is readonly, and a write that skips the UI checks is rolled back with a reason', async () => {
		expect(editor.getIsReadonly()).toBe(true)
		editor.store.put([{ ...editor.getShape(tessShape)!, id: createShapeId('sneaky') }])
		expect(shapeCount()).toBe(2)
		expect(await denial()).toMatchObject({ allowed: false, verb: 'create' })
	})

	it('writes its own user record, and no one else’s', async () => {
		const user = (id: string) =>
			({
				id: createUserId(id),
				typeName: 'user',
				name: id,
				color: '',
				imageUrl: '',
				meta: {},
			}) as const
		editor._ensureUserRecord(user('vic'))
		expect(editor.store.get(createUserId('vic'))).toMatchObject({ name: 'vic' })
		editor.store.put([user('tess')])
		expect(editor.store.get(createUserId('tess'))).toBeUndefined()
		expect(await denial()).toMatchObject({ allowed: false, verb: 'user:edit' })
		// the editor checks first, so its user-record reaction does not loop on a denial
		session.set({ actor: { id: null }, entries: [onRoot(['viewer'])] })
		expect(() => editor._ensureUserRecord(user('anon'))).not.toThrow()
		expect(editor.store.get(createUserId('anon'))).toBeUndefined()
	})

	it('a denied operation leaves nothing to undo', () => {
		editor.markHistoryStoppingPoint()
		editor.updateShape({ id: tessShape, type: 'geo', x: 300 })
		expect(editor.getShape(tessShape)!.x).toBe(0)
		editor.undo()
		expect(editor.getShape(tessShape)).toBeDefined()
		expect(editor.getShape(tessShape)!.x).toBe(0)
	})
})

describe('student: creates shapes, edits only their own', () => {
	beforeEach(() => as('bob', ['student']))

	it('is not readonly and can draw', () => {
		expect(editor.getIsReadonly()).toBe(false)
		editor.setCurrentTool('geo').pointerDown(200, 200).pointerMove(260, 260).pointerUp()
		expect(shapeCount()).toBe(3)
		const mine = editor.getOnlySelectedShape()!
		expect(mine.meta).toEqual({ ownerId: 'bob' })
		editor.updateShape({ id: mine.id, type: 'geo', x: 250 })
		expect(editor.getShape(mine.id)!.x).toBe(250)
	})

	it("treats the teacher's shapes as locked: no select, no drag", () => {
		expect(editor.isShapeOrAncestorLocked(tessShape)).toBe(true)
		editor.setCurrentTool('select').pointerDown(50, 50).pointerMove(150, 150).pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
		expect(editor.getShape(tessShape)!.x).toBe(0)
	})

	it('rolls back a whole operation that touches one shape it may not edit', () => {
		editor.createShape({ id: createShapeId('mine'), type: 'geo', x: 200, y: 200 })
		const before = shapeCount()
		editor.run(() => editor.deleteShapes([createShapeId('mine'), tessShape]), {
			ignoreShapeLock: true,
		})
		expect(shapeCount()).toBe(before)
		expect(editor.getShape(createShapeId('mine'))).toBeDefined()
	})
})

describe('area: a viewer who may edit inside one frame', () => {
	beforeEach(() => {
		// no "owners edit their own" entry here: access comes from the frame only
		session.set(null) // the editor creates its first page and document before any session
		editor = new TestEditor(
			{},
			{ records: accessSchemaRecords, access: { model: createTLAccessModel(), session } }
		)
		as('tess', ['admin'])
		editor.createShapes([
			{ id: tessShape, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: frame, type: 'frame', x: 500, y: 0, props: { w: 400, h: 400 } },
		])
		editor.store.put([
			createAccessEntry({
				resource: frame,
				subject: { type: 'user', id: 'ann' },
				effect: 'allow',
				verbs: ['editor'],
			}) as any, // custom record types are not part of TLRecord
		])
		as('ann', ['viewer'])
	})

	it('has tools, draws inside the frame, and cannot draw outside it', async () => {
		expect(editor.getIsReadonly()).toBe(false)
		editor.setCurrentTool('geo').pointerDown(600, 100).pointerMove(700, 200).pointerUp()
		const inFrame = editor.getCurrentPageShapes().find((s) => s.parentId === frame)
		expect(inFrame).toBeDefined()

		editor.setCurrentTool('geo').pointerDown(100, 300).pointerMove(200, 400).pointerUp()
		expect(editor.getCurrentPageShapes().filter((s) => s.parentId !== frame)).toHaveLength(2)
		expect(await denial()).toMatchObject({ verb: 'create' })
	})

	it('cannot drag its shape out of the frame', () => {
		const id: TLShapeId = createShapeId('ann')
		editor.createShape({ id, type: 'geo', parentId: frame, x: 50, y: 50 })
		editor.reparentShapes([id], editor.getCurrentPageId())
		expect(editor.getShape(id)!.parentId).toBe(frame)
	})
})

it('with no model, nothing changes', () => {
	const plain = new TestEditor()
	plain.createShape({ type: 'geo', x: 0, y: 0 })
	expect(plain.getCurrentPageShapes()).toHaveLength(1)
	expect(plain.access.can('anything')).toBe(true)
})

describe('arrows across owners', () => {
	it("a student can move their own shape when the teacher's arrow is bound to it", () => {
		as('bob', ['student'])
		const mine = createShapeId('mine')
		editor.createShape({ id: mine, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } })
		as('tess', ['teacher'])
		editor.setCurrentTool('arrow').pointerDown(50, 50).pointerMove(350, 350).pointerUp()
		const arrow = editor.getOnlySelectedShape()!
		expect(editor.getBindingsFromShape(arrow, 'arrow')).toHaveLength(2)
		const arrowBefore = editor.getShape(arrow.id)

		as('bob', ['student'])
		editor.updateShape({ id: mine, type: 'geo', x: 400 })
		// the bound arrow's record does not change when its target moves, so nothing is denied
		expect(editor.getShape(mine)!.x).toBe(400)
		expect(editor.getShape(arrow.id)).toEqual(arrowBefore)
	})
	it('a student can delete their own shape: the binding goes with it, the arrow stays', () => {
		as('bob', ['student'])
		const mine = createShapeId('mine')
		editor.createShape({ id: mine, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } })
		as('tess', ['teacher'])
		editor.setCurrentTool('arrow').pointerDown(50, 50).pointerMove(350, 350).pointerUp()
		const arrow = editor.getOnlySelectedShape()!
		const arrowBefore = editor.getShape(arrow.id)

		as('bob', ['student'])
		editor.deleteShapes([mine])
		expect(editor.getShape(mine)).toBeUndefined()
		expect(editor.getBindingsFromShape(arrow, 'arrow')).toHaveLength(1)
		expect(editor.getShape(arrow.id)).toEqual(arrowBefore)
	})

	it('a student can move their own shape into a frame under the teacher’s arrow', () => {
		as('bob', ['student'])
		const mine = createShapeId('mine')
		editor.createShape({ id: mine, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } })
		as('tess', ['teacher'])
		editor.setCurrentTool('arrow').pointerDown(50, 50).pointerMove(350, 350).pointerUp()
		// a frame bob may edit in
		editor.store.put([
			createAccessEntry({
				resource: frame,
				subject: { type: 'user', id: 'bob' },
				effect: 'allow',
				verbs: ['editor'],
			}) as any,
		])
		as('bob', ['student'])
		editor.reparentShapes([mine], frame)
		expect(editor.getShape(mine)!.parentId).toBe(frame)
	})
})
