import { CanvasComments, CommentTool, commentToolOverrides } from '@tldraw/commenting'
import {
	checkRecordWrite,
	registerRecordRules,
	TLAuthorizerSession,
	TLRecordWrite,
	TLRemoteSyncError,
	TLSocketRoom,
	useSync,
} from '@tldraw/sync'
import { checkCommentWrite, CommentWriteProbe } from '@tldraw/sync-collaboration'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	atom,
	createTLSchema,
	defaultShapeSchemas,
	defaultShapeUtils,
	createUserId,
	DocumentRecordType,
	Editor,
	inlineBase64AssetStore,
	PageRecordType,
	Store,
	StoreSchema,
	TLComponents,
	TLDOCUMENT_ID,
	Tldraw,
	TLPage,
	TLShape,
	TLUiOverrides,
	toRichText,
	UserRecordType,
	useValue,
} from 'tldraw'
import '@tldraw/commenting/commenting.css'
import 'tldraw/tldraw.css'
import { InMemoryClientSocket } from './localRoom'
import {
	accessForRole,
	ClassroomMeta,
	ClassroomRecord,
	classroomRecords,
	classroomRules,
	isPageReadonlyFor,
	mayCreateShapeType,
	mayLockShapes,
	Role,
	TLGrade,
} from './rules'
import { StampShapeUtil, stampProps } from './stamp'
import './style.css'
import { AGENT_AREA, ANSWERS, Check, Classroom, LESSON, PROMPT, USE_CASES } from './useCases'

const shapeUtils = [StampShapeUtil]
// the client schema needs every shape type, built-in and plugin
const allShapeUtils = [...defaultShapeUtils, ...shapeUtils]

interface Person {
	userId: string
	name: string
	color: string
}

const PEOPLE: Person[] = [
	{ userId: 'teacher', name: 'Ms. Rivera', color: '#e03131' },
	{ userId: 'alice', name: 'Alice', color: '#1971c2' },
	{ userId: 'carol', name: 'Carol (shared link)', color: '#2f9e44' },
	{ userId: 'agent', name: 'Helper agent', color: '#9c36b5' },
]

// [1]
const access = atom<Record<string, ClassroomMeta>>('access', {
	teacher: { userId: 'teacher', role: 'teacher' },
	alice: { userId: 'alice', role: 'student' },
	carol: { userId: 'carol', role: 'commenter' },
	agent: { userId: 'agent', role: 'agent', areaId: AGENT_AREA },
})

/** Why the host refused each person's connection, if it did. The use case scripts read it. */
const refusals = atom<Record<string, string | null>>('refusals', {})

// [2]
function createRoom() {
	const room = new TLSocketRoom<ClassroomRecord, ClassroomMeta>({
		// comment records are not part of TLRecord, so the room's record union is wider
		schema: createTLSchema({
			shapes: { ...defaultShapeSchemas, stamp: { props: stampProps } },
			records: classroomRecords,
		}) as StoreSchema<ClassroomRecord, any>,
		objectTypes: ['comment-thread', 'comment', 'comment-reaction'],
		...classroomRules,
	})
	room.storage.transaction((txn) => {
		// a new room starts with one default page; replace it with the lesson's pages
		for (const record of [...txn.values()]) {
			if (record.typeName === 'page') txn.delete(record.id)
		}
		for (const record of [
			DocumentRecordType.create({ id: TLDOCUMENT_ID }),
			PageRecordType.create({
				id: LESSON,
				name: 'Lesson',
				index: 'a1' as any,
				meta: { home: true },
			}),
			PageRecordType.create({
				id: ANSWERS,
				name: 'Answers',
				index: 'a2' as any,
				meta: { private: true },
			}),
		]) {
			txn.set(record.id, record)
		}
	})
	return room
}

// [3]
function setRole(room: TLSocketRoom<ClassroomRecord, ClassroomMeta>, userId: string, role: Role) {
	access.update((a) => ({ ...a, [userId]: { ...a[userId], role } }))
	room.closeSession(userId)
}

