import {
	checkRecordWrite,
	registerRecordRules,
	TLSocketRoom,
	TLSyncErrorCloseEventReason,
} from '@tldraw/sync-core'
import {
	createShapeId,
	createTLSchema,
	PageRecordType,
	TLPage,
	TLPageId,
	JsonObject,
	TLGeoShape,
	TLShapeId,
	TLShapePartial,
	atom,
	commentSchemaRecords,
	createCommentThread,
	createComment,
	toRichText,
	createTLStore,
	defaultBindingUtils,
	defaultShapeTools,
	defaultShapeUtils,
	defaultTools,
	Editor,
	TLEditorOptions,
	TLStoreOptions,
} from 'tldraw'
import {
	accessForRole,
	ClassroomMeta,
	ClassroomRecord,
	classroomRules,
	isPageReadonlyFor,
	Role,
} from './classroomRules'
import { connectStore } from './inMemorySync'

// Full-stack backtests of the use cases: a real TLSocketRoom with the classroom rules, and one
// editor per person, each connected to the room and running the same rules on its store.

vi.useRealTimers()

function makeEditor(options: Partial<TLEditorOptions>, storeOptions: Partial<TLStoreOptions>) {
	const editor = new Editor({
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [...defaultTools, ...defaultShapeTools],
		store: createTLStore({
			shapeUtils: defaultShapeUtils,
			bindingUtils: defaultBindingUtils,
			...(storeOptions as any),
		}),
		getContainer: () => document.body,
		...options,
	})
	return editor
}

const OBJECT_TYPES = ['comment-thread', 'comment', 'comment-reaction']
const settle = () => new Promise((r) => setTimeout(r, 120))

let room: TLSocketRoom<ClassroomRecord, ClassroomMeta>
let access: Record<string, ClassroomMeta>
interface User {
	userId: string
	editor: Editor
	conn: ReturnType<typeof connectStore<ClassroomMeta>>
}
let users: User[]

function join(userId: string, role: Role, extra: Partial<ClassroomMeta> = {}): User {
	access[userId] = { userId, role, ...extra }
	const mode = atom<'readonly' | 'readwrite'>('mode', 'readwrite')
	// eslint-disable-next-line prefer-const
	let conn: ReturnType<typeof connectStore<ClassroomMeta>>
	const session = () => conn?.socket.session.get() ?? null
	const editor = makeEditor(
		{
			// the lock and the read-only page come from the same rules as the server
			isShapeLocked: (shape, editor) => {
				const s = session()
				if (!s) return true
				const get = (id: string) => editor.store.get(id as any) as ClassroomRecord | undefined
				return !checkRecordWrite(classroomRules, s, get, {
					type: 'update',
					prev: shape,
					next: shape,
				})
			},
			isPageReadonly: (page) => {
				const s = session()
				return !s || isPageReadonlyFor(s.meta, page)
			},
		},
		{ records: commentSchemaRecords, collaboration: { status: null, mode } }
	)
	registerRecordRules(editor.store as any, classroomRules, () => session()!)
	conn = connectStore<ClassroomMeta>({
		room,
		store: editor.store,
		sessionId: userId,
		getAccess: () => ({ meta: access[userId], ...accessForRole(access[userId].role) }),
		onAfterConnect: ({ isReadonly }) => mode.set(isReadonly ? 'readonly' : 'readwrite'),
	})
	const user = { userId, editor, conn }
	users.push(user)
	return user
}

/** Write straight to the store with side effects off, so neither the editor nor the client rules
 *  stop it. This is what a modified client could send; only the server can stop it. */
function forcePut(editor: Editor, records: any[]) {
	editor.store.sideEffects.setIsEnabled(false)
	editor.store.put(records)
	editor.store.sideEffects.setIsEnabled(true)
}

/** A record as the server holds it. */
const shapeInRoom = (id: string) => room.getRecord(id) as any

const page1 = PageRecordType.createId('page1')
const page2 = PageRecordType.createId('page2')

beforeEach(async () => {
	access = {}
	users = []
	room = new TLSocketRoom<ClassroomRecord, ClassroomMeta>({
		schema: createTLSchema({ records: commentSchemaRecords }) as any,
		objectTypes: OBJECT_TYPES,
		...classroomRules,
	})
	// the teacher sets up the board
	const teacher = join('teacher', 'teacher')
	await settle()
	teacher.editor.createPage({ id: page1, name: 'Lesson' })
	teacher.editor.createPage({ id: page2, name: 'Answers' })
	teacher.editor.setCurrentPage(page1)
	for (const p of teacher.editor.getPages()) {
		if (p.id !== page1 && p.id !== page2) teacher.editor.deletePage(p.id)
	}
	await settle()
})

