import { TLSocketRoom } from '@tldraw/sync'
import {
	createBindingId,
	createComment,
	createCommentThread,
	createShapeId,
	Editor,
	PageRecordType,
	TLPageId,
	TLShapeId,
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
	/** Why the host refused the person's connection, or null if it did not. */
	refusal(userId: string): Promise<string | null>
}

export interface UseCase {
	title: string
	/** What happens, in plain words, and what to look for in the panes. */
	story: string
	/** The panes to watch, by user id. */
	people: string[]
	/** The part of the API that solves it. */
	api: string
	run(c: Classroom): Promise<Check[]>
}

/** One result of a use case: what happened, and what the rules say should happen. */
export interface Check {
	label: string
	actual: boolean
	expected: boolean
	/** Words for true and false. */
	words: [string, string]
}

const allowed = (label: string, actual: boolean, expected: boolean): Check => ({
	label,
	actual,
	expected,
	words: ['allowed', 'denied'],
})
const yes = (label: string, actual: boolean, expected: boolean): Check => ({
	label,
	actual,
	expected,
	words: ['yes', 'no'],
})

const settle = (ms = 400) => new Promise((r) => setTimeout(r, ms))

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
	// clear what earlier scripts drew on the lesson, and keep the lesson itself
	const drawn = [...teacher.getPageShapeIds(LESSON)].filter(
		(id) => id !== PROMPT && id !== AGENT_AREA
	)
	teacher.deleteShapes(drawn.filter((id) => teacher.getShape(id)?.parentId === LESSON))
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

