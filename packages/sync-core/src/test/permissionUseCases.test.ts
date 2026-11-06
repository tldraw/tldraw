import { computed } from '@tldraw/state'
import {
	BaseRecord,
	PermissionChain,
	PermissionDenial,
	PermissionMiddleware,
	RecordId,
} from '@tldraw/store'
import {
	TLAsset,
	TLAssetId,
	TLDOCUMENT_ID,
	TLShape,
	defaultShapeSchemas,
	TLPageId,
	TLRecord,
	TLShapeId,
	createTLSchema,
} from '@tldraw/tlschema'
import {
	BaseBoxShapeUtil,
	Editor,
	T,
	PageRecordType,
	TLStore,
	createShapeId,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTools,
} from 'tldraw'
import { afterEach, describe, expect, it } from 'vitest'
import { TLSyncClient, TLSyncErrorCloseEventReason } from '../lib/TLSyncClient'
import {
	ClassroomActor,
	ClassroomMeta,
	GRADE_TYPE,
	MAX_AGENT_WRITES_PER_BATCH,
	changesReadRules,
	classroomActor,
	classroomPermissions,
} from './classroomPermissions'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

// Backtests of the permission use cases, from end to end: a real room, and real editors whose
// stores run the same chain as the room (see classroomPermissions.ts).

// A plugin shape type: a teacher's grade for one student (see `grades` in classroomPermissions.ts).
const gradeProps = { w: T.number, h: T.number, studentId: T.string, text: T.string }
declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[GRADE_TYPE]: { w: number; h: number; studentId: string; text: string }
	}
}
class GradeShapeUtil extends BaseBoxShapeUtil<TLShape<typeof GRADE_TYPE>> {
	static override type = GRADE_TYPE
	static override props = gradeProps
	override getDefaultProps() {
		return { w: 100, h: 50, studentId: '', text: '' }
	}
	override component() {
		return null
	}
	override getIndicatorPath() {
		return undefined
	}
}

const schema = createTLSchema({
	shapes: { ...defaultShapeSchemas, [GRADE_TYPE]: { props: gradeProps } },
})
const disposables: (() => void)[] = []
afterEach(() => {
	while (disposables.length) disposables.pop()!()
})

class Peer {
	store: TLStore
	pair: TestSocketPair<TLRecord>
	client: TLSyncClient<TLRecord>
	editor!: Editor
	denied: PermissionDenial<TLRecord>[] = []
	syncErrors: string[] = []
	expectsSyncError = false

	constructor(
		readonly server: TestServer<TLRecord>,
		public meta: ClassroomMeta,
		chain: PermissionChain<TLRecord, ClassroomActor>
	) {
		this.store = createTLStore({ schema, id: meta.userId })
		this.store.setPermissions({
			chain,
			getActor: () => classroomActor(this.meta),
			onDenied: (d) => this.denied.push(...d),
		})
		this.pair = new TestSocketPair(meta.userId, server)
		this.pair.connectOpts = {
			meta,
			// A link guest's role can change while connected, so its lane stays open.
			isReadonly: meta.role === 'viewer' && !meta.viaLink,
			objectAccess: meta.role === 'viewer' && !meta.viaLink ? 'read' : 'write',
		}
		this.client = new TLSyncClient<TLRecord>({
			store: this.store,
			socket: this.pair.clientSocket,
			onSyncError: (reason) => {
				this.syncErrors.push(reason)
			},
			onLoad: () => {
				this.editor = new Editor({
					shapeUtils: [...defaultShapeUtils, GradeShapeUtil],
					bindingUtils: defaultBindingUtils,
					tools: defaultTools,
					store: this.store,
					getContainer: () => document.createElement('div'),
				})
			},
			presence: computed('presence', () => null),
		})
		disposables.push(() => {
			this.editor?.dispose()
			this.client.close()
		})
		this.pair.connect()
	}

	shape(id: TLShapeId) {
		return this.store.get(id)
	}
}