export default function PermissionsClassroomExample() {
	const [room, setRoom] = useState<TLSocketRoom<ClassroomRecord, ClassroomMeta> | null>(null)
	useEffect(() => {
		const created = createRoom()
		setRoom(created)
		return () => created.close()
	}, [])
	// [9]
	const editors = useRef(new Map<string, { editor: Editor; role: Role }>())
	const onEditor = useCallback((userId: string, value: { editor: Editor; role: Role } | null) => {
		if (value) editors.current.set(userId, value)
		else editors.current.delete(userId)
	}, [])
	const roles = useValue('roles', () => access.get(), [])
	// the panes that the running use case is about
	const [focus, setFocus] = useState<string[]>([])
	if (!room) return null
	return (
		<div className="permissions-root">
			<div className="permissions-grid">
				{PEOPLE.map((person) => (
					<Pane
						// a refused link has no session to reconnect, so a new access mounts a new client
						key={`${person.userId}:${roles[person.userId].role === 'none'}`}
						room={room}
						person={person}
						onEditor={onEditor}
						focused={focus.includes(person.userId)}
					/>
				))}
			</div>
			<UseCasePanel room={room} editors={editors.current} onFocus={setFocus} />
		</div>
	)
}

function Pane({
	room,
	person,
	onEditor,
	focused,
}: {
	room: TLSocketRoom<ClassroomRecord, ClassroomMeta>
	person: Person
	onEditor(userId: string, value: { editor: Editor; role: Role } | null): void
	focused: boolean
}) {
	const { userId } = person
	// [4]
	const socket = useMemo(() => {
		const session = atom<TLAuthorizerSession<ClassroomMeta> | null>('session', null)
		return {
			session,
			connect: () =>
				new InMemoryClientSocket<ClassroomMeta>(
					room,
					userId,
					() => {
						const meta = access.get()[userId]
						const granted = accessForRole(meta.role)
						return granted && { meta, ...granted }
					},
					session
				),
		}
	}, [room, userId])
	const users = useMemo(
		() => ({
			currentUser: atom(
				'user',
				UserRecordType.create({ id: createUserId(userId), name: person.name, color: person.color })
			),
		}),
		[userId, person]
	)
	const store = useSync({
		connect: socket.connect,
		assets: inlineBase64AssetStore,
		users,
		shapeUtils: allShapeUtils,
		records: classroomRecords,
	})
	const role = useValue('role', () => socket.session.get()?.meta.role, [socket])
	const [denials, setDenials] = useState<string[]>([])
	const refusedReason =
		store.status === 'error'
			? ((store.error as TLRemoteSyncError).reason ?? store.error.message)
			: null
	useEffect(() => {
		refusals.update((r) => ({ ...r, [userId]: refusedReason }))
	}, [userId, refusedReason])
	const [editor, setEditor] = useState<Editor | null>(null)
	useEffect(() => {
		if (!editor || !role) return
		onEditor(userId, { editor, role })
		return () => onEditor(userId, null)
	}, [editor, role, userId, onEditor])
	const grade = useValue(
		'grade',
		() => (editor?.store.get(`grade:${userId}` as any) as TLGrade | undefined)?.score,
		[editor, userId]
	)

	// [5]
	const syncedStore = store.status === 'synced-remote' ? store.store : null
	useEffect(() => {
		if (!syncedStore) return
		const store = syncedStore as unknown as Store<ClassroomRecord>
		return registerRecordRules(store, classroomRules, () => socket.session.get()!, {
			onDeny: (write) => setDenials((d) => [describeDenial(write), ...d].slice(0, 3)),
		})
	}, [syncedStore, socket])

	// [6]
	const editorProps = useMemo(
		() => ({
			isShapeLocked: (shape: TLShape, editor: Editor) => {
				const session = socket.session.get()
				if (!session) return true
				const get = (id: string) => editor.store.get(id as any) as ClassroomRecord | undefined
				return !checkRecordWrite(classroomRules, session, get, {
					type: 'update',
					prev: shape,
					next: shape,
				})
			},
			isPageReadonly: (page: TLPage) => {
				const session = socket.session.get()
				return !session || isPageReadonlyFor(session.meta, page)
			},
		}),
		[socket]
	)

	// [7]
	const mayComment = useCallback(
		(editor: Editor, probe: CommentWriteProbe) => {
			const session = socket.session.get()
			const get = (id: string) => editor.store.get(id as any) as ClassroomRecord | undefined
			return !!session && checkCommentWrite(classroomRules, session, get, probe)
		},
		[socket]
	)
	const tools = useMemo(
		() => [
			CommentTool.configure({
				canComment: ({ editor }) =>
					mayComment(editor, { action: 'add-comment', pageId: editor.getCurrentPageId() }),
				canModifyComment: (ctx) => mayComment(ctx.editor, ctx),
			}),
		],
		[mayComment]
	)
	const overrides = useMemo<TLUiOverrides[]>(
		() => [
			commentToolOverrides,
			{
				actions(_editor, actions) {
					const session = socket.session.get()
					if (!session || !mayLockShapes(session.meta)) {
						delete actions['toggle-lock']
						delete actions['unlock-all']
					}
					return actions
				},
				tools(editor, tools) {
					const session = socket.session.get()
					// the comment tool is hidden on a read-only canvas unless it says otherwise
					if (tools.comment) {
						const pageId = editor.getCurrentPageId()
						tools.comment.readonlyOk = mayComment(editor, { action: 'add-comment', pageId })
					}
					for (const [id, tool] of Object.entries(tools)) {
						// the shape type that the tool creates; tools such as select create none
						const type = tool.meta?.geo ? 'geo' : id === 'asset' ? 'image' : id
						if (!editor.hasShapeUtil(type as TLShape['type'])) continue
						if (!session || !mayCreateShapeType(session.meta, type)) delete tools[id]
					}
					return tools
				},
			},
		],
		[socket, mayComment]
	)
	const components = useMemo<TLComponents>(
		() => ({
			InFrontOfTheCanvas: () => (
				<CanvasComments
					currentUserId={userId}
					resolveAuthor={(id) => PEOPLE.find((p) => p.userId === id) ?? { name: id }}
				/>
			),
		}),
		[userId]
	)

	return (
		<div className={focused ? 'permissions-pane permissions-pane-focused' : 'permissions-pane'}>
			<div className="permissions-header">
				<span className="permissions-dot" style={{ background: person.color }} />
				<strong>{person.name}</strong>
				<span className="permissions-role">{role ?? 'connecting'}</span>
				{grade && <span className="permissions-role">Grade: {grade}</span>}
				{editor && userId === 'teacher' && <TeacherControls editor={editor} room={room} />}
				{editor && userId === 'agent' && <AgentControls editor={editor} />}
			</div>
			<div className="permissions-denials">
				{denials.length ? denials.join(' · ') : <span>&nbsp;</span>}
			</div>
			<div className="permissions-canvas">
				{store.status === 'error' && (
					<div className="permissions-refused">No access to this file ({store.error.message})</div>
				)}
				{/* [8] */}
				{role && (
					<Tldraw
						key={role}
						store={store}
						shapeUtils={shapeUtils}
						tools={tools}
						overrides={overrides}
						components={components}
						onMount={(e) => {
							setEditor(e)
							if (userId === 'teacher') seedLesson(e)
							else e.timers.setTimeout(() => e.zoomToFit(), 100)
						}}
						{...editorProps}
					/>
				)}
			</div>
		</div>
	)
}

