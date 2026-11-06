import { CanvasComments, CommentTool, commentToolOverrides } from '@tldraw/commenting'
import '@tldraw/commenting/commenting.css'
import { TLSocketRoom, useSync } from '@tldraw/sync'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
	DefaultToolbar,
	Editor,
	PageRecordType,
	TLComponents,
	TLRecord,
	TLShapePartial,
	Tldraw,
	ToolbarItem,
	UserRecordType,
	atom,
	createShapeId,
	createUserId,
	inlineBase64AssetStore,
	toRichText,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { ACTORS, AGENT_FRAME_ID, Actor, authorize } from './classroom'
import { connectLocal, createLocalRoom, schema } from './localRoom'
import './sync-authorize.css'

// There's a guide at the bottom of this file!

type Room = TLSocketRoom<TLRecord, Actor>

const ActorContext = createContext<Actor>(ACTORS.teacher)

export default function SyncAuthorizeExample() {
	const [atomicPushes, setAtomicPushes] = useState(false)

	// [1]
	const [room, setRoom] = useState<Room | null>(null)
	useEffect(() => {
		const next = createLocalRoom({ authorize, atomicPushes })
		setRoom(next)
		return () => next.close()
	}, [atomicPushes])

	return (
		<div className="sync-authorize">
			<div className="sync-authorize__bar">
				<span>
					One <code>authorize</code> function runs in the sync room and in each editor. Switch a
					panel&apos;s user to see what they can see and do.
				</span>
				<label>
					<input
						type="checkbox"
						checked={atomicPushes}
						onChange={(e) => setAtomicPushes(e.target.checked)}
					/>
					Atomic pushes (resets the room)
				</label>
			</div>
			{room && (
				<div className="sync-authorize__panels">
					<Panel key="1" room={room} sessionId="panel-1" initialActor={ACTORS.teacher} seed />
					<Panel key="2" room={room} sessionId="panel-2" initialActor={ACTORS.ana} />
					<Panel key="3" room={room} sessionId="panel-3" initialActor={ACTORS.ben} />
				</div>
			)}
		</div>
	)
}

function Panel({
	room,
	sessionId,
	initialActor,
	seed = false,
}: {
	room: Room
	sessionId: string
	initialActor: Actor
	seed?: boolean
}) {
	const [actor, setActor] = useState(initialActor)
	const actorRef = useRef(actor)
	const [editor, setEditor] = useState<Editor | null>(null)
	const [editorChecks, setEditorChecks] = useState(true)

	// [2]
	const currentUser = useMemo(
		() =>
			atom(
				'current user',
				UserRecordType.create({ id: createUserId(initialActor.userId), name: initialActor.name })
			),
		[initialActor]
	)
	const connect = useCallback(
		() => connectLocal(room, sessionId, actorRef.current),
		[room, sessionId]
	)
	const store = useSync({
		connect,
		schema,
		assets: inlineBase64AssetStore,
		users: useMemo(() => ({ currentUser }), [currentUser]),
	})

	// [3]
	const changeActor = (next: Actor) => {
		setActor(next)
		actorRef.current = next
		currentUser.set(UserRecordType.create({ id: createUserId(next.userId), name: next.name }))
		room.updateSessionMeta(sessionId, next)
	}

	return (
		<div className="sync-authorize__panel">
			<div className="sync-authorize__header">
				<select
					value={actor.userId}
					onChange={(e) => changeActor(ACTORS[e.target.value])}
					aria-label="User"
				>
					{Object.values(ACTORS).map((a) => (
						<option key={a.userId} value={a.userId}>
							{a.name}
						</option>
					))}
				</select>
				{editor && <PanelActions editor={editor} actor={actor} />}
				{/* [10] */}
				<label className="sync-authorize__checks">
					<input
						type="checkbox"
						checked={editorChecks}
						onChange={(e) => setEditorChecks(e.target.checked)}
					/>
					Editor checks
				</label>
			</div>
			{editor && <DenialLine editor={editor} />}
			<div className="sync-authorize__canvas">
				<ActorContext.Provider value={actor}>
					<Tldraw
						store={store}
						// [4]
						permissions={editorChecks ? { authorize, actor } : undefined}
						components={components}
						tools={COMMENT_TOOLS}
						overrides={[commentToolOverrides]}
						onMount={(editor) => {
							setEditor(editor)
							if (seed) seedRoom(room, editor)
							editor.setCamera({ x: 40, y: 80, z: 0.6 })
						}}
					/>
				</ActorContext.Provider>
			</div>
		</div>
	)
}