function classroom({ atomicPushes = true } = {}) {
	const chain = classroomPermissions({ atomicPushes })
	const server: TestServer<TLRecord> = new TestServer<TLRecord>(schema, undefined, {
		permissions: chain,
		// as the demo host does: re-run reads when a change can change what others may read
		onCommittedChanges: ({ diff }) => {
			if (changesReadRules(diff)) server.room.refreshReads()
		},
	})
	const peers: Peer[] = []
	const flush = () => {
		for (let i = 0; i < 50; i++) {
			server.flushDebouncingMessages()
			if (!peers.some((p) => p.pair.getNeedsFlushing())) {
				for (const p of peers) {
					if (p.syncErrors.length && !p.expectsSyncError) {
						throw new Error(`sync error for ${p.meta.userId}: ${p.syncErrors.join(', ')}`)
					}
				}
				return
			}
			for (const p of peers) {
				p.pair.flushClientSentEvents()
				p.pair.flushServerSentEvents()
			}
		}
		throw new Error('did not settle')
	}
	const join = (meta: ClassroomMeta, { expectsSyncError = false } = {}) => {
		const peer = new Peer(server, meta, chain)
		peer.expectsSyncError = expectsSyncError
		peers.push(peer)
		flush()
		return peer
	}
	const stored = (id: string) =>
		server.storage.getSnapshot().documents.find((d) => d.state.id === id)?.state as
			| TLRecord
			| undefined

	// The teacher sets up the room: a public page with shapes, and a private page.
	const teacher = join({ userId: 'teacher', role: 'teacher' })
	const page1 = teacher.editor.getCurrentPageId()
	const page2 = PageRecordType.createId('private')
	const teacherBox = createShapeId('teacher-box')
	const secretBox = createShapeId('secret-box')
	teacher.editor.createShape({ id: teacherBox, type: 'geo', x: 0, y: 0 })
	teacher.editor.createPage({ id: page2, name: 'Answers', meta: { private: true } })
	teacher.editor.createShape({ id: secretBox, type: 'geo', parentId: page2, x: 0, y: 0 })
	flush()

	return { server, chain, flush, join, stored, teacher, page1, page2, teacherBox, secretBox }
}

describe('shape write control: students edit only their own shapes', () => {
	it('stamps the owner of a new shape, on the client and on the server', () => {
		const { join, flush, stored } = classroom()
		const alice = join({ userId: 'alice', role: 'student' })
		const box = createShapeId('alice-box')
		alice.editor.createShape({ id: box, type: 'geo', x: 10, y: 10, meta: { ownerId: 'mallory' } })
		expect(alice.shape(box)!.meta.ownerId).toBe('alice')
		flush()
		expect(stored(box)!.meta).toEqual({ ownerId: 'alice' })
		expect(alice.denied).toEqual([])
	})

	it("the teacher's shape is locked for a student, so nothing is sent", () => {
		const { join, teacherBox, flush, stored } = classroom()
		const alice = join({ userId: 'alice', role: 'student' })
		expect(alice.editor.getShapePermissionDenial(teacherBox)).toBe('not your shape')
		alice.editor.updateShape({ id: teacherBox, type: 'geo', x: 500 })
		expect(alice.shape(teacherBox)!.x).toBe(0)
		expect(alice.pair.clientSentEventQueue.filter((m) => m.type === 'push')).toEqual([])
		expect(alice.denied.map((d) => d.reason)).toEqual(['not your shape'])
		flush()
		expect((stored(teacherBox) as any).x).toBe(0)
	})

	it('the server denies the same write from a client without the check, and corrects it', () => {
		const { join, teacherBox, flush, stored } = classroom()
		const mallory = join({ userId: 'mallory', role: 'student' })
		mallory.store.setPermissions(null)
		mallory.editor.updateShape({ id: teacherBox, type: 'geo', x: 500 })
		expect((mallory.shape(teacherBox) as any).x).toBe(500)
		flush()
		expect((stored(teacherBox) as any).x).toBe(0)
		expect((mallory.shape(teacherBox) as any).x).toBe(0)
	})

	it("denies a shape put into someone else's frame", () => {
		const { join, flush, stored } = classroom()
		const bob = join({ userId: 'bob', role: 'student' })
		const frame = createShapeId('bob-frame')
		bob.editor.createShape({ id: frame, type: 'frame', x: 0, y: 0, props: { w: 400, h: 400 } })
		flush()
		const alice = join({ userId: 'alice', role: 'student' })
		const box = createShapeId('alice-box')
		alice.editor.createShape({ id: box, type: 'geo', parentId: frame, x: 10, y: 10 })
		expect(alice.shape(box)).toBeUndefined()
		expect(alice.denied.map((d) => d.reason)).toEqual(['not your frame'])
		flush()
		expect(stored(box)).toBeUndefined()
	})
})

