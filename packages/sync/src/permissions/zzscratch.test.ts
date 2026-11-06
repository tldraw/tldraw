import {
	checkRecordWrite,
	registerRecordRules,
	TLSocketRoom,
	TLSyncErrorCloseEventReason,
} from '@tldraw/sync-core'
import {
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
const log = (...a: any[]) => (globalThis as any).process.stderr.write('\n@@ ' + JSON.stringify(a) + '\n')

describe('scratch', () => {
	it('T1: student changes own shape type to a forbidden type', async () => {
		const alice = join('alice', 'student')
		await settle()
		const id = createShapeId('a1')
		alice.editor.createShape(geo(id))
		await settle()
		const s = alice.editor.getShape(id)! as any
		const frameProps = alice.editor.getShapeUtil('frame').getDefaultProps()
		const embedProps = { ...(alice.editor.getShapeUtil('embed').getDefaultProps() as any), url: 'https://example.com' }
		// through the client store (rules registered)
		alice.editor.store.put([{ ...s, type: 'frame', props: frameProps }])
		await settle()
		log('T1 client-store put', shapeInRoom(id)?.type, alice.editor.getShape(id)?.type)
		// forced
		const s2 = alice.editor.getShape(id)! as any
		forcePut(alice.editor, [{ ...s2, type: 'embed', props: embedProps }])
		await settle()
		log('T1 forced', shapeInRoom(id)?.type)
	})

	it('T2: student groups own shapes', async () => {
		const alice = join('alice', 'student')
		await settle()
		const ids = [createShapeId('a1'), createShapeId('a2')]
		alice.editor.createShapes([geo(ids[0]), geo(ids[1], 200)])
		await settle()
		let err: any
		try {
			alice.editor.groupShapes(ids)
		} catch (e) {
			err = e
		}
		await settle()
		log('T2', err?.message, ids.map((id) => alice.editor.getShape(id)?.parentId), ids.map((id) => shapeInRoom(id)?.parentId))
		const teacher = users[0]
		log('T2 teacher sees', ids.map((id) => teacher.editor.getShape(id)?.parentId))
	})

	it('T3: student draws into the teacher frame', async () => {
		const teacher = users[0]
		const f = createShapeId('f')
		teacher.editor.createShape({ id: f, type: 'frame', x: 0, y: 0, props: { w: 500, h: 500 } })
		const alice = join('alice', 'student')
		await settle()
		alice.editor.createShape(geo(createShapeId('a1'), 100))
		await settle()
		log('T3 parent via position', alice.editor.getShape(createShapeId('a1'))?.parentId)
		alice.editor.createShape({ ...geo(createShapeId('a2'), 100), parentId: f })
		await settle()
		log('T3 explicit parent in room', shapeInRoom(createShapeId('a2'))?.parentId)
	})

	it('T4: student on read-only page: comment tool readonlyOk only for commenter; createComment allowed?', async () => {
		const teacher = users[0]
		teacher.editor.updatePage({ id: page1, meta: { readonly: true } })
		const alice = join('alice', 'student')
		await settle()
		const thread = createCommentThread({ pageId: page1, anchor: { type: 'point', x: 0, y: 0 }, createdBy: 'alice' } as any)
		alice.editor.store.put([thread as any])
		await settle()
		log('T4 thread in room', !!room.getRecord(thread.id))
	})

	it('T5: student moves own shape onto read-only page via moveShapesToPage', async () => {
		const teacher = users[0]
		teacher.editor.updatePage({ id: page1, meta: { readonly: true } })
		const alice = join('alice', 'student')
		await settle()
		alice.editor.setCurrentPage(page2)
		alice.editor.createShape(geo(createShapeId('a1')))
		await settle()
		let err: any
		try {
			alice.editor.moveShapesToPage([createShapeId('a1')], page1)
		} catch (e) {
			err = e
		}
		await settle()
		log('T5', err?.message, shapeInRoom(createShapeId('a1'))?.parentId, alice.editor.getCurrentPageId())
	})

	it('T6: student deletes own shape that teacher has bound an arrow to: arrow terminal updates', async () => {
		const teacher = users[0]
		const alice = join('alice', 'student')
		await settle()
		alice.editor.createShape(geo(createShapeId('a-box'), 300))
		await settle()
		teacher.editor.createShape({ id: createShapeId('t-arrow'), type: 'arrow', x: 0, y: 0 })
		teacher.editor.createBinding({ type: 'arrow', fromId: createShapeId('t-arrow'), toId: createShapeId('a-box'), props: { terminal: 'end', normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false, snap: 'none' } } as any)
		await settle()
		alice.editor.updateShape({ id: createShapeId('a-box'), type: 'geo', x: 600 })
		await settle()
		log('T6 box x', shapeInRoom(createShapeId('a-box'))?.x, 'arrow end', shapeInRoom(createShapeId('t-arrow'))?.props.end, 'teacher local', (teacher.editor.getShape(createShapeId('t-arrow')) as any).props.end)
	})

	it('T7: student unlocks a teacher-locked shape with unlock-all-style update', async () => {
		const teacher = users[0]
		teacher.editor.createShape({ ...geo(createShapeId('t1')), isLocked: true })
		const alice = join('alice', 'student')
		await settle()
		alice.editor.updateShapes([{ id: createShapeId('t1'), type: 'geo', isLocked: false, x: 500 }])
		await settle()
		log('T7', shapeInRoom(createShapeId('t1')).isLocked, shapeInRoom(createShapeId('t1')).x)
	})
})