// [5]
function PanelActions({ editor, actor }: { editor: Editor; actor: Actor }) {
	const canReveal = useValue('can reveal', () => editor.permissions.can('cards:reveal'), [editor])
	if (canReveal) {
		return (
			<button
				onClick={() => {
					const cards = editor.getCurrentPageShapes().filter((s) => s.meta.card && !s.meta.revealed)
					editor.updateShapes(cards.map((s) => ({ ...s, meta: { ...s.meta, revealed: true } })))
				}}
			>
				Reveal cards
			</button>
		)
	}
	if (actor.role === 'agent') {
		return (
			<button
				onClick={() => {
					// One shape inside the bot's frame, and one outside it.
					editor.createShapes([
						botBox(AGENT_FRAME_ID, 20 + Math.random() * 320, 20 + Math.random() * 180),
					])
					editor.createShapes([
						botBox(editor.getCurrentPageId(), 480 + Math.random() * 100, 520 + Math.random() * 200),
					])
				}}
			>
				Run bot
			</button>
		)
	}
	return null
}

function botBox(parentId: TLShapePartial['parentId'], x: number, y: number): TLShapePartial {
	return {
		id: createShapeId(),
		type: 'geo',
		parentId,
		x,
		y,
		props: { w: 80, h: 80, color: 'violet', fill: 'solid' },
	}
}

// [6]
function DenialLine({ editor }: { editor: Editor }) {
	const denial = useValue('denial', () => editor.permissions.getLastDenial(), [editor])
	return (
		<div className="sync-authorize__denial">
			{denial ? (
				<>
					Denied {denial.action}: {denial.reason ?? 'no reason'}
				</>
			) : (
				'No denied writes yet'
			)}
		</div>
	)
}

// [7]
const TOOLBAR = [
	{ item: 'select', tool: 'select' },
	{ item: 'hand', tool: 'hand' },
	{ item: 'draw', tool: 'draw' },
	{ item: 'eraser', tool: 'eraser' },
	{ item: 'arrow', tool: 'arrow' },
	{ item: 'text', tool: 'text' },
	{ item: 'note', tool: 'note' },
	{ item: 'rectangle', tool: 'geo' },
	{ item: 'frame', tool: 'frame' },
	{ item: 'comment', tool: 'comment' },
]

const COMMENT_TOOLS = [CommentTool]

const components: TLComponents = {
	Toolbar: function PermittedToolbar() {
		const editor = useEditor()
		const items = useValue(
			'permitted tools',
			() =>
				TOOLBAR.filter(
					({ tool }) => !editor.permissions.isEnabled() || editor.permissions.can(`tool:${tool}`)
				),
			[editor]
		)
		return (
			<DefaultToolbar>
				{items.map(({ item }) => (
					<ToolbarItem key={item} tool={item} />
				))}
			</DefaultToolbar>
		)
	},
	// [9]
	InFrontOfTheCanvas: function Comments() {
		const actor = useContext(ActorContext)
		return (
			<CanvasComments
				currentUserId={actor.role === 'viewer' ? null : actor.userId}
				resolveAuthor={(id) => {
					const actor = Object.values(ACTORS).find((a) => a.userId === id)
					return { name: actor?.name ?? id }
				}}
			/>
		)
	},
}

const seededRooms = new WeakSet<Room>()