/** A note made with side effects off, so that only the server can stop it. */
function forceNote(editor: Editor, userId: string, pageId: TLPageId) {
	const id = createShapeId()
	const util = editor.getShapeUtil('note')
	forcePut(editor, [
		{
			id,
			typeName: 'shape',
			type: 'note',
			parentId: pageId,
			index: 'a9',
			x: -300,
			y: 400,
			rotation: 0,
			isLocked: false,
			opacity: 1,
			meta: { ownerId: userId },
			props: { ...util.getDefaultProps(), richText: toRichText('forced') },
		},
	])
	return id
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
		story:
			'The teacher sets the shared link to "no access". The host refuses the link at connect, so Carol gets nothing from the room.',
		people: ['carol'],
		api: 'The host refuses the connection (accessForRole returns null)',
		async run(c) {
			await reset(c)
			c.setRole('carol', 'none')
			const reason = await c.refusal('carol')
			return [yes('Carol is refused at connect with FORBIDDEN', reason === 'FORBIDDEN', true)]
		},
	},
	{
		title: 'File write control',
		story:
			"With a view link, Carol's editor is read-only. A modified client could still send a write, so the script forces a note past the editor: the server rejects it. A student may make that note, so only the read-only session stops it.",
		people: ['carol'],
		api: 'isReadonly at connect; the server rejects forced writes',
		async run(c) {
			await reset(c)
			c.setRole('carol', 'viewer')
			const { editor: carol, kept } = await createNote(c, 'carol', -200)
			const forced = forceNote(carol, 'carol', LESSON)
			await settle()
			return [
				allowed('View link draws a note', kept, false),
				allowed('View link forces a note past the editor', !!c.room.getRecord(forced), false),
			]
		},
	},
	{
		title: 'Page read control',
		story:
			"The Answers page is private. The teacher shares it: Alice's pane gets the page and its shapes with no reconnect. The teacher hides it again: they go.",
		people: ['teacher', 'alice'],
		api: 'authorizeRead.page and .shape, live with no reconnect',
		async run(c) {
			await reset(c)
			const teacher = await c.editor('teacher')
			const alice = await c.editor('alice')
			const before = !!alice.getPage(ANSWERS)
			teacher.updatePage({ id: ANSWERS, meta: { private: false } })
			await settle()
			const shared = !!alice.getPage(ANSWERS)
			teacher.updatePage({ id: ANSWERS, meta: { private: true } })
			await settle()
			return [
				yes('Alice has the private Answers page', before, false),
				yes('The teacher shares it. Alice has it now', shared, true),
				yes('The teacher hides it again. Alice still has it', !!alice.getPage(ANSWERS), false),
			]
		},
	},
	{
		title: 'Page write control',
		story:
			"The teacher makes the Lesson page read-only for students. Alice's tools go away on that page, and a note she tries to make is not kept.",
		people: ['alice'],
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
			// the editor stopped that one; a forced note reaches the server's page rule
			const forced = forceNote(alice, 'alice', LESSON)
			await settle()
			return [
				yes("Alice's editor is read-only on the Lesson page", readonly, true),
				allowed('Alice draws on the Lesson page', kept, false),
				allowed('Alice forces a note onto the Lesson page', !!c.room.getRecord(forced), false),
			]
		},
	},
	{
		title: 'Shape write control: own shapes only',
		story:
			"Alice draws a note: the room stamps her as its owner. The teacher's prompt is locked in her editor. A forced move of it is rejected by the server.",
		people: ['alice'],
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
				allowed('Alice draws a note', kept, true),
				yes(
					'The room stamps Alice as its owner',
					(c.room.getRecord(id) as any)?.meta.ownerId === 'alice',
					true
				),
				yes("The teacher's prompt is locked for Alice", alice.isShapeLocked(PROMPT), true),
				allowed(
					'Alice forces a move of the prompt',
					(c.room.getRecord(PROMPT) as any).x !== prompt.x,
					false
				),
			]
		},
	},
	{
		title: 'Tool and shape type limits',
		story:
			"Students may make only some shape types. The frame tool is not in Alice's toolbar, and a frame made through the API is not kept.",
		people: ['alice'],
		api: 'authorizeRecord.shape on create; overrides.tools hides the tools',
		async run(c) {
			await reset(c)
			const alice = await c.editor('alice')
			alice.setCurrentPage(LESSON)
			const frame = createShapeId()
			alice.createShape({ id: frame, type: 'frame', x: -300, y: 300 })
			await settle()
			return [allowed('Alice creates a frame', !!c.room.getRecord(frame), false)]
		},
	},
	{
		title: 'Agents limited to an area',
		story:
			'The helper agent may write only inside its purple frame. A note inside is kept. A note outside is not. A move of its note out of the frame is not kept.',
		people: ['agent'],
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
			if (agent.getShape(inside)) agent.reparentShapes([inside], LESSON)
			await settle()
			return [
				allowed('Agent writes inside its frame', !!c.room.getRecord(inside), true),
				allowed('Agent writes outside its frame', !!c.room.getRecord(outside), false),
				allowed(
					'Agent moves its note out of the frame',
					(c.room.getRecord(inside) as any)?.parentId === LESSON,
					false
				),
			]
		},
	},
	{
		title: 'Share links',
		story:
			'The same link, three roles in turn. The host maps each to access at connect: a view link and a comment link cannot draw, a student link can.',
		people: ['carol'],
		api: 'The host maps a link to a role: isReadonly, objectAccess, and meta',
		async run(c) {
			await reset(c)
			const checks = []
			for (const role of ['viewer', 'commenter', 'student'] as Role[]) {
				c.setRole('carol', role)
				const { kept } = await createNote(c, 'carol', -200)
				checks.push(allowed(`Link "${role}" draws a note`, kept, role === 'student'))
			}
			return checks
		},
	},
	{
		title: 'Comments: comment-only link',
		story:
			'A comment link has a read-only canvas but may write comments. A view link may write neither.',
		people: ['carol'],
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
				allowed(
					'Comment link comments on the read-only canvas',
					!!c.room.getRecord(ok.comment.id),
					true
				),
				allowed('View link comments', !!c.room.getRecord(denied.comment.id), false),
			]
		},
	},
	{
		title: 'Comments: add own, manage any',
		story:
			"Carol comments. Alice may not delete it. The teacher may take it down, but may not edit Carol's words.",
		people: ['carol', 'alice', 'teacher'],
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
				allowed("Alice deletes Carol's comment", aliceDeleted, false),
				allowed("Teacher edits Carol's comment", teacherEdited, false),
				allowed("Teacher takes down Carol's comment", fromRoom().isDeleted, true),
			]
		},
	},
	{
		title: 'Comments on hidden pages',
		story:
			'The teacher comments on the private Answers page. The comment is in the room, but Alice never receives it.',
		people: ['teacher', 'alice'],
		api: 'authorizeRead on comment-thread, comment, comment-reaction by pageId',
		async run(c) {
			await reset(c)
			const teacher = await c.editor('teacher')
			const { comment } = startThread(teacher, 'teacher', ANSWERS, 0)
			await settle()
			const alice = await c.editor('alice')
			return [
				allowed(
					'Teacher comments on the private Answers page',
					!!c.room.getRecord(comment.id),
					true
				),
				yes('Alice receives the comment', !!alice.store.get(comment.id as any), false),
			]
		},
	},
	{
		title: 'Live role change',
		story:
			'The teacher makes Alice a co-teacher. The room closes her session, her client reconnects, and the host gives it the new access: locks open and the private page arrives.',
		people: ['alice'],
		api: 'closeSession(id); the client reconnects with its new access',
		async run(c) {
			await reset(c)
			c.setRole('alice', 'teacher')
			const alice = await c.editor('alice')
			const hasPrompt = !!alice.getShape(PROMPT)
			const locked = alice.isShapeLocked(PROMPT)
			const seesAnswers = !!alice.getPage(ANSWERS)
			c.setRole('alice', 'student')
			return [
				yes("After the reconnect, Alice has the teacher's prompt", hasPrompt, true),
				yes("As co-teacher, the teacher's prompt is locked for Alice", locked, false),
				yes('As co-teacher, Alice receives the private Answers page', seesAnswers, true),
			]
		},
	},
	{
		title: 'Plugin record type',
		story:
			'A grade is a custom record type. Only the teacher writes grades, and each student receives only their own.',
		people: ['alice', 'carol'],
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
				allowed('Teacher grades Alice', !!c.room.getRecord(grade.id), true),
				yes('Alice receives her grade', !!alice.store.get(grade.id as any), true),
				yes("Carol receives Alice's grade", !!carol.store.get(grade.id as any), false),
				allowed(
					'Alice changes her grade',
					(c.room.getRecord(grade.id) as any).score === 'A+',
					false
				),
			]
		},
	},
	{
		title: 'Plugin shape type',
		story: 'The star stamp is a custom shape type. Only the teacher may award one.',
		people: ['teacher', 'alice'],
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
				allowed('Teacher awards a star stamp', !!c.room.getRecord(fromTeacher), true),
				allowed('Alice awards herself a star stamp', !!c.room.getRecord(fromAlice), false),
			]
		},
	},
	{
		title: 'Actions',
		story:
			"Lock is the teacher's action. It is not in Alice's menus, and a lock that she makes through the API is not kept.",
		people: ['alice', 'teacher'],
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
				allowed('Alice locks her own note', aliceLocked, false),
				allowed("Teacher locks Alice's note", !!(c.room.getRecord(id) as any)?.isLocked, true),
			]
		},
	},
	{
		title: 'Bindings follow their shapes',
		story:
			"Alice may connect her own arrow to the teacher's prompt, because that does not change the prompt. She may not connect the teacher's arrow to her note.",
		people: ['alice'],
		api: 'authorizeRecord.binding needs write access to the arrow; authorizeRead.binding follows it',
		async run(c) {
			await reset(c)
			const teacher = await c.editor('teacher')
			teacher.setCurrentPage(LESSON)
			const teacherArrow = createShapeId()
			teacher.createShape({ id: teacherArrow, type: 'arrow', x: 360, y: 60 })
			await settle()
			const { editor: alice, id: note } = await createNote(c, 'alice', 300)
			const aliceArrow = createShapeId()
			alice.createShape({ id: aliceArrow, type: 'arrow', x: 300, y: 380 })
			await settle()
			const own = bind(alice, aliceArrow, PROMPT)
			const theirs = bind(alice, teacherArrow, note)
			await settle()
			return [
				allowed("Alice connects her arrow to the teacher's prompt", !!c.room.getRecord(own), true),
				allowed(
					"Alice connects the teacher's arrow to her note",
					!!c.room.getRecord(theirs),
					false
				),
			]
		},
	},
	{
		title: 'A push is all or nothing',
		story:
			"A modified client sends one change with two records: a move of Alice's own note, which is allowed, and a move of the teacher's prompt, which is not. The room keeps neither.",
		people: ['alice'],
		api: 'TLSyncRoom rolls back a push when a rule denies any record in it',
		async run(c) {
			await reset(c)
			const { editor: alice, id } = await createNote(c, 'alice', 0)
			const note = alice.getShape(id)!
			const prompt = alice.getShape(PROMPT)!
			forcePut(alice, [
				{ ...note, x: note.x + 200 },
				{ ...prompt, x: prompt.x + 200 },
			])
			await settle()
			return [
				allowed(
					"The move of Alice's own note, in that push",
					(c.room.getRecord(id) as any).x !== note.x,
					false
				),
				allowed(
					"The move of the teacher's prompt, in that push",
					(c.room.getRecord(PROMPT) as any).x !== prompt.x,
					false
				),
				yes("Alice's editor goes back to the room's state", alice.getShape(id)!.x === note.x, true),
			]
		},
	},
]

function bind(editor: Editor, fromId: TLShapeId, toId: TLShapeId) {
	const id = createBindingId()
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
	return id
}