describe('ordinary editor work at the edges of the shape rules', () => {
	it('a student makes a frame and a shape in it in one operation', () => {
		const { join, flush, stored } = classroom()
		const alice = join({ userId: 'alice', role: 'student' })
		const frame = createShapeId('alice-frame')
		const child = createShapeId('alice-child')
		alice.editor.createShapes([
			{ id: frame, type: 'frame', x: 0, y: 0, props: { w: 400, h: 400 } },
			{ id: child, type: 'geo', parentId: frame, x: 10, y: 10 },
		])
		flush()
		expect([alice.denied, stored(frame)?.meta, stored(child)?.meta]).toEqual([
			[],
			{ ownerId: 'alice' },
			{ ownerId: 'alice' },
		])
	})

	it("a student pastes a copy of the teacher's frame: the copy is the student's", () => {
		const { join, teacher, flush, stored } = classroom()
		const frame = createShapeId('teacher-frame')
		teacher.editor.createShapes([
			{ id: frame, type: 'frame', x: 0, y: 0, props: { w: 400, h: 400 } },
			{ id: createShapeId('teacher-child'), type: 'geo', parentId: frame, x: 10, y: 10 },
		])
		flush()
		const alice = join({ userId: 'alice', role: 'student' })
		const content = alice.editor.getContentFromCurrentPage([frame])!
		alice.editor.putContentOntoCurrentPage(content)
		flush()
		const teacherIds = new Set([
			frame,
			createShapeId('teacher-child'),
			createShapeId('teacher-box'),
		])
		const pasted = alice.editor
			.getCurrentPageShapes()
			.filter((shape) => !teacherIds.has(shape.id))
			.map((shape) => [shape.type, stored(shape.id)?.meta])
		expect([alice.denied, pasted]).toEqual([
			[],
			[
				['frame', { ownerId: 'alice' }],
				['geo', { ownerId: 'alice' }],
			],
		])
	})

	it('one editor operation is one batch: with atomic(), a partly denied one changes nothing', () => {
		const { join, teacherBox, flush, stored } = classroom()
		const alice = join({ userId: 'alice', role: 'student' })
		const own = createShapeId('own')
		alice.editor.createShape({ id: own, type: 'geo', x: 0, y: 0 })
		flush()
		alice.editor.run(() => {
			alice.editor.updateShapes([{ id: own, type: 'geo', x: 300 }])
			alice.editor.updateShapes([{ id: teacherBox, type: 'geo', x: 300 }])
		})
		flush()
		expect([(stored(own) as any).x, (stored(teacherBox) as any).x]).toEqual([0, 0])
	})

	it('moving a shape onto a locked page is refused, and the editor does not break', () => {
		const { join, teacher, page1, flush, stored } = classroom()
		const locked = PageRecordType.createId('locked')
		teacher.editor.createPage({ id: locked, name: 'Locked', meta: { locked: true } })
		flush()
		const alice = join({ userId: 'alice', role: 'student' })
		const own = createShapeId('own')
		alice.editor.createShape({ id: own, type: 'geo', x: 0, y: 0 })
		alice.editor.moveShapesToPage([own], locked)
		flush()
		expect([alice.denied.map((d) => d.reason)[0], (stored(own) as TLShape).parentId]).toEqual([
			'page is locked',
			page1,
		])
	})
})