// [8]
function seedRoom(room: Room, editor: Editor) {
	if (seededRooms.has(room)) return
	seededRooms.add(room)

	const lessonId = editor.getCurrentPageId()
	editor.updatePage({ id: lessonId, name: 'Lesson' })
	const redId = PageRecordType.createId('red')
	const blueId = PageRecordType.createId('blue')
	const lockedId = PageRecordType.createId('instructions')
	editor.createPage({ id: redId, name: 'Red team', meta: { team: 'red' } })
	editor.createPage({ id: blueId, name: 'Blue team', meta: { team: 'blue' } })
	editor.createPage({ id: lockedId, name: 'Instructions (locked)', meta: { locked: true } })

	const text = (parentId: any, x: number, y: number, value: string) => ({
		id: createShapeId(),
		type: 'text' as const,
		parentId,
		x,
		y,
		props: { richText: toRichText(value), size: 's' as const, autoSize: false, w: 560 },
	})
	const card = (holder: string, x: number, value: string) => ({
		id: createShapeId(),
		type: 'note' as const,
		parentId: lessonId,
		x,
		y: 140,
		props: { richText: toRichText(value), color: 'yellow' as const },
		meta: { card: true, holder, ownerId: holder, revealed: false },
	})

	editor.createShapes([
		text(lessonId, 0, 0, 'Draw here. You can only change your own shapes.'),
		text(lessonId, 0, 40, "Each card's text is hidden from other students until it is revealed."),
		card('ana', 0, "Ana's answer: 42"),
		card('ben', 240, "Ben's answer: 7"),
		{
			id: AGENT_FRAME_ID,
			type: 'frame',
			parentId: lessonId,
			x: 0,
			y: 520,
			props: { w: 440, h: 300, name: "Bot's frame" },
		},
		text(redId, 0, 0, 'Red team plan: only the red team and the teacher can see this page.'),
		text(blueId, 0, 0, 'Blue team plan: only the blue team and the teacher can see this page.'),
		text(lockedId, 0, 0, 'Instructions: only the teacher can change this page.'),
	])
}

/*
[1]
The room runs in this page so that the example can show three users at once. In a real app,
`TLSocketRoom` runs on your server with the same `authorize` function. See `localRoom.ts`.

[2]
Each panel is a separate client with its own session in the room. The actor that the room checks
is the session's `meta`.

[3]
A role change takes effect at once, with no reconnect. `updateSessionMeta` re-runs the read rules
for this session, so a team page appears or disappears. The editor gets the new actor through the
`permissions` prop.

[4]
The editor runs the same rules. It asks them before each local write is sent, and reverts a write
that they deny, so the user sees the result at once. The room still checks every write: the
client is not a security boundary.

[5]
`editor.permissions.can()` answers UI questions with the same rules. `cards:reveal` is a custom
action. The bot's button writes one shape inside its frame and one outside: the second is denied.

[6]
The last write that the editor reverted, and the reason that the rule gave.

[7]
The toolbar shows only the tools that `tool:<id>` allows. A shape that the actor cannot update
behaves as locked: it cannot be selected, moved, or deleted.

[8]
The teacher's panel sets up the room once. Team pages have a `team` in their meta, and the
locked page has `locked`. The teacher's own shapes have no owner, so no student can change them.

[9]
Comments use the same rules. Anyone with an identity can comment on a page they can see. Authors
edit and delete their own comments, and the teacher can delete anyone's. A view-only link and the
bot cannot comment. The comment UI asks `comments:write`, `comments:edit`, and `comments:delete`
through `editor.permissions`, so it hides what the room would deny.

[10]
Turn off "Editor checks" to see what the room alone enforces. The editor then writes whatever the
user does, and the room corrects it: a denied shape disappears a moment later. With the checks off,
draw an arrow from your shape to the teacher's text. The room stores the arrow without its binding,
or, with atomic pushes, rejects the whole arrow.
*/
