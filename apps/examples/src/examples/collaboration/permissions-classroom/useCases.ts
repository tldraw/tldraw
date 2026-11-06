import { TLSocketRoom } from '@tldraw/sync'
import {
	createComment,
	createCommentThread,
	createShapeId,
	Editor,
	PageRecordType,
	TLPageId,
	toRichText,
} from 'tldraw'
import { ClassroomMeta, ClassroomRecord, Role } from './rules'

export const LESSON = PageRecordType.createId('lesson')
export const ANSWERS = PageRecordType.createId('answers')
export const AGENT_AREA = createShapeId('agent-area')
export const PROMPT = createShapeId('prompt')

/** What a use case can do: drive any person's editor, change roles, and look at the server. */
export interface Classroom {
	room: TLSocketRoom<ClassroomRecord, ClassroomMeta>
	/** The person's editor, once it is connected with its current access. */
	editor(userId: string): Promise<Editor>
	setRole(userId: string, role: Role): void
	getRole(userId: string): Role
}

export interface UseCase {
	title: string
	/** The part of the API that solves it. */
	api: string
	run(c: Classroom): Promise<string[]>
}

const settle = (ms = 400) => new Promise((r) => setTimeout(r, ms))
const verdict = (ok: boolean) => (ok ? 'allowed' : 'denied')

/** Write with the store's side effects off, so neither the editor nor the client rules stop it.
 *  This is what a modified client could send. Only the server can stop it. */
function forcePut(editor: Editor, records: any[]) {
	editor.store.sideEffects.setIsEnabled(false)
	editor.store.put(records)
	editor.store.sideEffects.setIsEnabled(true)
}

/** Put the board back to its start state, so that each use case runs from the same place. */
async function reset(c: Classroom) {
	if (c.getRole('alice') !== 'student') c.setRole('alice', 'student')
	if (c.getRole('carol') !== 'commenter') c.setRole('carol', 'commenter')
	const teacher = await c.editor('teacher')
	const lesson = teacher.getPage(LESSON)!
	const answers = teacher.getPage(ANSWERS)!
	if (lesson.meta.readonly)
		teacher.updatePage({ id: LESSON, meta: { ...lesson.meta, readonly: false } })
	if (!answers.meta.private)
		teacher.updatePage({ id: ANSWERS, meta: { ...answers.meta, private: true } })
	await settle()
}

async function createNote(c: Classroom, userId: string, x: number) {
	const editor = await c.editor(userId)
	editor.setCurrentPage(LESSON)
	const id = createShapeId()
	editor.createShape({ id, type: 'note', x, y: 220, props: { richText: toRichText(userId) } })
	await settle()
	return { editor, id, kept: !!c.room.getRecord(id) }
}

function startThread(editor: Editor, userId: string, pageId: TLPageId, x: number) {
	const thread = createCommentThread({
		pageId,
		anchor: { type: 'point', x, y: 120 },
		createdBy: userId,
	})
	const comment = createComment({
		threadId: thread.id,
		pageId,
		authorId: userId,
		body: toRichText(`A comment from ${userId}`),
	})
	editor.store.put([thread, comment] as any)
	return { thread, comment }
}