describe('assets and bindings follow the shape rules', () => {
	const assetId = 'asset:teacher-image' as TLAssetId
	function withAsset() {
		const room = classroom()
		room.teacher.editor.createAssets([
			{
				id: assetId,
				typeName: 'asset',
				type: 'image',
				props: {
					src: 'https://example.com/a.png',
					w: 10,
					h: 10,
					name: 'a',
					isAnimated: false,
					mimeType: 'image/png',
				},
				meta: {},
			},
		])
		room.flush()
		return room
	}

	it("a student cannot change the teacher's asset, on the client or in the room", () => {
		const { join, flush, stored } = withAsset()
		expect(stored(assetId)!.meta).toEqual({ ownerId: 'teacher' })
		const alice = join({ userId: 'alice', role: 'student' })
		const asset = alice.editor.getAsset(assetId) as TLAsset & { type: 'image' }
		const evil = {
			id: assetId,
			type: 'image' as const,
			props: { ...asset.props, src: 'https://evil/x.png' },
		}
		alice.editor.updateAssets([evil])
		expect(alice.denied.map((d) => d.reason)).toEqual(['not your asset'])
		alice.store.setPermissions(null)
		alice.editor.updateAssets([evil])
		flush()
		expect((stored(assetId) as TLAsset).props).toMatchObject({ src: 'https://example.com/a.png' })
	})

	function arrowTo(peer: Peer, arrow: TLShapeId, target: TLShapeId, parentId?: TLPageId) {
		peer.editor.createShape({ id: arrow, type: 'arrow', parentId, x: -100, y: 0 })
		peer.editor.createBinding({
			type: 'arrow',
			fromId: arrow,
			toId: target,
			props: {
				terminal: 'end',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: false,
			},
		})
	}

	it('a student does not receive a binding on a private page, which names a hidden shape', () => {
		const { join, teacher, page2, secretBox, flush } = classroom()
		arrowTo(teacher, createShapeId('secret-arrow'), secretBox, page2)
		flush()
		const bindingIds = (peer: Peer) =>
			peer.store.allRecords().filter((r) => r.typeName === 'binding').length
		const alice = join({ userId: 'alice', role: 'student' })
		expect([bindingIds(teacher), bindingIds(alice)]).toEqual([1, 0])
	})

	it("a student cannot unbind the teacher's arrow, even without the client check", () => {
		const { join, teacher, teacherBox, flush, stored } = classroom()
		arrowTo(teacher, createShapeId('teacher-arrow'), teacherBox)
		flush()
		const binding = teacher.store.allRecords().find((r) => r.typeName === 'binding')!
		const mallory = join({ userId: 'mallory', role: 'student' })
		mallory.store.setPermissions(null)
		mallory.store.remove([binding.id])
		flush()
		expect(stored(binding.id)).toBeDefined()
	})

	it("a student deletes their own shape that the teacher's arrow points at", () => {
		for (const atomicPushes of [true, false]) {
			const { join, teacher, flush, stored } = classroom({ atomicPushes })
			const alice = join({ userId: 'alice', role: 'student' })
			const box = createShapeId('alice-box')
			alice.editor.createShape({ id: box, type: 'geo', x: 300, y: 0 })
			flush()
			arrowTo(teacher, createShapeId('teacher-arrow'), box)
			flush()
			const binding = teacher.store.allRecords().find((r) => r.typeName === 'binding')!
			alice.editor.deleteShapes([box])
			flush()
			expect([alice.denied, stored(box), stored(binding.id)]).toEqual([[], undefined, undefined])
		}
	})

	it('a record type with no rules is closed', () => {
		const { join, flush, stored } = classroom()
		const alice = join({ userId: 'alice', role: 'student' })
		const camera = alice.store.allRecords().find((r) => r.typeName === 'camera')!
		const result = classroomPermissions().run({
			kind: 'write',
			actor: classroomActor(alice.meta),
			items: [{ type: 'create', prev: null, next: { ...camera, typeName: 'vote' } as any }],
			get: () => undefined,
		})
		flush()
		expect([result.denied.map((d) => d.reason), stored(camera.id)]).toEqual([
			['no rules for this type'],
			undefined,
		])
	})

	it("a student binds their own arrow to the teacher's shape", () => {
		const { join, teacherBox, flush, stored } = classroom()
		const alice = join({ userId: 'alice', role: 'student' })
		arrowTo(alice, createShapeId('alice-arrow'), teacherBox)
		flush()
		const binding = alice.store.allRecords().find((r) => r.typeName === 'binding')!
		expect([alice.denied, stored(binding.id)?.id]).toEqual([[], binding.id])
	})
})

