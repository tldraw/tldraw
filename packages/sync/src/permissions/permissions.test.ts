import {
	checkRecordWrite,
	registerRecordRules,
	TLSocketRoom,
	TLSyncErrorCloseEventReason,
} from '@tldraw/sync-core'
import {
	AssetRecordType,
	createBindingId,
	createShapeId,
	createTLSchema,
	TLBindingId,
	PageRecordType,
	TLPage,
	TLPageId,
	JsonObject,
	TLGeoShape,
	TLShapeId,
	TLShapePartial,
	atom,
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
	classroomRecords,
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
		{ records: classroomRecords, collaboration: { status: null, mode } }
	)
	registerRecordRules(editor.store as any, classroomRules, () => session()!)
	conn = connectStore<ClassroomMeta>({
		room,
		store: editor.store,
		sessionId: userId,
		getAccess: () => {
			const granted = accessForRole(access[userId].role)
			return granted && { meta: access[userId], ...granted }
		},
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
		schema: createTLSchema({ records: classroomRecords }) as any,
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
	it('refuses at connect a person with no access to the file', async () => {
		const nobody = join('nobody', 'none')
		await settle()
		expect(nobody.conn.errors).toEqual([TLSyncErrorCloseEventReason.FORBIDDEN])
		// the editor has only its own local default page; nothing came from the room
		expect(nobody.editor.getPage(page1)).toBeUndefined()
	})

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

	it('rejects a whole push when a rule denies one of its records', async () => {
		const teacher = users[0]
		teacher.editor.createShape(geo(createShapeId('t1')))
		const alice = join('alice', 'student')
		await settle()
		alice.editor.createShape(geo(createShapeId('a1')))
		await settle()
		const t1 = alice.editor.getShape(createShapeId('t1'))!
		const a1 = alice.editor.getShape(createShapeId('a1'))!
		// one push, two records: one denied, so neither is kept
		forcePut(alice.editor, [
			{ ...t1, x: 300 },
			{ ...a1, x: 300 },
		])
		await settle()
		expect(shapeInRoom(t1.id)!.x).toBe(0)
		expect(shapeInRoom(a1.id)!.x).toBe(0)
		// and the client is put back to the room's state
		expect(alice.editor.getShape(a1.id)!.x).toBe(0)
		expect(alice.editor.getShape(t1.id)!.x).toBe(0)
	})
})

describe('bindings follow their shapes', () => {
	function arrow(id: TLShapeId): TLShapePartial {
		return { id, type: 'arrow', x: 0, y: 0 }
	}
	// every binding id that a test makes, to look each one up in the room
	const bindingIds: TLBindingId[] = []
	function bind(editor: Editor, fromId: TLShapeId, toId: TLShapeId) {
		const id = createBindingId()
		bindingIds.push(id)
		editor.createBinding({
			id,
			type: 'arrow',
			fromId,
			toId,
			props: {
				terminal: 'end',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: false,
				snap: 'none',
			},
		})
	}
	const bindingsInRoom = () => bindingIds.map((id) => room.getRecord(id)).filter(Boolean)

	it('hides the bindings of a private page', async () => {
		const teacher = users[0]
		teacher.editor.setCurrentPage(page2)
		teacher.editor.createShapes([geo(createShapeId('box')), arrow(createShapeId('arrow'))])
		bind(teacher.editor, createShapeId('arrow'), createShapeId('box'))
		teacher.editor.updatePage({ id: page2, meta: { private: true } })
		teacher.editor.setCurrentPage(page1)
		await settle()
		expect(bindingsInRoom()).toHaveLength(1)

		const alice = join('alice', 'student')
		await settle()
		expect(alice.editor.store.query.records('binding').get()).toEqual([])

		// reveal: the binding arrives with its shapes
		teacher.editor.updatePage({ id: page2, meta: { private: false } })
		await settle()
		expect(alice.editor.store.query.records('binding').get()).toHaveLength(1)
	})

	it('lets a student bind its own arrow, but not rebind the teacher arrow', async () => {
		const teacher = users[0]
		teacher.editor.createShapes([geo(createShapeId('t-box')), arrow(createShapeId('t-arrow'))])
		const alice = join('alice', 'student')
		await settle()
		alice.editor.createShapes([geo(createShapeId('a-box'), 300), arrow(createShapeId('a-arrow'))])
		await settle()

		// own arrow to the teacher's box: allowed, the box does not change
		bind(alice.editor, createShapeId('a-arrow'), createShapeId('t-box'))
		// the teacher's arrow to alice's box: the arrow is not hers
		bind(alice.editor, createShapeId('t-arrow'), createShapeId('a-box'))
		await settle()
		expect(bindingsInRoom().map((b: any) => b.fromId)).toEqual([createShapeId('a-arrow')])

		// forced past the client rules, the server rejects it too
		const forged = {
			...alice.editor.store.query.records('binding').get()[0],
			id: bindingIds[bindingIds.push(createBindingId()) - 1],
			fromId: createShapeId('t-arrow'),
			toId: createShapeId('a-box'),
		}
		forcePut(alice.editor, [forged])
		await settle()
		expect(bindingsInRoom()).toHaveLength(1)
	})

	it('lets a student delete its own shape that the teacher arrow points to', async () => {
		const teacher = users[0]
		teacher.editor.createShape(arrow(createShapeId('t-arrow')))
		const alice = join('alice', 'student')
		await settle()
		alice.editor.createShape(geo(createShapeId('a-box'), 300))
		await settle()
		bind(teacher.editor, createShapeId('t-arrow'), createShapeId('a-box'))
		await settle()
		expect(bindingsInRoom()).toHaveLength(1)

		alice.editor.deleteShapes([createShapeId('a-box')])
		await settle()
		expect(shapeInRoom(createShapeId('a-box'))).toBeUndefined()
		expect(bindingsInRoom()).toEqual([])
		expect(shapeInRoom(createShapeId('t-arrow'))).toBeDefined()
	})
})