afterEach(() => {
	for (const u of users) {
		u.conn.client.close()
		u.conn.socket.close()
		u.editor.dispose()
	}
	room.close()
})

function geo(id: TLShapeId, x = 0, meta: JsonObject = {}): TLShapePartial<TLGeoShape> {
	return { id, type: 'geo', x, y: 0, props: { w: 100, h: 100 }, meta }
}

describe('file read and write control', () => {
	it('refuses a person with no access to the file', async () => {
		const mallory = join('mallory', 'viewer')
		await settle()
		room.closeSession('mallory', TLSyncErrorCloseEventReason.FORBIDDEN)
		await settle()
		expect(mallory.conn.errors).toEqual([TLSyncErrorCloseEventReason.FORBIDDEN])
	})

	it('makes a viewer read-only, and the server rejects writes that skip the editor', async () => {
		const teacher = users[0]
		const victor = join('victor', 'viewer')
		await settle()
		expect(victor.editor.getIsReadonly()).toBe(true)
		expect(victor.editor.getPages().map((p: TLPage) => p.id)).toEqual([page1, page2])

		victor.editor.createShape(geo(createShapeId('v1')))
		expect(victor.editor.getCurrentPageShapes()).toHaveLength(0)

		forcePut(victor.editor, [{ ...victor.editor.getPage(page1)!, name: 'hacked' }])
		await settle()
		expect(teacher.editor.getPage(page1)!.name).toBe('Lesson')
		// the server's rebase undoes the forced write on the viewer too
		expect(victor.editor.getPage(page1)!.name).toBe('Lesson')
	})
})

describe('page read control', () => {
	it('does not send a private page or its shapes, and follows changes live', async () => {
		const teacher = users[0]
		teacher.editor.setCurrentPage(page2)
		teacher.editor.createShape(geo(createShapeId('answer')))
		teacher.editor.updatePage({ id: page2, meta: { private: true } })
		teacher.editor.setCurrentPage(page1)
		await settle()

		const alice = join('alice', 'student')
		await settle()
		expect(alice.editor.getPages().map((p: TLPage) => p.id)).toEqual([page1])
		expect(alice.editor.store.get(createShapeId('answer'))).toBeUndefined()

		// reveal: no reconnect, the page and its shapes arrive
		teacher.editor.updatePage({ id: page2, meta: { private: false } })
		await settle()
		expect(alice.editor.getPages().map((p: TLPage) => p.id)).toEqual([page1, page2])
		expect(alice.editor.store.get(createShapeId('answer'))).toBeDefined()

		// hide again while alice looks at it: the page and its shapes go, the editor moves on
		alice.editor.setCurrentPage(page2)
		teacher.editor.updatePage({ id: page2, meta: { private: true } })
		await settle()
		expect(alice.editor.getPages().map((p: TLPage) => p.id)).toEqual([page1])
		expect(alice.editor.store.get(createShapeId('answer'))).toBeUndefined()
		expect(alice.editor.getCurrentPageId()).toBe(page1)
	})

	it('rejects writes to records that the session may not read', async () => {
		const teacher = users[0]
		teacher.editor.updatePage({ id: page2, meta: { private: true } })
		await settle()
		const alice = join('alice', 'student')
		await settle()
		// alice guesses the id of the private page and puts a shape on it
		forcePut(alice.editor, [
			{
				...alice.editor.store.get(createShapeId('x')),
				...geo(createShapeId('x')),
				typeName: 'shape',
				parentId: page2,
				index: 'a1',
				rotation: 0,
				isLocked: false,
				opacity: 1,
				meta: {},
				props: { ...(teacher.editor.getShapeUtil('geo').getDefaultProps() as any), w: 1, h: 1 },
			},
		])
		await settle()
		expect(shapeInRoom(createShapeId('x'))).toBeUndefined()
	})
})

