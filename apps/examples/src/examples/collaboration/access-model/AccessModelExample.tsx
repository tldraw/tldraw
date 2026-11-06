import { CanvasComments, CommentTool, commentToolOverrides } from '@tldraw/commenting'
import { useSync } from '@tldraw/sync'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	DefaultToolbar,
	DefaultToolbarContent,
	Editor,
	TLComponents,
	TL_ACCESS_ROOT,
	ToolbarItem,
	Tldraw,
	TldrawUiButton,
	accessSchemaRecords,
	atom,
	commentSchemaRecords,
	createUserId,
	inlineBase64AssetStore,
	useEditor,
	useValue,
} from 'tldraw'
import '@tldraw/commenting/commenting.css'
import 'tldraw/tldraw.css'
import './access-model.css'
import { LocalRoom } from './localRoom'
import { Actor, Scenario, scenarios, sessionAccessFor } from './scenarios'
import { voteSchemaRecords } from './votes'

// There's a guide at the bottom of this file!

const records = { ...accessSchemaRecords, ...commentSchemaRecords, ...voteSchemaRecords }

export default function AccessModelExample() {
	const [scenarioId, setScenarioId] = useState(scenarios[0].id)
	const scenario = scenarios.find((s) => s.id === scenarioId)!
	return (
		<div className="tldraw__editor access-model">
			<div className="access-model__tabs">
				{scenarios.map((s) => (
					<button
						key={s.id}
						className="access-model__tab"
						data-active={s.id === scenarioId}
						onClick={() => setScenarioId(s.id)}
					>
						{s.title}
					</button>
				))}
			</div>
			<ScenarioView key={scenario.id} scenario={scenario} />
		</div>
	)
}

// [6]
function CommentingToolbar() {
	const editor = useEditor()
	const canComment = useValue(
		'can comment',
		() => editor.access.can('comment', editor.getCurrentPageId()),
		[editor]
	)
	return (
		<DefaultToolbar>
			<DefaultToolbarContent />
			{canComment && <ToolbarItem tool="comment" />}
		</DefaultToolbar>
	)
}

// [1]
function ScenarioView({ scenario }: { scenario: Scenario }) {
	const room = useMemo(() => new LocalRoom(scenario.model, scenario.records()), [scenario])
	useEffect(() => () => room.room.close(), [room])
	const [actors, setActors] = useState(scenario.actors)
	const actorsRef = useRef(actors)
	actorsRef.current = actors
	const editors = useRef(new Map<string, Editor>())

	const setActor = useCallback(
		(id: string, change: Partial<Actor>) => {
			const next = actorsRef.current.map((a) => (a.id === id ? { ...a, ...change } : a))
			actorsRef.current = next
			setActors(next)
			// [2]
			room.room.updateSessionAccess(id, sessionAccessFor(next.find((a) => a.id === id)!))
		},
		[room]
	)

	return (
		<>
			<div className="access-model__panel">
				<pre className="access-model__how">{scenario.how}</pre>
				<p>{scenario.summary}</p>
				<ol>
					{scenario.tryThis.map((t) => (
						<li key={t}>{t}</li>
					))}
				</ol>
				<div className="access-model__actions">
					{scenario.actions.map((action) => (
						<TldrawUiButton
							key={action.label}
							type="normal"
							onClick={() =>
								action.run({
									editor: (id) => editors.current.get(id),
									setActor,
									actor: (id) => actorsRef.current.find((a) => a.id === id)!,
								})
							}
						>
							{action.label}
						</TldrawUiButton>
					))}
				</div>
			</div>
			<div className="access-model__panes">
				{actors.map((actor) => (
					<Pane
						key={actor.id}
						scenario={scenario}
						room={room}
						actor={actor}
						getActor={() => actorsRef.current.find((a) => a.id === actor.id)!}
						onEditor={(editor) => editors.current.set(actor.id, editor)}
					/>
				))}
			</div>
		</>
	)
}