function UseCasePanel({
	room,
	editors,
	onFocus,
}: {
	room: TLSocketRoom<ClassroomRecord, ClassroomMeta>
	editors: Map<string, { editor: Editor; role: Role }>
	onFocus(userIds: string[]): void
}) {
	const [results, setResults] = useState<Record<string, Check[] | string>>({})
	const [running, setRunning] = useState<string | null>(null)
	const classroom = useMemo<Classroom>(
		() => ({
			room,
			async editor(userId) {
				for (let i = 0; i < 100; i++) {
					const entry = editors.get(userId)
					if (entry && entry.role === access.get()[userId].role) {
						await new Promise((r) => setTimeout(r, 300))
						return entry.editor
					}
					await new Promise((r) => setTimeout(r, 50))
				}
				throw new Error(`${userId} is not connected`)
			},
			setRole: (userId, role) => setRole(room, userId, role),
			async refusal(userId) {
				for (let i = 0; i < 40; i++) {
					const reason = refusals.get()[userId]
					if (reason) return reason
					await new Promise((r) => setTimeout(r, 50))
				}
				return null
			},
			getRole: (userId) => access.get()[userId].role,
		}),
		[room, editors]
	)
	const run = async (title: string) => {
		const useCase = USE_CASES.find((u) => u.title === title)!
		setRunning(title)
		onFocus(useCase.people)
		try {
			const checks = await useCase.run(classroom)
			setResults((r) => ({ ...r, [title]: checks }))
		} catch (e) {
			setResults((r) => ({ ...r, [title]: `Error: ${(e as Error).message}` }))
		}
		setRunning(null)
		onFocus([])
	}
	const finished = USE_CASES.filter((u) => Array.isArray(results[u.title]))
	const asExpected = finished.filter((u) =>
		(results[u.title] as Check[]).every((check) => check.actual === check.expected)
	)
	return (
		<div className="permissions-panel">
			<div className="permissions-panel-header">
				<strong>Use cases</strong>
				<button
					disabled={!!running}
					onClick={async () => {
						for (const u of USE_CASES) await run(u.title)
					}}
				>
					Run all
				</button>
			</div>
			<p className="permissions-intro">
				Four people share one room that runs in this page. Each pane is a full tldraw editor with
				its own connection. The rules are one object in <code>rules.ts</code>: the room enforces
				them, each client checks writes before it sends them, and each editor turns them into locks.
			</p>
			<p className="permissions-intro">
				&ldquo;Try it&rdquo; resets the board and makes the writes that a person would make. The
				panes it is about get a blue outline. Some scripts also send a write that skips the editor
				and the client rules, as a modified client could. Each line compares the room&rsquo;s result
				with what the rules say.
			</p>
			{finished.length > 0 && (
				<div className="permissions-summary">
					{asExpected.length} of {finished.length} use cases give the expected result
				</div>
			)}
			{USE_CASES.map((u) => {
				const result = results[u.title]
				return (
					<div key={u.title} className="permissions-case">
						<div className="permissions-case-title">
							<span>{u.title}</span>
							<button disabled={!!running} onClick={() => run(u.title)}>
								{running === u.title ? 'Running' : 'Try it'}
							</button>
						</div>
						<div>{u.story}</div>
						<code>{u.api}</code>
						{typeof result === 'string' && <div className="permissions-case-result">{result}</div>}
						{Array.isArray(result) &&
							result.map((check) => {
								const ok = check.actual === check.expected
								const word = (value: boolean) => check.words[value ? 0 : 1]
								return (
									<div
										key={check.label}
										className={
											ok
												? 'permissions-case-result'
												: 'permissions-case-result permissions-unexpected'
										}
									>
										{ok ? '✓' : '✗'} {check.label}: {word(check.actual)}
										{!ok && ` (expected ${word(check.expected)})`}
									</div>
								)
							})}
					</div>
				)
			})}
		</div>
	)
}

