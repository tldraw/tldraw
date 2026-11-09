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
	react,
	toRichText,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { ACTORS, AGENT_FRAME_ID, Actor, authorize } from './classroom'
import { connectLocal, createLocalRoom, schema } from './localRoom'
import { STEPS } from './steps'
import './sync-authorize.css'

// There's a guide at the bottom of this file!

type Room = TLSocketRoom<TLRecord, Actor>

const ActorContext = createContext<Actor>(ACTORS.teacher)

const PANEL_IDS = ['panel-1', 'panel-2', 'panel-3'] as const

export default function SyncAuthorizeExample() {
	const [atomicPushes, setAtomicPushes] = useState(false)
	const [stepIndex, setStepIndex] = useState(0)
	const [actors, setActors] = useState(() => STEPS[0].panels.map((id) => ACTORS[id]))
	const [checks, setChecks] = useState([true, true, true])

	// [12]
	const goTo = (index: number) => {
		const step = STEPS[index]
		setStepIndex(index)
		setActors(step.panels.map((id) => ACTORS[id]))
		setChecks(step.checks ?? [true, true, true])
	}

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
				<Walkthrough index={stepIndex} onGoTo={goTo} />
				<label className="sync-authorize__atomic">
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
					{PANEL_IDS.map((sessionId, i) => (
						<Panel
							key={sessionId}
							room={room}
							sessionId={sessionId}
							actor={actors[i]}
							onActorChange={(next) => setActors((all) => all.map((a, j) => (j === i ? next : a)))}
							editorChecks={checks[i]}
							onEditorChecksChange={(next) =>
								setChecks((all) => all.map((c, j) => (j === i ? next : c)))
							}
							seed={i === 0}
						/>
					))}
				</div>
			)}
		</div>
	)
}

function Walkthrough({ index, onGoTo }: { index: number; onGoTo(index: number): void }) {
	const step = STEPS[index]
	return (
		<section className="sync-authorize__step" aria-live="polite">
			<div className="sync-authorize__step-nav">
				<button disabled={index === 0} onClick={() => onGoTo(index - 1)}>
					Back
				</button>
				<span>
					Step {index + 1} of {STEPS.length}
				</span>
				<button disabled={index === STEPS.length - 1} onClick={() => onGoTo(index + 1)}>
					Next
				</button>
			</div>
			<div className="sync-authorize__step-body">
				<strong>{step.title}</strong>
				<p>{step.rule}</p>
				<ol>
					{step.try.map((line) => (
						<li key={line}>{line}</li>
					))}
				</ol>
			</div>
		</section>
	)
}

function Panel({
	room,
	sessionId,
	actor,
	onActorChange,
	editorChecks,
	onEditorChecksChange,
	seed = false,
}: {
	room: Room
	sessionId: string
	actor: Actor
	onActorChange(actor: Actor): void
	editorChecks: boolean
	onEditorChecksChange(on: boolean): void
	seed?: boolean
}) {
	const actorRef = useRef(actor)
	const [editor, setEditor] = useState<Editor | null>(null)

	// [2]
	const [currentUser] = useState(() =>
		atom(
			'current user',
			UserRecordType.create({ id: createUserId(actor.userId), name: actor.name })
		)
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
	useEffect(() => {
		if (actorRef.current === actor) return
		actorRef.current = actor
		currentUser.set(UserRecordType.create({ id: createUserId(actor.userId), name: actor.name }))
		room.updateSessionMeta(sessionId, actor)
	}, [actor, currentUser, room, sessionId])

	return (
		<div className="sync-authorize__panel">
			<div className="sync-authorize__header">
				<select
					value={actor.userId}
					onChange={(e) => onActorChange(ACTORS[e.target.value])}
					aria-label="User"
				>
					{Object.values(ACTORS).map((a) => (
						<option key={a.userId} value={a.userId}>
							{a.name}
						</option>
					))}
				</select>
				{editor && <PanelActions editor={editor} />}
				{/* [10] */}
				<label className="sync-authorize__checks">
					<input
						type="checkbox"
						checked={editorChecks}
						onChange={(e) => onEditorChecksChange(e.target.checked)}
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
							// [11]
							editor.disposables.add(
								react('tool gate', () => {
									const tool = editor.getCurrentToolId()
									if (editor.permissions.isEnabled() && !editor.permissions.can(`tool:${tool}`)) {
										editor.setCurrentTool('select')
									}
								})
							)
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
function PanelActions({ editor }: { editor: Editor }) {
	const canReveal = useValue('can reveal', () => editor.permissions.can('cards:reveal'), [editor])
	const canRunBot = useValue('can run bot', () => editor.permissions.can('bot:run'), [editor])
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
	if (canRunBot) {
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
					{denial.source === 'server' ? 'The room denied' : 'The editor denied'} {denial.action}:{' '}
					{denial.reason ?? 'no reason'}
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
				currentUserId={actor.userId}
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
`editor.permissions.can()` answers UI questions with the same rules that the room runs. The UI
has no permission logic of its own: each button shows only when its custom action
(`cards:reveal`, `bot:run`) is allowed. The bot's button writes one shape inside its frame and one
outside: the second is denied.

[6]
The last denied write, and the reason that the rule gave. With editor checks on, the editor denies
the write before it is sent. With them off, the room denies it, sends the reason back with the push
result, and `useSync` gives it to `editor.permissions`.

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

[11]
The toolbar hides the tools that the rules deny, but a keyboard shortcut can still select one. This
reaction puts the user back on the select tool. It is UX only: the room denies the tool's writes
anyway.

[12]
The walkthrough has one step per use case (see `steps.ts`). Each step sets the user and the editor
checks of each panel. A user change goes through `updateSessionMeta`, as in [3].
*/