describe('reads follow a move to another parent', () => {
	it('a frame moved onto a private page takes its child out of view too', async () => {
		const { join, teacher, page2, flush } = classroom()
		const frame = createShapeId('teacher-frame')
		const child = createShapeId('teacher-child')
		teacher.editor.createShapes([
			{ id: frame, type: 'frame', x: 0, y: 0, props: { w: 400, h: 400 } },
			{ id: child, type: 'geo', parentId: frame, x: 10, y: 10 },
		])
		flush()
		const alice = join({ userId: 'alice', role: 'student' })
		expect([alice.shape(frame)?.id, alice.shape(child)?.id]).toEqual([frame, child])
		teacher.editor.moveShapesToPage([frame], page2)
		flush()
		// the host refreshes reads after the commit
		await Promise.resolve()
		flush()
		expect([alice.shape(frame), alice.shape(child)]).toEqual([undefined, undefined])
	})
})

describe('a push is all or nothing with atomic()', () => {
	function mixedPush(atomicPushes: boolean) {
		const { join, teacherBox, flush, stored } = classroom({ atomicPushes })
		const mallory = join({ userId: 'mallory', role: 'student' })
		const own = createShapeId('own')
		mallory.editor.createShape({ id: own, type: 'geo', x: 0, y: 0 })
		flush()
		// one operation that changes an own shape and the teacher's shape
		mallory.store.setPermissions(null)
		mallory.editor.updateShapes([
			{ id: own, type: 'geo', x: 300 },
			{ id: teacherBox, type: 'geo', x: 300 },
		])
		flush()
		return { own: stored(own) as any, teacher: stored(teacherBox) as any }
	}

	it('with atomic(), the server rejects the whole push', () => {
		const { own, teacher } = mixedPush(true)
		expect([own.x, teacher.x]).toEqual([0, 0])
	})

	it('without it, the server applies the push in part', () => {
		const { own, teacher } = mixedPush(false)
		expect([own.x, teacher.x]).toEqual([300, 0])
	})
})

describe('page read control', () => {
	it('a student never receives a private page or its shapes', () => {
		const { join, page2, secretBox } = classroom()
		const alice = join({ userId: 'alice', role: 'student' })
		expect(alice.store.get(page2)).toBeUndefined()
		expect(alice.store.get(secretBox)).toBeUndefined()
		expect(alice.editor.getPages().map((p) => p.name)).toEqual(['Page 1'])
	})

	it('a student cannot write into a private page, even when the client knows its id', () => {
		const { join, page2, flush, stored } = classroom()
		const mallory = join({ userId: 'mallory', role: 'student' })
		mallory.store.setPermissions(null)
		const box = createShapeId('sneaky')
		mallory.store.put([
			{
				...(mallory.editor.getShape(createShapeId('teacher-box')) as any),
				id: box,
				parentId: page2,
			},
		])
		flush()
		expect(stored(box)).toBeUndefined()
	})

	it('when a page turns private, the page goes, but its shapes stay until a refresh', () => {
		const { join, teacher, page1, teacherBox, flush, server } = classroom()
		const alice = join({ userId: 'alice', role: 'student' })
		teacher.editor.updatePage({ id: page1, meta: { private: true } })
		flush()
		expect(alice.store.get(page1)).toBeUndefined()
		// The read chain ran on the page only. The shape did not change, so it was not re-checked.
		expect(alice.store.get(teacherBox)).toBeDefined()
		server.room.refreshReads()
		flush()
		expect(alice.store.get(teacherBox)).toBeUndefined()
	})

	it('a role change takes effect on writes and reads at once', () => {
		const { join, server, page2, secretBox, flush } = classroom()
		const alice = join({ userId: 'alice', role: 'student' })
		alice.meta = { userId: 'alice', role: 'teacher' }
		server.room.updateSessionMeta('alice', alice.meta)
		flush()
		expect(alice.store.get(page2)).toBeDefined()
		expect(alice.store.get(secretBox)).toBeDefined()
	})
})