function describeDenial(write: TLRecordWrite<ClassroomRecord>) {
	const record = (write.next ?? write.prev)!
	const what = record.typeName === 'shape' ? `${(record as TLShape).type} shape` : record.typeName
	return `Not allowed: ${write.type} ${what}`
}

function TeacherControls({
	editor,
	room,
}: {
	editor: Editor
	room: TLSocketRoom<ClassroomRecord, ClassroomMeta>
}) {
	const answersPrivate = useValue('answers', () => !!editor.getPage(ANSWERS)?.meta.private, [
		editor,
	])
	const lessonReadonly = useValue('lesson', () => !!editor.getPage(LESSON)?.meta.readonly, [editor])
	const roles = useValue('roles', () => access.get(), [])
	const togglePage = (id: typeof LESSON, key: 'private' | 'readonly') => {
		const page = editor.getPage(id)!
		editor.updatePage({ id, meta: { ...page.meta, [key]: !page.meta[key] } })
	}
	return (
		<span className="permissions-controls">
			<label>
				<input
					type="checkbox"
					checked={answersPrivate}
					onChange={() => togglePage(ANSWERS, 'private')}
				/>
				Answers private
			</label>
			<label>
				<input
					type="checkbox"
					checked={lessonReadonly}
					onChange={() => togglePage(LESSON, 'readonly')}
				/>
				Lesson read-only
			</label>
			<select
				value={roles.alice.role}
				onChange={(e) => setRole(room, 'alice', e.target.value as Role)}
			>
				<option value="student">Alice: student</option>
				<option value="teacher">Alice: co-teacher</option>
			</select>
			<select
				value={roles.carol.role}
				onChange={(e) => setRole(room, 'carol', e.target.value as Role)}
			>
				<option value="commenter">Link: can comment</option>
				<option value="viewer">Link: can view</option>
				<option value="student">Link: can draw</option>
				<option value="none">Link: no access</option>
			</select>
		</span>
	)
}