describe('page write control', () => {
	it('makes a read-only page read-only in the student editor, and on the server', async () => {
		const teacher = users[0]
		teacher.editor.createShape(geo(createShapeId('t1')))
		teacher.editor.updatePage({ id: page1, meta: { readonly: true } })
		await settle()
		const alice = join('alice', 'student')
		await settle()
		alice.editor.setCurrentPage(page1)
		expect(alice.editor.getIsReadonly()).toBe(true)
		alice.editor.setCurrentPage(page2)
		expect(alice.editor.getIsReadonly()).toBe(false)

		// students may not rename or delete pages, from the editor or not
		alice.editor.updatePage({ id: page2, name: 'mine' })
		expect(alice.editor.getPage(page2)!.name).toBe('Answers')
		forcePut(alice.editor, [{ ...alice.editor.getPage(page2)!, name: 'mine' }])
		await settle()
		expect(teacher.editor.getPage(page2)!.name).toBe('Answers')
	})
})

describe('shape write control: students edit only their own shapes', () => {
	it('stamps the owner, locks other shapes, and rejects forced writes', async () => {
		const teacher = users[0]
		const alice = join('alice', 'student')
		const bob = join('bob', 'student')
		await settle()

		alice.editor.createShape(geo(createShapeId('a1'), 0, { ownerId: 'bob' }))
		await settle()
		// the client stamps the owner from the session, and the server does it again
		expect(shapeInRoom(createShapeId('a1'))!.meta).toEqual({ ownerId: 'alice' })

		const a1 = bob.editor.getShape(createShapeId('a1'))!
		expect(bob.editor.isShapeLocked(a1)).toBe(true)
		expect(alice.editor.isShapeLocked(a1)).toBe(false)
		expect(teacher.editor.isShapeLocked(a1)).toBe(false)

		// the editor drops writes to a locked shape
		bob.editor.updateShape({ id: a1.id, type: 'geo', x: 500 })
		bob.editor.deleteShapes([a1.id])
		expect(bob.editor.getShape(a1.id)!.x).toBe(0)

		// the client rules drop writes that skip the lock
		bob.editor.store.put([{ ...a1, x: 500 }])
		expect(bob.editor.getShape(a1.id)!.x).toBe(0)

		// the server drops writes that skip the client too
		forcePut(bob.editor, [{ ...a1, x: 500 }])
		await settle()
		expect(shapeInRoom(a1.id)!.x).toBe(0)
		expect(bob.editor.getShape(a1.id)!.x).toBe(0)

		// the teacher may edit anything
		teacher.editor.updateShape({ id: a1.id, type: 'geo', x: 200 })
		await settle()
		expect(alice.editor.getShape(a1.id)!.x).toBe(200)
	})

	it('leaves a locked shape out of select all', async () => {
		const alice = join('alice', 'student')
		const bob = join('bob', 'student')
		await settle()
		alice.editor.createShape(geo(createShapeId('a1')))
		bob.editor.createShape(geo(createShapeId('b1'), 300))
		await settle()
		bob.editor.selectAll()
		expect(bob.editor.getSelectedShapeIds()).toEqual([createShapeId('b1')])
	})

	it('limits students to some shape types', async () => {
		const alice = join('alice', 'student')
		await settle()
		alice.editor.createShape({ id: createShapeId('f'), type: 'frame', x: 0, y: 0 })
		expect(alice.editor.getShape(createShapeId('f'))).toBeUndefined()
	})

	it('keeps a push that is partly allowed partly applied (known limit)', async () => {
		const teacher = users[0]
		teacher.editor.createShape(geo(createShapeId('t1')))
		const alice = join('alice', 'student')
		await settle()
		alice.editor.createShape(geo(createShapeId('a1')))
		await settle()
		const t1 = alice.editor.getShape(createShapeId('t1'))!
		const a1 = alice.editor.getShape(createShapeId('a1'))!
		// one push, two records: the server checks each record alone
		forcePut(alice.editor, [
			{ ...t1, x: 300 },
			{ ...a1, x: 300 },
		])
		await settle()
		expect(shapeInRoom(t1.id)!.x).toBe(0)
		expect(shapeInRoom(a1.id)!.x).toBe(300)
	})
})

describe('agents limited to an area', () => {
	it('writes only inside its frame, and cannot move a shape out of it', async () => {
		const teacher = users[0]
		const area = createShapeId('area')
		teacher.editor.createShape({ id: area, type: 'frame', x: 0, y: 0, props: { w: 500, h: 500 } })
		await settle()
		const agent = join('agent', 'agent', { areaId: area })
		await settle()

		agent.editor.createShape({ ...geo(createShapeId('in')), parentId: area })
		agent.editor.createShape(geo(createShapeId('out'), 2000))
		await settle()
		expect(shapeInRoom(createShapeId('in'))).toBeDefined()
		expect(shapeInRoom(createShapeId('out'))).toBeUndefined()

		// move out of the frame: allowed by `prev`, denied by `next`
		agent.editor.reparentShapes([createShapeId('in')], page1)
		await settle()
		expect(shapeInRoom(createShapeId('in'))!.parentId).toBe(area)
		// the agent cannot touch the frame itself
		expect(agent.editor.isShapeLocked(area)).toBe(true)
	})
})

