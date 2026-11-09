import { useSync, type TLSyncCommandsApi } from '@tldraw/sync'
import { getShapeOwner } from '@tldraw/sync-collaboration'
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import {
	atom,
	createShapeId,
	createUserId,
	Editor,
	inlineBase64AssetStore,
	PageRecordType,
	react,
	renderPlaintextFromRichText,
	TLComment,
	TLComponents,
	Tldraw,
	TLShape,
	toRichText,
	uniqueId,
	useEditor,
	UserRecordType,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { actor, classroomCommands, schema, type ROLES } from './classroom'
import { LocalRoom } from './local-room'
import { Tour, useFocusedPanes } from './tour'
import './style.css'

// There's a guide at the bottom of this file!

// [1]
const local = new LocalRoom()

interface Person {
	id: string
	name: string
	color: string
	role: keyof typeof ROLES
}

const PEOPLE: Person[] = [
	{ id: 'teacher', name: 'Teacher', color: '#e03131', role: 'teacher' },
	{ id: 'alice', name: 'Alice', color: '#1971c2', role: 'student' },
	{ id: 'bob', name: 'Bob', color: '#2f9e44', role: 'student' },
	{ id: 'carol', name: 'Carol (comment link)', color: '#f08c00', role: 'commenter' },
]

const ANSWERS = PageRecordType.createId('answers')

// What the teacher controls. The host (local.room) acts on these; the panes show them.
const aliceCanEdit = atom('alice can edit', true)
const answersShared = atom('answers shared with alice', false)
const carolHasAccess = atom('carol has access', true)
const roleOf: Record<string, keyof typeof ROLES> = Object.fromEntries(
	PEOPLE.map((p) => [p.id, p.role])
)

// one stable connect function and user store per person, so useSync connects once
const SESSIONS = Object.fromEntries(
	PEOPLE.map((p) => [
		p.id,
		{
			// read at each connect, so a reconnect gets the actor the host gives now
			connect: local.connectAs(p.id, () => actor(p.id, roleOf[p.id])),
			users: {
				currentUser: atom(
					'user',
					UserRecordType.create({ id: createUserId(p.id), name: p.name, color: p.color })
				),
			},
		},
	])
)

// Four editors share one page. Only the pane you last clicked takes keyboard shortcuts, so Delete
// in Bob's pane does not also delete Alice's selection.
let focusedEditor: Editor | null = null
function focusPane(editor: Editor | null) {
	if (!editor || editor === focusedEditor) return
	focusedEditor?.blur()
	editor.focus()
	focusedEditor = editor
}

const CommandsContext = createContext<TLSyncCommandsApi | null>(null)

export default function CommandPermissionsExample() {
	// the server closes a session that loses read; when access comes back, Carol opens the file again
	const carolKey = useValue(
		'carol access',
		() => (carolHasAccess.get() ? 'carol' : 'carol-off'),
		[]
	)
	const focused = useFocusedPanes()
	return (
		<div className="cp-root">
			<Tour />
			<div className="cp-grid">
				{PEOPLE.map((person) => (
					<div key={person.id} className="cp-slot" data-focus={focused.includes(person.id)}>
						<Pane key={person.id === 'carol' ? carolKey : person.id} person={person} />
					</div>
				))}
			</div>
		</div>
	)
}

function Pane({ person }: { person: Person }) {
	const [denied, setDenied] = useState<string | null>(null)
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
	const [editor, setEditor] = useState<Editor | null>(null)

	// [2]
	const store = useSync({
		...SESSIONS[person.id],
		schema,
		assets: inlineBase64AssetStore,
		commands: classroomCommands,
		onPushRejected: ({ reason }) => {
			setDenied(reason)
			clearTimeout(timer.current)
			timer.current = setTimeout(() => setDenied(null), 2500)
		},
	})
	const commands = store.status === 'synced-remote' ? store.commands : null

	const onMount = useCallback(
		(editor: Editor) => {
			setEditor(editor)
			if (person.role === 'teacher' && commands) seedLesson(editor, commands)
			// the teacher's lesson reaches the other panes a moment later; fit it once it arrives
			const stop = react('fit lesson', () => {
				if (editor.getCurrentPageShapes().length < 4) return
				editor.timers.setTimeout(() => {
					stop()
					editor.zoomToFit()
				}, 0)
			})
		},
		[person.role, commands]
	)

	if (store.status === 'error') {
		return (
			<div
				className="cp-pane cp-loading"
				style={{ '--cp-color': person.color } as React.CSSProperties}
			>
				<strong>{person.name}</strong>
				<span>You no longer have access to this file.</span>
			</div>
		)
	}
	if (!commands) {
		return <div className="cp-pane cp-loading">Connecting…</div>
	}

	return (
		<CommandsContext.Provider value={commands}>
			<div
				className="cp-pane"
				style={{ '--cp-color': person.color } as React.CSSProperties}
				onPointerDownCapture={() => focusPane(editor)}
			>
				<PaneHeader person={person} editor={editor} commands={commands} />
				<div className="cp-canvas">
					<Tldraw store={store} components={components} onMount={onMount} autoFocus={false} />
					{denied && <div className="cp-denied">Not allowed: {denied}</div>}
				</div>
			</div>
		</CommandsContext.Provider>
	)
}

function PaneHeader({
	person,
	editor,
	commands,
}: {
	person: Person
	editor: Editor | null
	commands: TLSyncCommandsApi
}) {
	const permissions = useValue('permissions', () => commands.getActor().permissions, [commands])
	const selected = useValue('selected', () => editor?.getOnlySelectedShape() ?? null, [editor])
	// [11]
	const canVote = useValue(
		'can vote',
		() => !!selected && commands.canRun('votes.toggle', { shapeId: selected.id }),
		[commands, selected]
	)
	const canComment = useValue(
		'can comment',
		() => !!editor && commands.canRun('comments.add', newComment(editor, '')),
		[commands, editor]
	)
	const canManagePages = useValue(
		'can manage pages',
		() => commands.canRun('pages.create', { id: PageRecordType.createId(), name: 'Group work' }),
		[commands]
	)
	const canDeletePage = useValue(
		'can delete page',
		() => !!editor && commands.canRun('pages.delete', { id: editor.getCurrentPageId() }),
		[commands, editor]
	)
	const [online, setOnline] = useState(true)
	const canEditAlice = useValue(aliceCanEdit)
	const shared = useValue(answersShared)
	const carolAccess = useValue(carolHasAccess)

	// [3]
	const run = (name: string, args: unknown) => commands.run(name, args)

	return (
		<div className="cp-header">
			<div className="cp-title">
				<strong>{person.name}</strong>
				<span className="cp-perms">{permissions.join(', ') || 'no permissions'}</span>
			</div>
			<div className="cp-actions">
				<button
					disabled={!canVote}
					onClick={() => {
						if (!selected || !editor) return
						editor.markHistoryStoppingPoint('vote')
						run('votes.toggle', { shapeId: selected.id })
					}}
				>
					Vote on selection
				</button>
				<button
					disabled={!canComment}
					onClick={() => {
						if (!editor) return
						editor.markHistoryStoppingPoint('comment')
						run('comments.add', newComment(editor, `Hello from ${person.name}`))
					}}
				>
					Comment
				</button>
				<label title="Drop this client's connection. Edits and commands wait, then go to the server on reconnect.">
					<input
						type="checkbox"
						checked={online}
						onChange={(e) => {
							setOnline(e.target.checked)
							// [9]
							local.setOnline(person.id, e.target.checked)
						}}
					/>
					Online
				</label>
				{canManagePages && (
					<>
						<button
							onClick={() =>
								run('pages.create', { id: PageRecordType.createId(), name: 'Group work' })
							}
						>
							New page
						</button>
						<label>
							<input
								type="checkbox"
								checked={shared}
								onChange={(e) => {
									answersShared.set(e.target.checked)
									// [7]
									run('pages.setReaders', {
										id: ANSWERS,
										readers: e.target.checked ? ['alice'] : [],
									})
								}}
							/>
							Share answers with Alice
						</label>
						<button
							disabled={!canDeletePage}
							onClick={() => {
								if (!editor) return
								editor.markHistoryStoppingPoint('delete page')
								// [10]
								run('pages.delete', { id: editor.getCurrentPageId() })
							}}
						>
							Delete page
						</button>
					</>
				)}
				{/* [12] */}
				{person.role === 'teacher' && (
					<>
						<label>
							<input
								type="checkbox"
								checked={canEditAlice}
								onChange={(e) => {
									aliceCanEdit.set(e.target.checked)
									roleOf.alice = e.target.checked ? 'student' : 'mutedStudent'
									// [4]
									local.room.updateSessionActor('alice', actor('alice', roleOf.alice))
								}}
							/>
							Alice can edit
						</label>
						<label>
							<input
								type="checkbox"
								checked={carolAccess}
								onChange={(e) => {
									carolHasAccess.set(e.target.checked)
									roleOf.carol = e.target.checked ? 'commenter' : 'noAccess'
									// [8]
									if (!e.target.checked) {
										local.room.updateSessionActor('carol', actor('carol', 'noAccess'))
									}
								}}
							/>
							Carol has access
						</label>
						<button onClick={askAgent}>Ask the agent</button>
					</>
				)}
			</div>
			{editor && <CommentList editor={editor} commands={commands} />}
		</div>
	)
}

function CommentList({ editor, commands }: { editor: Editor; commands: TLSyncCommandsApi }) {
	const comments = useValue(
		'comments',
		() =>
			(editor.store.allRecords() as unknown as TLComment[]).filter(
				(r) => r.typeName === 'comment' && !r.isDeleted && r.pageId === editor.getCurrentPageId()
			),
		[editor]
	)
	// the same rule the server runs; the button stays clickable so you can see the server refuse
	const deletable = useValue(
		'deletable comments',
		() =>
			new Set(
				comments
					.filter((c) => commands.canRun('comments.delete', { commentId: c.id }))
					.map((c) => c.id)
			),
		[comments, commands]
	)
	if (comments.length === 0) return null
	return (
		<ul className="cp-comments">
			{comments.map((c) => (
				<li key={c.id}>
					<b>{c.authorId}</b>: {renderPlaintextFromRichText(editor, c.body)}
					<button
						data-locked={!deletable.has(c.id)}
						title={
							deletable.has(c.id) ? 'Delete' : 'Only the author or a moderator can delete this'
						}
						onClick={() => commands.run('comments.delete', { commentId: c.id })}
					>
						{deletable.has(c.id) ? '×' : '🔒'}
					</button>
				</li>
			))}
		</ul>
	)
}

// [5]
function VoteBadges() {
	const editor = useEditor()
	const ctx = useContext(CommandsContext)
	const shapes = useValue(
		'voted shapes',
		() =>
			editor
				.getCurrentPageShapes()
				.filter((s) => Array.isArray(s.meta.votes) && s.meta.votes.length > 0)
				.map((shape) => {
					const bounds = editor.getShapePageBounds(shape)!
					return { shape, at: editor.pageToViewport({ x: bounds.maxX, y: bounds.minY }) }
				}),
		[editor]
	)
	return (
		<>
			{shapes.map(({ shape, at }) => {
				const votes = shape.meta.votes as string[]
				return (
					<div
						key={shape.id}
						className="cp-votes"
						data-mine={ctx ? votes.includes(ctx.getActor().userId ?? '') : false}
						style={{ left: at.x - 12, top: at.y - 12 }}
					>
						{votes.length}
					</div>
				)
			})}
		</>
	)
}

// [6]
function OwnerLabels() {
	const editor = useEditor()
	const ctx = useContext(CommandsContext)
	const shapes = useValue(
		'owned shapes',
		() =>
			editor
				.getCurrentPageShapes()
				.filter((shape) => getShapeOwner(shape) && shape.type !== 'frame')
				.map((shape) => {
					const bounds = editor.getShapePageBounds(shape)!
					return { shape, at: editor.pageToViewport({ x: bounds.minX, y: bounds.maxY }) }
				}),
		[editor]
	)
	if (!ctx) return null
	return (
		<>
			{shapes.map(({ shape, at }) => {
				const canEdit = ctx.canEdit('update', shape, shape)
				return (
					<div
						key={shape.id}
						className="cp-owner"
						data-locked={!canEdit}
						style={{ left: at.x, top: at.y + 2 }}
					>
						{canEdit ? '' : '🔒 '}
						{getShapeOwner(shape)}
					</div>
				)
			})}
		</>
	)
}

const components: TLComponents = {
	// the panes are small; keep the canvas clear
	StylePanel: null,
	InFrontOfTheCanvas: () => (
		<>
			<VoteBadges />
			<OwnerLabels />
		</>
	),
}

function newComment(editor: Editor, text: string) {
	return {
		threadId: 'comment-thread:' + uniqueId(),
		commentId: 'comment:' + uniqueId(),
		pageId: editor.getCurrentPageId(),
		anchor: { type: 'page' },
		body: toRichText(text),
	}
}

function seedLesson(editor: Editor, commands: TLSyncCommandsApi) {
	if (editor.getCurrentPageShapes().length > 0) return
	const frame = (x: number, y: number, name: string, meta: TLShape['meta']) =>
		editor.createShape({
			id: createShapeId(),
			type: 'frame',
			x,
			y,
			props: { w: 340, h: 240, name },
			meta,
		})
	frame(0, 0, "Alice's area", { assignee: 'alice' })
	frame(380, 0, "Bob's area", { assignee: 'bob' })
	frame(760, 0, 'Agent area', { agentArea: true })
	editor.createShape({
		type: 'note',
		x: 1140,
		y: 0,
		props: { richText: toRichText('Draw your idea in your area. Vote for the best one!') },
	})
	// [7] a page only the teacher can read, until the teacher shares it
	commands.run('pages.create', { id: ANSWERS, name: 'Answers (teacher only)' })
	commands.run('pages.setReaders', { id: ANSWERS, readers: [] })
	editor.createShape({
		type: 'note',
		parentId: ANSWERS,
		x: 0,
		y: 0,
		props: { richText: toRichText('Answer: the water cycle has four stages.') },
	})
	editor.clearHistory()
}

let agent: ReturnType<LocalRoom['headlessClient']> | null = null
const IDEAS = ['Use a timeline', 'Compare two maps', 'Draw the water cycle', 'Make a quiz']
function askAgent() {
	agent ??= local.headlessClient('agent', actor('agent', 'agent'))
	// the agent connects on its first call; give it a moment
	setTimeout(() => {
		agent!.runCommand('agent.addNote', {
			id: createShapeId(),
			text: IDEAS[Math.floor(Math.random() * IDEAS.length)],
		})
	}, 400)
}

/*
This example runs a sync room in the page with four people on it. Each pane is a real client of the
same room: a teacher, two students, and someone who opened a comment-only link.

[1]
LocalRoom wraps a TLSocketRoom with the classroom commands (see classroom.ts). In a real app the room
runs on your server, and the same classroom.ts is imported on both sides.

[2]
useSync takes the same command set. The client runs commands at once, and the server runs them
again with the actor the host gave the session. The edit policy also runs on the client, so a shape
you cannot edit acts locked instead of moving and jumping back.

[3]
A command is a name and JSON args. New ids and timestamps go in the args, so the client and the
server make the same records. A command that returns its inverse goes on the undo stack: press
Cmd+Z after a vote or a comment, and the client sends the inverse command.

[4]
The host changes a session's actor while it is open. Alice's canvas turns read-only at once, and her
next push is checked with the new actor.

[5]
Votes live in shape meta, but only the votes.toggle command writes them. A student can vote on the
teacher's note, which the edit lane would never let them change.

[6]
canEdit runs the shared edit policy, so the UI can show what is locked before you try.

[11]
The buttons ask canRun, which runs the command's own rules on this client's records and drops the
writes. It is the same code the server runs, so the UI never keeps a second copy of the rules.

[12]
These controls stand for the host, the app's own server code. Changing an actor or a share link is
not a command: the host decides it and the room applies it.

[7]
The "Answers" page has readers set to nobody, so only the teacher (who manages pages) gets it. The
server never sends it, or its shapes, comments, and cursors, to the students. Sharing it with Alice
sends it to her at once; unsharing removes it, and her editor moves to another page.

[8]
Removing read closes Carol's session at once. Turning it back on lets her open the file again.

[9]
Take a pane offline, vote and comment, then come back online. The client sends the commands again
as commands with their ids, so the server applies each one once.

[10]
pages.delete removes the page and everything on it in one step, and returns pages.restore with the
removed records as its inverse. Press Cmd+Z after a delete: the server checks the restore like any
other command, so a modified client cannot use it to forge records.
*/