function AgentControls({ editor }: { editor: Editor }) {
	return (
		<span className="permissions-controls">
			<button
				onClick={() => {
					// inside its area: allowed
					editor.createShape({
						type: 'note',
						parentId: AGENT_AREA,
						x: 20 + Math.random() * 200,
						y: 60 + Math.random() * 100,
						props: { richText: toRichText('Hint from the agent') },
					})
					// outside its area, and someone else's shape: denied by the same rules
					editor.createShape({ type: 'note', x: -400, y: 0 })
					const other = editor.getCurrentPageShapes().find((s) => s.meta.ownerId === 'teacher')
					if (other) editor.store.put([{ ...other, x: other.x + 50 }])
				}}
			>
				Run agent
			</button>
		</span>
	)
}

/** The teacher's board starts with a prompt, an area for the agent, and the answers. */
function seedLesson(editor: Editor) {
	if (editor.getCurrentPageShapes().length > 0) return
	editor.setCurrentPage(LESSON)
	editor.createShapes([
		{
			id: PROMPT,
			type: 'text',
			x: 0,
			y: -160,
			props: { richText: toRichText('Draw a triangle with three equal sides.') },
		},
		{
			id: AGENT_AREA,
			type: 'frame',
			x: 400,
			y: -100,
			props: { w: 400, h: 300, name: 'Agent area' },
		},
	])
	editor.setCurrentPage(ANSWERS)
	editor.createShape({
		type: 'text',
		x: 0,
		y: 0,
		props: { richText: toRichText('All angles: 60°') },
	})
	editor.setCurrentPage(LESSON)
	editor.zoomToFit()
}

/*
[1]
The host's "database" of who may do what. A real server reads this when a WebSocket connects. The
share link (Carol) maps to a role, as a share token would.

[2]
One room with the rules from rules.ts. `authorizeRecord` (writes) and `authorizeRead` (reads) are
the same object that each client uses below. The room starts with two pages; the Answers page is
private, so only the teacher receives it.

[3]
A role is session data, so changing it closes the session. The client reconnects at once and gets
its new access: `isReadonly`, `objectAccess`, and `meta`. Page visibility is record data, so it
changes live with no reconnect (try the "Answers private" box).

[4]
Each pane is a separate client. The socket keeps the access that the server gave it, so the client
rules check the same session as the server.

[5]
The same rules run on the client store: a write that the server would reject is canceled before
it is sent, and the pane says why. The server checks every write again.

[6]
Shapes that this person may not change are locked for this editor only, with the same rules (a
probe: "may I update this shape to itself?"). A read-only page makes the editor read-only while
it is the current page.

[7]
The UI asks the same rule functions as the server, never a copy of them. The comment options
probe the comment rules with checkCommentWrite: add your own, and the teacher may take down any
comment but edit none. The toolbar and the lock actions call mayCreateShapeType and mayLockShapes,
which the shape rule calls too.

[8]
Changing the role remounts the editor, so the tools and the UI match the new access.

[9]
The use case panel drives the four editors with scripts from useCases.ts. Each script resets the
board, makes the writes that a person would make, and reports what the server kept. Some scripts
also force a write past the editor and the client rules, to show that the server stops it too.
*/