// [3]
function Pane({
	scenario,
	room,
	actor,
	getActor,
	onEditor,
}: {
	scenario: Scenario
	room: LocalRoom
	actor: Actor
	getActor(): Actor
	onEditor(editor: Editor): void
}) {
	const [editor, setEditor] = useState<Editor | null>(null)
	const connect = useCallback(
		() => room.connect(actor.id, actor.name, () => sessionAccessFor(getActor())),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[room, actor.id]
	)
	const users = useMemo(
		() => ({
			currentUser: atom('user', {
				id: createUserId(actor.id),
				typeName: 'user' as const,
				name: actor.name,
				color: actor.color,
				imageUrl: '',
				meta: {},
			}),
		}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[actor.id]
	)
	const store = useSync({
		connect,
		assets: inlineBase64AssetStore,
		access: scenario.model,
		records,
		users,
	})

	const tools = useMemo(
		() =>
			scenario.comments
				? [
						// [4]
						CommentTool.configure({
							canComment: ({ editor }) => editor.access.can('comment', editor.getCurrentPageId()),
							canModifyComment: ({ editor, ...change }) =>
								editor.access.can(
									'comment:edit',
									change.action === 'delete-thread' ? change.thread.id : change.comment.id
								),
						}),
					]
				: [],
		[scenario.comments]
	)
	const components = useMemo<TLComponents>(
		() =>
			scenario.comments
				? {
						Toolbar: CommentingToolbar,
						InFrontOfTheCanvas: () => (
							<CanvasComments
								currentUserId={actor.id}
								resolveAuthor={(id) => {
									const a = scenario.actors.find((a) => a.id === id)
									return a && { name: a.name, color: a.color }
								}}
							/>
						),
					}
				: {},
		[scenario.comments, scenario.actors, actor.id]
	)

	return (
		<div className="access-model__pane" style={{ borderColor: actor.color }}>
			<PaneHeader actor={actor} editor={editor} scenario={scenario} />
			<div className="access-model__canvas">
				<Tldraw
					store={store}
					tools={tools}
					overrides={scenario.comments ? [commentToolOverrides] : undefined}
					components={components}
					onMount={(e) => {
						setEditor(e)
						onEditor(e)
						e.user.updateUserPreferences({ name: actor.name, color: actor.color })
					}}
				/>
			</div>
		</div>
	)
}

// [5]
function PaneHeader({
	actor,
	editor,
	scenario,
}: {
	actor: Actor
	editor: Editor | null
	scenario: Scenario
}) {
	const status = useValue(
		'access status',
		() => {
			if (!editor) return null
			const page = editor.getCurrentPageId()
			const verbs = ['read', 'comment', 'create', 'update', 'delete', 'manage'].filter((v) =>
				editor.access.can(v, page)
			)
			return {
				verbs,
				readonly: editor.getIsReadonly(),
				denial: editor.access.getLastDenial(),
				extra: scenario.inspect?.(editor) ?? null,
				why: explainShape(editor),
			}
		},
		[editor, scenario]
	)
	return (
		<div className="access-model__header">
			<strong style={{ color: actor.color }}>{actor.name}</strong>{' '}
			<span className="access-model__muted">
				roles: {actor.roles.join(', ')}
				{actor.limit ? ` · ceiling: ${actor.limit.join(', ')}` : ''}
			</span>
			{status && (
				<div className="access-model__muted">
					on this page: {status.verbs.join(', ') || 'nothing'}
					{status.readonly ? ' · readonly canvas' : ''}
				</div>
			)}
			{status?.extra && <div className="access-model__muted">{status.extra}</div>}
			{status?.why && (
				<div className="access-model__why">
					<span className="access-model__muted">{status.why.label}:</span>
					{status.why.rows.map((row) => (
						<div key={row.verb} data-allowed={row.allowed}>
							{row.allowed ? '✓' : '✗'} {row.verb}: {row.text}
						</div>
					))}
				</div>
			)}
			{status?.denial && (
				<div className="access-model__denial">
					Last write rolled back: {status.denial.verb} on {status.denial.id}. {status.denial.reason}
				</div>
			)}
		</div>
	)
}

// [7]
function explainShape(editor: Editor) {
	const id = editor.getOnlySelectedShapeId() ?? editor.getHoveredShapeId()
	const shape = id && editor.getShape(id)
	if (!shape) return null
	const label = `${shape.type} owned by ${(shape.meta.ownerId as string) ?? 'nobody'}`
	const rows = ['read', 'update', 'delete'].map((verb) => {
		const d = editor.access.explain(verb, shape)
		if (!d) return { verb, allowed: true, text: 'no model' }
		const e = d.entry
		const who = !e
			? ''
			: e.subject.type === 'anyone'
				? 'anyone'
				: e.subject.type === 'relation'
					? `the ${e.subject.relation}`
					: `${e.subject.type} ${e.subject.id}`
		const on =
			e?.resource === d.id
				? 'this shape'
				: e?.resource === editor.getCurrentPageId()
					? 'this page'
					: e?.resource === TL_ACCESS_ROOT
						? 'the room'
						: e?.resource
		const text = e
			? `${e.effect} ${e.verbs.join(', ')} for ${who}, on ${on}`
			: d.at === null && !d.allowed && d.reason.startsWith('no entry')
				? `${d.reason}: closed by default`
				: d.reason
		return { verb, allowed: d.allowed, text }
	})
	return { label: `Why, for the ${label}`, rows }
}

/*
This example runs a sync room in the page and connects one editor per person to it, so you can
watch one access model at work from every side at once.

[1]
Each scenario seeds a fresh `TLSocketRoom` with an access model (`createTLAccessModel`). The room
enforces the model: it checks each push as a whole, and sends each session only the records it may
read. See `localRoom.ts` for the in-page server and `scenarios.ts` for the models and records.

[2]
A role change in the host (a real app would read it from its database) reaches a connected client
with `room.updateSessionAccess`. The client gets its new access, and any records it may now read,
without a reconnect. Writes it sends after that are checked against the new access.

[3]
Each pane is an ordinary `useSync` client. The only access option is `access: model`: the editor
then runs the same model as the server. It checks every local write in one place (a write guard on
the store), so a denied operation is rolled back as a whole, with nothing left in the undo stack.
Readonly mode and locked shapes come from the model too: a shape you may not update behaves as
locked.

[4]
The commenting UI asks the same model, through `editor.access.can`, instead of having its own
rules. The server enforces the same verbs.

[5]
`editor.access.can(verb, id)` is reactive, and `editor.access.getLastDenial()` gives the reason for
the last write the guard rolled back.

[6]
A commenter's editor is readonly (they may not create shapes), so the toolbar shows only the
readonly tools. The comment tool is readonly-ok, and shows when the session has the `comment` verb.

[7]
The "why" lines come from `editor.access.explain(verb, shape)`: the same walk the server runs,
with the entry that decided. Select or hover a shape to see them.
*/
