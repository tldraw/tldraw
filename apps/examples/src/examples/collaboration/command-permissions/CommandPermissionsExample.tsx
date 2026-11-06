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

// one stable connect function and user store per person, so useSync connects once
const SESSIONS = Object.fromEntries(
	PEOPLE.map((p) => [
		p.id,
		{
			connect: local.connectAs(p.id, actor(p.id, p.role)),
			users: {
				currentUser: atom(
					'user',
					UserRecordType.create({ id: createUserId(p.id), name: p.name, color: p.color })
				),
			},
		},
	])
)

const CommandsContext = createContext<{ commands: TLSyncCommandsApi; userId: string } | null>(null)

export default function CommandPermissionsExample() {
	return (
		<div className="cp-grid">
			{PEOPLE.map((person) => (
				<Pane key={person.id} person={person} />
			))}
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

	const onMount = useCallback(
		(editor: Editor) => {
			setEditor(editor)
			if (person.role === 'teacher') seedLesson(editor)
			// the teacher's lesson reaches the other panes a moment later; fit it once it arrives
			const stop = react('fit lesson', () => {
				if (editor.getCurrentPageShapes().length < 4) return
				editor.timers.setTimeout(() => {
					stop()
					editor.zoomToFit()
				}, 0)
			})
		},
		[person.role]
	)

	if (store.status !== 'synced-remote' || !store.commands) {
		return <div className="cp-pane cp-loading">Connecting…</div>
	}

	return (
		<CommandsContext.Provider value={{ commands: store.commands, userId: person.id }}>
			<div className="cp-pane" style={{ '--cp-color': person.color } as React.CSSProperties}>
				<PaneHeader person={person} editor={editor} commands={store.commands} />
				<div className="cp-canvas">
					<Tldraw store={store} components={components} onMount={onMount} />
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
	const [aliceCanEdit, setAliceCanEdit] = useState(true)

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
					disabled={!selected || !commands.can('votes:cast')}
					onClick={() => selected && run('votes.toggle', { shapeId: selected.id })}
				>
					Vote on selection
				</button>
				<button
					disabled={!editor}
					onClick={() =>
						editor &&
						run('comments.add', {
							threadId: 'comment-thread:' + uniqueId(),
							commentId: 'comment:' + uniqueId(),
							pageId: editor.getCurrentPageId(),
							anchor: { type: 'page' },
							body: toRichText(`Hello from ${person.name}`),
							now: Date.now(),
						})
					}
				>
					Comment
				</button>
				{person.role === 'teacher' && (
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
								checked={aliceCanEdit}
								onChange={(e) => {
									setAliceCanEdit(e.target.checked)
									// [4]
									local.room.updateSessionActor(
										'alice',
										actor('alice', e.target.checked ? 'student' : 'mutedStudent')
									)
								}}
							/>
							Alice can edit
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
	if (comments.length === 0) return null
	return (
		<ul className="cp-comments">
			{comments.map((c) => (
				<li key={c.id}>
					<b>{c.authorId}</b>: {renderPlaintextFromRichText(editor, c.body)}
					<button onClick={() => commands.run('comments.delete', { commentId: c.id })}>×</button>
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
						data-mine={ctx ? votes.includes(ctx.userId) : false}
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
				const canEdit = ctx.commands.canEdit('update', shape, shape)
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

function seedLesson(editor: Editor) {
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
server make the same records.

[4]
The host changes a session's actor while it is open. Alice's canvas turns read-only at once, and her
next push is checked with the new actor.

[5]
Votes live in shape meta, but only the votes.toggle command writes them. A student can vote on the
teacher's note, which the edit lane would never let them change.

[6]
canEdit runs the shared edit policy, so the UI can show what is locked before you try.
*/