describe('comments', () => {
	function startThread(editor: Editor, userId: string, pageId: TLPageId) {
		const thread = createCommentThread({
			pageId,
			anchor: { type: 'page' } as any,
			createdBy: userId,
			now: 1,
		})
		const comment = createComment({
			threadId: thread.id,
			pageId,
			authorId: userId,
			body: toRichText('hi'),
			now: 1,
		})
		editor.store.put([thread, comment] as any)
		return { thread, comment }
	}

	it('lets a commenter link comment on a read-only canvas, but not a viewer link', async () => {
		const carol = join('carol', 'commenter')
		const victor = join('victor', 'viewer')
		await settle()
		expect(carol.editor.getIsReadonly()).toBe(true)

		const ok = startThread(carol.editor, 'carol', page1)
		const denied = startThread(victor.editor, 'victor', page1)
		await settle()
		expect(shapeInRoom(ok.comment.id)).toBeDefined()
		expect(shapeInRoom(denied.comment.id)).toBeUndefined()
	})

	it('adds own comments, and only the teacher manages any', async () => {
		const teacher = users[0]
		const carol = join('carol', 'commenter')
		const alice = join('alice', 'student')
		await settle()
		const { comment } = startThread(carol.editor, 'carol', page1)
		await settle()

		const fromRoom = () => shapeInRoom(comment.id) as any
		// alice may not delete carol's comment: the client rules stop it first
		alice.editor.store.put([{ ...fromRoom(), isDeleted: true }])
		expect((alice.editor.store.get(comment.id as any) as any).isDeleted).toBe(false)
		// the teacher may take it down, but not edit it
		teacher.editor.store.put([{ ...fromRoom(), body: toRichText('edited') }])
		await settle()
		expect(fromRoom().body).toEqual(toRichText('hi'))
		teacher.editor.store.put([{ ...fromRoom(), isDeleted: true }])
		await settle()
		expect(fromRoom().isDeleted).toBe(true)
	})

	it('hides comments on a private page', async () => {
		const teacher = users[0]
		teacher.editor.updatePage({ id: page2, meta: { private: true } })
		const { comment } = startThread(teacher.editor, 'teacher', page2)
		await settle()
		const alice = join('alice', 'student')
		await settle()
		expect(alice.editor.store.get(comment.id as any)).toBeUndefined()
	})
})

describe('live access changes', () => {
	it('promotes a student by closing the session; the client reconnects with new access', async () => {
		const teacher = users[0]
		teacher.editor.createShape(geo(createShapeId('t1')))
		const bob = join('bob', 'student')
		await settle()
		expect(bob.editor.isShapeLocked(createShapeId('t1'))).toBe(true)

		access.bob = { userId: 'bob', role: 'teacher' }
		room.closeSession('bob')
		await settle()
		await settle()
		expect(bob.editor.isShapeLocked(createShapeId('t1'))).toBe(false)
		bob.editor.updateShape({ id: createShapeId('t1'), type: 'geo', x: 50 })
		await settle()
		expect(shapeInRoom(createShapeId('t1'))!.x).toBe(50)
	})
})

describe('follow-up writes after a remote change', () => {
	it('a student does not push group cleanup for shapes it may not write, and still converges', async () => {
		const teacher = users[0]
		const ids = [createShapeId('g1'), createShapeId('g2')]
		teacher.editor.createShapes([geo(ids[0]), geo(ids[1], 200)])
		teacher.editor.groupShapes(ids)
		const groupId = teacher.editor.getShape(ids[0])!.parentId
		const alice = join('alice', 'student')
		await settle()
		teacher.editor.deleteShapes([ids[1]])
		await settle()
		await settle()
		// the teacher's own cleanup removes the group; alice's copy of that cleanup was not allowed
		expect(shapeInRoom(groupId)).toBeUndefined()
		expect(alice.editor.store.get(groupId)).toBeUndefined()
		expect(alice.editor.getShape(ids[0])!.parentId).toBe(page1)
	})
})