describe('file read control', () => {
	it('when the teacher closes the class, a student cannot open the file', () => {
		const { join, teacher, flush } = classroom()
		teacher.editor.updateDocumentSettings({ meta: { closed: true } })
		flush()
		const alice = join({ userId: 'alice', role: 'student' }, { expectsSyncError: true })
		expect(alice.syncErrors).toEqual([TLSyncErrorCloseEventReason.FORBIDDEN])
		expect(alice.store.get(teacher.editor.getCurrentPageId())).toBeUndefined()
	})

	it('closing the class closes the open sessions of students on refresh', () => {
		const { join, teacher, server, flush } = classroom()
		const alice = join({ userId: 'alice', role: 'student' }, { expectsSyncError: true })
		const other = join({ userId: 'teacher2', role: 'teacher' })
		teacher.editor.updateDocumentSettings({ meta: { closed: true } })
		flush()
		server.room.refreshReads()
		flush()
		expect(alice.syncErrors).toEqual([TLSyncErrorCloseEventReason.FORBIDDEN])
		expect(other.syncErrors).toEqual([])
	})

	it('students cannot reopen the class', () => {
		const { join, teacher, flush } = classroom()
		const alice = join({ userId: 'alice', role: 'student' })
		alice.editor.updateDocumentSettings({ meta: { closed: true } })
		expect(alice.denied.map((d) => d.reason)).toEqual(['only teachers change the file'])
		flush()
		expect(teacher.store.get(TLDOCUMENT_ID)!.meta.closed).toBeUndefined()
	})
})

describe('shape read control, with a plugin shape type', () => {
	function graded() {
		const room = classroom()
		const aliceGrade = createShapeId('grade-alice')
		const bobGrade = createShapeId('grade-bob')
		room.teacher.editor.createShapes([
			{ id: aliceGrade, type: GRADE_TYPE, x: 0, y: 0, props: { studentId: 'alice', text: 'A' } },
			{ id: bobGrade, type: GRADE_TYPE, x: 0, y: 0, props: { studentId: 'bob', text: 'B' } },
		])
		room.flush()
		return { ...room, aliceGrade, bobGrade }
	}

	it('a student receives only their own grade, a teacher all', () => {
		const { join, teacher, aliceGrade, bobGrade } = graded()
		const alice = join({ userId: 'alice', role: 'student' })
		const bob = join({ userId: 'bob', role: 'student' })
		expect([!!alice.store.get(aliceGrade), !!alice.store.get(bobGrade)]).toEqual([true, false])
		expect([!!bob.store.get(aliceGrade), !!bob.store.get(bobGrade)]).toEqual([false, true])
		expect([!!teacher.store.get(aliceGrade), !!teacher.store.get(bobGrade)]).toEqual([true, true])
	})

	it('only a teacher writes grades, on the client and in the room', () => {
		const { join, flush, stored, aliceGrade } = graded()
		const alice = join({ userId: 'alice', role: 'student' })
		expect(alice.editor.getShapePermissionDenial(aliceGrade)).toBe('only teachers grade')
		alice.store.setPermissions(null)
		alice.editor.updateShape({ id: aliceGrade, type: GRADE_TYPE, props: { text: 'A+' } })
		flush()
		expect((stored(aliceGrade) as any).props.text).toBe('A')
	})

	it('a grade change reaches its student, and no one else', () => {
		const { join, teacher, flush, aliceGrade, bobGrade } = graded()
		const alice = join({ userId: 'alice', role: 'student' })
		teacher.editor.updateShapes([
			{ id: aliceGrade, type: GRADE_TYPE, props: { text: 'B' } },
			{ id: bobGrade, type: GRADE_TYPE, props: { text: 'C' } },
		])
		flush()
		expect((alice.store.get(aliceGrade) as any).props.text).toBe('B')
		expect(alice.store.get(bobGrade)).toBeUndefined()
	})

	it('plugin actions ask the same chain', () => {
		const { chain } = graded()
		const can = (role: ClassroomMeta['role']) =>
			chain.can({ actor: classroomActor({ userId: 'u', role }), action: 'grade.change' })
		expect([can('teacher'), can('student')]).toEqual([true, false])
	})
})