export const USE_CASES: UseCase[] = [
	{
		title: 'File read control',
		api: 'The host refuses the connection (accessForRole returns null)',
		async run(c) {
			await reset(c)
			c.setRole('carol', 'none')
			await settle()
			return ['Link set to "no access". Carol\'s pane is refused with FORBIDDEN.']
		},
	},
	{
		title: 'File write control',
		api: 'isReadonly at connect; the server rejects forced writes',
		async run(c) {
			await reset(c)
			c.setRole('carol', 'viewer')
			const { editor: carol, kept } = await createNote(c, 'carol', -200)
			const page = carol.getPage(LESSON)!
			forcePut(carol, [{ ...page, name: 'Hacked' }])
			await settle()
			return [
				`View link draws a note: ${verdict(kept)} (the editor is read-only)`,
				`View link forces a page rename: ${verdict((c.room.getRecord(LESSON) as any).name === 'Hacked')} by the server`,
			]
		},
	},
	{
		title: 'Page read control',
		api: 'authorizeRead.page and .shape, live with no reconnect',
		async run(c) {
			await reset(c)
			const teacher = await c.editor('teacher')
			const alice = await c.editor('alice')
			const before = !!alice.getPage(ANSWERS)
			teacher.updatePage({ id: ANSWERS, meta: { private: false } })
			await settle()
			const after = !!alice.getPage(ANSWERS)
			return [
				`Answers page sent to Alice while private: ${before ? 'yes' : 'no'}`,
				`Teacher clears "Answers private". Sent to Alice now: ${after ? 'yes' : 'no'}`,
			]
		},
	},
	{
		title: 'Page write control',
		api: 'authorizeRecord.shape reads the page with get; isPageReadonly in the editor',
		async run(c) {
			await reset(c)
			const teacher = await c.editor('teacher')
			const lesson = teacher.getPage(LESSON)!
			teacher.updatePage({ id: LESSON, meta: { ...lesson.meta, readonly: true } })
			await settle()
			const alice = await c.editor('alice')
			alice.setCurrentPage(LESSON)
			const readonly = alice.getIsReadonly()
			const { kept } = await createNote(c, 'alice', 0)
			return [
				`Teacher locks the Lesson page. Alice's editor is read-only: ${readonly ? 'yes' : 'no'}`,
				`Alice draws on the Lesson page: ${verdict(kept)}`,
			]
		},
	},
	{
		title: 'Shape write control: own shapes only',
		api: 'authorizeRecord.shape stamps the owner; isShapeLocked from a probe',
		async run(c) {
			await reset(c)
			const { id, kept } = await createNote(c, 'alice', 0)
			const alice = await c.editor('alice')
			const prompt = alice.getShape(PROMPT)!
			alice.store.put([{ ...prompt, x: prompt.x + 100 }])
			forcePut(alice, [{ ...prompt, x: prompt.x + 100 }])
			await settle()
			return [
				`Alice draws a note: ${verdict(kept)}, owner ${(c.room.getRecord(id) as any)?.meta.ownerId}`,
				`The teacher's text is locked for Alice: ${alice.isShapeLocked(PROMPT) ? 'yes' : 'no'}`,
				`Alice forces a move of it: ${verdict((c.room.getRecord(PROMPT) as any).x !== prompt.x)} by the server`,
			]
		},
	},
	{
		title: 'Tool and shape type limits',
		api: 'authorizeRecord.shape on create; overrides.tools hides the tools',
		async run(c) {
			await reset(c)
			const alice = await c.editor('alice')
			alice.setCurrentPage(LESSON)
			const frame = createShapeId()
			alice.createShape({ id: frame, type: 'frame', x: -300, y: 300 })
			await settle()
			return [
				`Alice creates a frame: ${verdict(!!c.room.getRecord(frame))}`,
				'The frame tool is not in her toolbar (overrides.tools).',
			]
		},
	},
	{
		title: 'Agents limited to an area',
		api: 'Session meta carries the area; the rule checks prev and next ancestors',
		async run(c) {
			await reset(c)
			const agent = await c.editor('agent')
			agent.setCurrentPage(LESSON)
			const inside = createShapeId()
			const outside = createShapeId()
			agent.createShape({ id: inside, type: 'note', parentId: AGENT_AREA, x: 40, y: 80 })
			agent.createShape({ id: outside, type: 'note', x: -400, y: 0 })
			await settle()
			const note = agent.getShape(inside)
			if (note) agent.reparentShapes([inside], LESSON)
			await settle()
			return [
				`Agent writes inside its frame: ${verdict(!!c.room.getRecord(inside))}`,
				`Agent writes outside its frame: ${verdict(!!c.room.getRecord(outside))}`,
				`Agent moves its note out of the frame: ${verdict((c.room.getRecord(inside) as any)?.parentId === LESSON)}`,
			]
		},
	},
	{
		title: 'Share links',
		api: 'The host maps a link to a role: isReadonly, objectAccess, and meta',
		async run(c) {
			await reset(c)
			const lines = []
			for (const role of ['viewer', 'commenter', 'student'] as Role[]) {
				c.setRole('carol', role)
				const { kept } = await createNote(c, 'carol', -200)
				lines.push(`Link "${role}" draws a note: ${verdict(kept)}`)
			}
			return lines
		},
	},
	{
		title: 'Comments: comment-only link',
		api: 'objectAccess "write" with isReadonly; canComment',
		async run(c) {
			await reset(c)
			const carol = await c.editor('carol')
			const ok = startThread(carol, 'carol', LESSON, -150)
			await settle()
			c.setRole('carol', 'viewer')
			const viewer = await c.editor('carol')
			const denied = startThread(viewer, 'carol', LESSON, -100)
			await settle()
			return [
				`Comment link comments on the read-only canvas: ${verdict(!!c.room.getRecord(ok.comment.id))}`,
				`View link comments: ${verdict(!!c.room.getRecord(denied.comment.id))}`,
			]
		},
	},
	{
		title: 'Comments: add own, manage any',
		api: 'createCommentAuthorizers({ canModifyComment }), also on the client',
		async run(c) {
			await reset(c)
			const carol = await c.editor('carol')
			const { comment } = startThread(carol, 'carol', LESSON, -50)
			await settle()
			const alice = await c.editor('alice')
			const teacher = await c.editor('teacher')
			const fromRoom = () => c.room.getRecord(comment.id) as any
			alice.store.put([{ ...fromRoom(), isDeleted: true }])
			await settle()
			const aliceDeleted = fromRoom().isDeleted
			teacher.store.put([{ ...fromRoom(), body: toRichText('Edited by the teacher') }])
			await settle()
			const teacherEdited = JSON.stringify(fromRoom().body).includes('Edited')
			teacher.store.put([{ ...fromRoom(), isDeleted: true }])
			await settle()
			return [
				`Alice deletes Carol's comment: ${verdict(aliceDeleted)}`,
				`Teacher edits Carol's comment: ${verdict(teacherEdited)}`,
				`Teacher takes down Carol's comment: ${verdict(fromRoom().isDeleted)}`,
			]
		},
	},
	{
		title: 'Comments on hidden pages',
		api: 'authorizeRead on comment-thread, comment, comment-reaction by pageId',
		async run(c) {
			await reset(c)
			const teacher = await c.editor('teacher')
			const { comment } = startThread(teacher, 'teacher', ANSWERS, 0)
			await settle()
			const alice = await c.editor('alice')
			return [
				`Teacher comments on the private Answers page: ${verdict(!!c.room.getRecord(comment.id))}`,
				`Comment sent to Alice: ${alice.store.get(comment.id as any) ? 'yes' : 'no'}`,
			]
		},
	},
	{
		title: 'Live role change',
		api: 'closeSession(id); the client reconnects with its new access',
		async run(c) {
			await reset(c)
			c.setRole('alice', 'teacher')
			const alice = await c.editor('alice')
			const locked = alice.isShapeLocked(PROMPT)
			const seesAnswers = !!alice.getPage(ANSWERS)
			c.setRole('alice', 'student')
			return [
				`Alice is a co-teacher. The teacher's text is locked for her: ${locked ? 'yes' : 'no'}`,
				`She receives the private Answers page: ${seesAnswers ? 'yes' : 'no'}`,
				'She is a student again.',
			]
		},
	},
	{
		title: 'Plugin record type',
		api: 'Rules keyed by typeName: authorizeRead.grade, authorizeRecord.grade',
		async run(c) {
			await reset(c)
			const teacher = await c.editor('teacher')
			const grade = { id: 'grade:alice', typeName: 'grade', studentId: 'alice', score: 'A' }
			teacher.store.put([grade as any])
			await settle()
			const alice = await c.editor('alice')
			const carol = await c.editor('carol')
			alice.store.put([{ ...grade, score: 'A+' } as any])
			forcePut(alice, [{ ...grade, score: 'A+' }])
			await settle()
			return [
				`Teacher grades Alice: ${verdict(!!c.room.getRecord(grade.id))}`,
				`Grade sent to Alice: ${alice.store.get(grade.id as any) ? 'yes' : 'no'}, to Carol: ${carol.store.get(grade.id as any) ? 'yes' : 'no'}`,
				`Alice changes her grade: ${verdict((c.room.getRecord(grade.id) as any).score === 'A+')}`,
			]
		},
	},
	{
		title: 'Plugin shape type',
		api: 'authorizeRecord.shape checks the shape type, built-in or not',
		async run(c) {
			await reset(c)
			const teacher = await c.editor('teacher')
			const alice = await c.editor('alice')
			teacher.setCurrentPage(LESSON)
			alice.setCurrentPage(LESSON)
			const fromTeacher = createShapeId()
			const fromAlice = createShapeId()
			teacher.createShape({ id: fromTeacher, type: 'stamp', x: 180, y: 220 })
			alice.createShape({ id: fromAlice, type: 'stamp', x: 260, y: 220 })
			await settle()
			return [
				`Teacher awards a star stamp: ${verdict(!!c.room.getRecord(fromTeacher))}`,
				`Alice awards herself a star stamp: ${verdict(!!c.room.getRecord(fromAlice))}`,
			]
		},
	},
	{
		title: 'Actions',
		api: 'overrides.actions hides lock for students; a shape rule enforces it',
		async run(c) {
			await reset(c)
			const { id } = await createNote(c, 'alice', 120)
			const alice = await c.editor('alice')
			alice.toggleLock([id])
			await settle()
			const aliceLocked = !!(c.room.getRecord(id) as any)?.isLocked
			const teacher = await c.editor('teacher')
			teacher.toggleLock([id])
			await settle()
			return [
				`Alice locks her own note: ${verdict(aliceLocked)}`,
				`Teacher locks Alice's note: ${verdict(!!(c.room.getRecord(id) as any)?.isLocked)}`,
			]
		},
	},
]