describe('rules for every document type', () => {
	it('stops a student from changing a shape into another type', async () => {
		const alice = join('alice', 'student')
		await settle()
		const id = createShapeId('a1')
		alice.editor.createShape(geo(id))
		await settle()
		const shape = alice.editor.getShape(id)!
		const asFrame = { ...shape, type: 'frame', props: { w: 100, h: 100, name: '', color: 'black' } }
		alice.editor.store.put([asFrame as any])
		forcePut(alice.editor, [asFrame])
		await settle()
		expect(shapeInRoom(id).type).toBe('geo')
	})

	it('lets only the teacher change the document, and the owner change an asset', async () => {
		const teacher = users[0]
		const alice = join('alice', 'student')
		await settle()
		alice.editor.updateDocumentSettings({ name: 'hacked' })
		forcePut(alice.editor, [{ ...alice.editor.getDocumentSettings(), name: 'hacked' }])
		await settle()
		expect(room.getRecord('document:document')!).toMatchObject({ name: '' })
		teacher.editor.updateDocumentSettings({ name: 'Geometry' })
		await settle()
		expect(room.getRecord('document:document')!).toMatchObject({ name: 'Geometry' })

		const asset = AssetRecordType.create({
			id: AssetRecordType.createId('img'),
			type: 'image',
			props: {
				src: 'https://example.com/a.png',
				w: 10,
				h: 10,
				name: 'a',
				isAnimated: false,
				mimeType: 'image/png',
			},
		})
		teacher.editor.createAssets([asset])
		await settle()
		const stored = () => room.getRecord(asset.id) as any
		expect(stored().meta.ownerId).toBe('teacher')
		forcePut(alice.editor, [
			{ ...stored(), props: { ...stored().props, src: 'https://evil.example/x.png' } },
		])
		alice.editor.deleteAssets([asset.id])
		await settle()
		expect(stored().props.src).toBe('https://example.com/a.png')
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

		// its own note inside the frame is not locked by the frame's lock
		expect(agent.editor.isShapeOrAncestorLocked(createShapeId('in'))).toBe(false)
		agent.editor.updateShape({ id: createShapeId('in'), type: 'geo', x: 30 })
		await settle()
		expect(shapeInRoom(createShapeId('in'))!.x).toBe(30)

		// move out of the frame: allowed by `prev`, denied by `next`. The editor does not stop it,
		// so this is the client rule; forced, it is the server rule.
		agent.editor.reparentShapes([createShapeId('in')], page1)
		await settle()
		expect(shapeInRoom(createShapeId('in'))!.parentId).toBe(area)
		forcePut(agent.editor, [{ ...agent.editor.getShape(createShapeId('in'))!, parentId: page1 }])
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

describe('plugin types and actions', () => {
	const grade = (studentId: string, score: string) =>
		({ id: `grade:${studentId}`, typeName: 'grade', studentId, score }) as any

	it('applies read and write rules to a custom record type by its typeName', async () => {
		const teacher = users[0]
		const alice = join('alice', 'student')
		const bob = join('bob', 'student')
		await settle()
		teacher.editor.store.put([grade('alice', 'A'), grade('bob', 'B')])
		await settle()
		// each student receives only their own grade
		expect(alice.editor.store.get('grade:alice' as any)).toEqual(grade('alice', 'A'))
		expect(alice.editor.store.get('grade:bob' as any)).toBeUndefined()
		expect(bob.editor.store.get('grade:alice' as any)).toBeUndefined()

		// only the teacher writes grades: the client rules stop alice, and so does the server
		alice.editor.store.put([grade('alice', 'A+')])
		expect((alice.editor.store.get('grade:alice' as any) as any).score).toBe('A')
		forcePut(alice.editor, [grade('alice', 'A+')])
		await settle()
		expect(shapeInRoom('grade:alice').score).toBe('A')
		expect((alice.editor.store.get('grade:alice' as any) as any).score).toBe('A')
	})

	it('applies shape rules to a custom shape type by its type', () => {
		// the test editors have no stamp shape util, so this checks the shared rule directly
		const stamp = {
			...(users[0].editor.getShapeUtil('geo').getDefaultProps() as any),
		}
		const shape = {
			id: createShapeId('stamp'),
			typeName: 'shape',
			type: 'stamp',
			parentId: page1,
			index: 'a1',
			x: 0,
			y: 0,
			rotation: 0,
			isLocked: false,
			opacity: 1,
			meta: {},
			props: stamp,
		} as any
		const get = (id: string) => users[0].editor.store.get(id as any) as any
		const write = { type: 'create', prev: null, next: shape } as const
		const as = (role: Role) => ({
			sessionId: role,
			isReadonly: false,
			meta: { userId: role, role },
		})
		expect(checkRecordWrite(classroomRules, as('student'), get, write)).toBeNull()
		expect(checkRecordWrite(classroomRules, as('agent'), get, write)).toBeNull()
		expect(checkRecordWrite(classroomRules, as('teacher'), get, write)).toMatchObject({
			type: 'stamp',
			meta: { ownerId: 'teacher' },
		})
	})

	it('backs the lock action with a rule: only the teacher locks or unlocks', async () => {
		const teacher = users[0]
		const alice = join('alice', 'student')
		await settle()
		alice.editor.createShape(geo(createShapeId('a1')))
		await settle()
		const id = createShapeId('a1')

		alice.editor.toggleLock([id])
		expect(alice.editor.getShape(id)!.isLocked).toBe(false)
		forcePut(alice.editor, [{ ...alice.editor.getShape(id)!, isLocked: true }])
		await settle()
		expect(shapeInRoom(id).isLocked).toBe(false)

		teacher.editor.toggleLock([id])
		await settle()
		expect(shapeInRoom(id).isLocked).toBe(true)
		expect(alice.editor.getShape(id)!.isLocked).toBe(true)
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

describe('undo after access changes', () => {
	it('cancels an undo that the rules now deny; the undo step is used up (known limit)', async () => {
		const teacher = users[0]
		const alice = join('alice', 'student')
		await settle()
		const id = createShapeId('a1')
		alice.editor.createShape(geo(id))
		alice.editor.markHistoryStoppingPoint()
		alice.editor.updateShape({ id, type: 'geo', x: 200 })
		await settle()
		expect(shapeInRoom(id).x).toBe(200)

		teacher.editor.updatePage({ id: page1, meta: { readonly: true } })
		await settle()
		// the UI turns undo off on a read-only page, as for any read-only editor
		expect(alice.editor.getIsReadonly()).toBe(true)
		// called anyway, the rules cancel the undo, and room and client stay in step
		alice.editor.undo()
		await settle()
		expect(alice.editor.getShape(id)!.x).toBe(200)
		expect(shapeInRoom(id).x).toBe(200)

		// the canceled step is used up: the next undo goes to the step before it
		teacher.editor.updatePage({ id: page1, meta: { readonly: false } })
		await settle()
		alice.editor.undo()
		await settle()
		expect(shapeInRoom(id)).toBeUndefined()
	})
})