describe('share links', () => {
	it('a link role change applies to the next write, with no reconnect', () => {
		const { join, server, flush, stored } = classroom()
		const guest = join({ userId: 'guest', role: 'viewer', viaLink: true })
		const draw = (id: string) => {
			const shapeId = createShapeId(id)
			guest.editor.createShape({ id: shapeId, type: 'geo', x: 0, y: 0 })
			flush()
			return stored(shapeId)
		}
		expect(draw('a')).toBeUndefined()
		expect(guest.denied.map((d) => d.reason)).toEqual(['read only'])

		// the host's "change link" endpoint
		guest.meta = { userId: 'guest', role: 'student', viaLink: true }
		server.room.updateSessionMeta('guest', guest.meta)
		expect(draw('b')).toBeDefined()

		guest.meta = { userId: 'guest', role: 'viewer', viaLink: true }
		server.room.updateSessionMeta('guest', guest.meta)
		guest.store.setPermissions(null)
		expect(draw('c')).toBeUndefined()
		expect(guest.syncErrors).toEqual([])
	})
})

describe('page and file write control', () => {
	it('a locked page is read only for students', () => {
		const { join, teacher, page1, flush, stored } = classroom()
		teacher.editor.updatePage({ id: page1, meta: { locked: true } })
		flush()
		const alice = join({ userId: 'alice', role: 'student' })
		const box = createShapeId('late')
		alice.editor.createShape({ id: box, type: 'geo', x: 0, y: 0 })
		expect(alice.denied.map((d) => d.reason)).toEqual(['page is locked'])
		flush()
		expect(stored(box)).toBeUndefined()
	})

	it('students cannot rename pages', () => {
		const { join, page1 } = classroom()
		const alice = join({ userId: 'alice', role: 'student' })
		alice.editor.renamePage(page1, 'Mine')
		expect(alice.store.get(page1)!.name).toBe('Page 1')
		expect(alice.denied.map((d) => d.reason)).toEqual(['only teachers change pages'])
	})

	it('a viewer writes nothing, and the room lane enforces it before the chain', () => {
		const { join, teacherBox, flush, stored } = classroom()
		const viewer = join({ userId: 'v', role: 'viewer' })
		expect(viewer.editor.getShapePermissionDenial(teacherBox)).toBe('read only')
		viewer.editor.createShape({ type: 'geo', x: 0, y: 0 })
		expect(viewer.denied.map((d) => d.reason)).toEqual(['read only'])
		viewer.store.setPermissions(null)
		viewer.editor.updateShape({ id: teacherBox, type: 'geo', x: 99 })
		flush()
		expect((stored(teacherBox) as any).x).toBe(0)
	})
})

describe('agents', () => {
	function agentRoom() {
		const room = classroom()
		const frame = createShapeId('agent-frame')
		room.teacher.editor.createShape({
			id: frame,
			type: 'frame',
			x: 0,
			y: 0,
			props: { w: 900, h: 900 },
		})
		room.flush()
		const agent = room.join({ userId: 'agent', role: 'agent', frameId: frame })
		return { ...room, frame, agent }
	}

	it('an agent works inside its frame, and owns what it makes there', () => {
		const { agent, frame, flush, stored } = agentRoom()
		const box = createShapeId('agent-box')
		agent.editor.createShape({ id: box, type: 'geo', parentId: frame, x: 10, y: 10 })
		flush()
		expect(stored(box)!.meta).toEqual({ ownerId: 'agent' })
	})

	it('an agent connects its own arrows inside its frame', () => {
		const { agent, frame, flush, stored } = agentRoom()
		const box = createShapeId('agent-box')
		const arrow = createShapeId('agent-arrow')
		agent.editor.createShapes([
			{ id: box, type: 'geo', parentId: frame, x: 300, y: 10 },
			{ id: arrow, type: 'arrow', parentId: frame, x: 10, y: 10 },
		])
		agent.editor.createBinding({
			type: 'arrow',
			fromId: arrow,
			toId: box,
			props: {
				terminal: 'end',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: false,
			},
		})
		flush()
		const binding = agent.store.allRecords().find((r) => r.typeName === 'binding')!
		expect([agent.denied, stored(binding.id)?.id]).toEqual([[], binding.id])
	})

	it('an agent cannot write outside its frame', () => {
		const { agent } = agentRoom()
		agent.editor.createShape({ id: createShapeId('loose'), type: 'geo', x: 2000, y: 0 })
		expect(agent.denied.map((d) => d.reason)).toEqual(['outside your frame'])
	})

	it('an agent batch over the limit is denied as a whole', () => {
		const { agent, frame } = agentRoom()
		agent.editor.createShapes(
			Array.from({ length: MAX_AGENT_WRITES_PER_BATCH + 1 }, (_, i) => ({
				id: createShapeId('many-' + i),
				type: 'geo',
				parentId: frame,
				x: i,
				y: 0,
			}))
		)
		expect(agent.editor.getSortedChildIdsForParent(frame)).toEqual([])
		expect(new Set(agent.denied.map((d) => d.reason))).toEqual(new Set(['too many writes']))
	})
})

describe('actions', () => {
	it('answers named actions for the UI and for server endpoints', () => {
		const chain = classroomPermissions()
		const can = (role: ClassroomMeta['role'], action: string) =>
			chain.can({ actor: classroomActor({ userId: 'u', role }), action })
		expect(can('teacher', 'page.lock')).toBe(true)
		expect(can('student', 'page.lock')).toBe(false)
		expect(can('student', 'file.share')).toBe(false)
		expect(can('student', 'export')).toBe(true)
	})
})

// Comments: the demo's comment layer runs the real `createCommentAuthorizers` rules, which live in
// a package that depends on this one. Its tests are next to the demo's copy of the rules.

describe('plugin record types', () => {
	// A plugin adds a record type and its own layer: one vote per user per page, and the
	// server sets who voted. Both checks see the whole batch, so two votes in one push are caught.
	interface Vote extends BaseRecord<'vote', RecordId<Vote>> {
		pageId: string
		userId: string
	}
	type Rec = TLRecord | Vote
	const oneVoteEach: PermissionMiddleware<Rec, ClassroomActor> = (batch, next) => {
		if (batch.kind !== 'write') return next()
		const seen = new Set<string>()
		const items = batch.items.flatMap((access) => {
			if (access.type !== 'create' || access.next.typeName !== 'vote') return [access]
			const vote = { ...(access.next as Vote), userId: batch.actor.meta.userId }
			const key = vote.pageId + '/' + vote.userId
			if (seen.has(key)) return []
			seen.add(key)
			return [{ ...access, next: vote }]
		})
		return next(items)
	}
	const chain = new PermissionChain<Rec, ClassroomActor>(oneVoteEach)
	const vote = (id: string): Vote => ({
		id: id as Vote['id'],
		typeName: 'vote',
		pageId: 'page:p',
		userId: 'claimed',
	})

	it('stamps the voter, and denies a second vote in the same batch', () => {
		const result = chain.run({
			kind: 'write',
			actor: classroomActor({ userId: 'alice', role: 'student' }),
			items: [
				{ type: 'create', prev: null, next: vote('vote:1') },
				{ type: 'create', prev: null, next: vote('vote:2') },
			],
			get: () => undefined,
		})
		expect(result.allowed.map((a: any) => [a.next.id, a.next.userId])).toEqual([
			['vote:1', 'alice'],
		])
		expect(result.denied.map((d) => [(d.access as any).next.id, d.reason])).toEqual([
			['vote:2', 'denied'],
		])
	})
})
