import { TLRelationsClient, defaultRelationSchema } from '@tldraw/sync'
import { useEffect, useRef, useState } from 'react'
import {
	DefaultToolbar,
	Editor,
	TLComponents,
	TLRelation,
	TLRecord,
	Tldraw,
	ToolbarItem,
	useEditor,
	useTools,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { LocalClient, LocalRoom } from './localRoom'
import { ROOT, Scenario, ScenarioEnv, scenarios } from './scenarios'
import './relation-permissions.css'

export default function RelationPermissionsExample() {
	const [id, setId] = useState(scenarios[0].id)
	const scenario = scenarios.find((s) => s.id === id)!
	return (
		<div className="rp-root">
			<div className="rp-tabs">
				{scenarios.map((s) => (
					<button key={s.id} data-active={s.id === id} onClick={() => setId(s.id)}>
						{s.title}
					</button>
				))}
			</div>
			<ScenarioView key={scenario.id} scenario={scenario} />
		</div>
	)
}

function ScenarioView({ scenario }: { scenario: Scenario }) {
	const [env, setEnv] = useState<{ room: LocalRoom; clients: Record<string, LocalClient> } | null>(
		null
	)
	const editors = useRef<Record<string, Editor>>({})
	const seeded = useRef(promiseWithResolve())

	// The owner joins first and seeds the file. The others join after the seed reaches the server,
	// so that what they may read is decided against the seeded file.
	useEffect(() => {
		const room = new LocalRoom(defaultRelationSchema, ROOT, scenario.tuples)
		const clients: Record<string, LocalClient> = {}
		let cancelled = false
		const [owner, ...others] = scenario.people
		;(async () => {
			clients[owner.name] = await room.join(owner.name, await owner.identity(), owner.color)
			if (cancelled) return
			setEnv({ room, clients: { ...clients } })
			await seeded.current.promise
			await new Promise((r) => setTimeout(r, 300))
			for (const person of others) {
				clients[person.name] = await room.join(person.name, await person.identity(), person.color)
			}
			if (!cancelled) setEnv({ room, clients: { ...clients } })
		})()
		return () => {
			cancelled = true
			Object.values(clients).forEach((c) => c.close())
			room.dispose()
		}
	}, [scenario])

	if (!env) return <div className="rp-loading">Starting the room…</div>
	const fullEnv: ScenarioEnv = { ...env, editors: editors.current }

	return (
		<div className="rp-scenario">
			<div className="rp-side">
				<p>{scenario.description}</p>
				<div className="rp-section-title">Try this</div>
				<ol className="rp-try">
					{scenario.tryThis.map((step) => (
						<li key={step}>{step}</li>
					))}
				</ol>
				<div className="rp-section-title">Change a grant</div>
				<div className="rp-controls">
					{scenario.controls.map((c) => (
						<button key={c.label} onClick={() => c.run(fullEnv)}>
							{c.label}
						</button>
					))}
				</div>
				<Grants room={env.room} owner={env.clients[scenario.people[0].name]} />
				<ServerLog room={env.room} />
			</div>
			<div className="rp-panes">
				{scenario.people.map((person, i) =>
					env.clients[person.name] ? (
						<Pane
							key={person.name}
							client={env.clients[person.name]}
							role={person.role}
							color={person.color}
							onMount={(editor) => {
								editors.current[person.name] = editor
								if (i === 0 && !editor.getCurrentPageShapes().length) {
									scenario.seed(editor)
									seeded.current.resolve()
								}
							}}
						/>
					) : (
						<div key={person.name} className="rp-pane rp-loading">
							{person.name} joins after the owner sets up the file…
						</div>
					)
				)}
			</div>
		</div>
	)
}

function promiseWithResolve() {
	let resolve!: () => void
	const promise = new Promise<void>((r) => (resolve = r))
	return { promise, resolve }
}

const ROOT_ROLES = ['owner', 'editor', 'contributor', 'commenter', 'viewer']

function Pane({
	client,
	role,
	color,
	onMount,
}: {
	client: LocalClient
	role: string
	color: string
	onMount(editor: Editor): void
}) {
	const status = useValue(client.status)
	const roles = useValue('roles', () => ROOT_ROLES.filter((r) => client.relations.can(r, ROOT)), [
		client,
	])
	const [components] = useState<TLComponents>(() => ({
		Toolbar: () => <PermissionToolbar relations={client.relations} />,
	}))

	return (
		<div className="rp-pane">
			<div className="rp-pane-header">
				<span className="rp-dot" style={{ background: color }} />
				<strong>{client.name}</strong>
				<span className="rp-role">{role}</span>
				<span className="rp-badges">
					{roles.map((r) => (
						<span key={r} className="rp-badge">
							{r}
						</span>
					))}
				</span>
			</div>
			<div className="rp-canvas">
				{status === 'ready' && (
					<Tldraw
						store={client.store}
						isShapeLocked={(shape) => !client.relations.canUpdate(shape)}
						components={components}
						onMount={onMount}
					/>
				)}
				{status === 'connecting' && <div className="rp-overlay">Connecting…</div>}
				{status === 'forbidden' && (
					<div className="rp-overlay">
						<strong>No access</strong>
						<span>The server closed this session. It can read nothing in the file.</span>
					</div>
				)}
			</div>
		</div>
	)
}

/** Tool id → the shape type it creates. Tools not listed (select, hand, eraser, laser) create nothing. */
const TOOL_SHAPE: Record<string, string> = {
	draw: 'draw',
	arrow: 'arrow',
	text: 'text',
	note: 'note',
	asset: 'image',
	line: 'line',
	highlight: 'highlight',
	frame: 'frame',
}
const TOOLS = [
	'select',
	'hand',
	'draw',
	'eraser',
	'arrow',
	'text',
	'note',
	'asset',
	'rectangle',
	'ellipse',
	'triangle',
	'diamond',
	'line',
	'highlight',
	'laser',
	'frame',
]

/**
 * Shows a creating tool only when the user may create its shape type somewhere on the page: on the
 * page itself, or inside a frame they contribute to. The check is the same one the server runs.
 */
function PermissionToolbar({ relations }: { relations: TLRelationsClient<TLRecord> }) {
	const editor = useEditor()
	const tools = useTools()
	const visible = useValue(
		'visible tools',
		() => {
			const pageId = editor.getCurrentPageId()
			const parents = [
				pageId,
				...editor
					.getCurrentPageShapes()
					.filter((s) => s.type === 'frame')
					.map((s) => s.id),
			]
			const canMake = (type: string) =>
				parents.some((parentId) =>
					relations.canCreate({
						id: 'shape:probe',
						typeName: 'shape',
						type,
						parentId,
						meta: {},
					} as unknown as TLRecord)
				)
			return TOOLS.filter((id) => {
				if (!tools[id]) return false
				const type = tools[id].meta?.geo ? 'geo' : TOOL_SHAPE[id]
				return !type || canMake(type)
			})
		},
		[editor, tools, relations]
	)
	return (
		<DefaultToolbar>
			{visible.map((id) => (
				<ToolbarItem key={id} tool={id} />
			))}
		</DefaultToolbar>
	)
}

/**
 * Every tuple in play: the ones the host keeps above the room (file roles, team members), and the
 * ones stored in the room as records (page and shape grants). The owner holds all of them.
 */
function Grants({ room, owner }: { room: LocalRoom; owner: LocalClient }) {
	const [host, setHost] = useState(() => room.tuples.all())
	useEffect(() => room.tuples.onChange(() => setHost(room.tuples.all())), [room])
	const inRoom = useValue(
		'room tuples',
		() =>
			(owner.store.query.records('relation' as any).get() as unknown as TLRelation[])
				.map((r) => `${r.object}#${r.relation}@${r.subject}`)
				.sort(),
		[owner]
	)
	return (
		<div className="rp-log">
			<div className="rp-log-title">Grants on the host</div>
			{host.map((t) => (
				<div key={`${t.object}#${t.relation}@${t.subject}`}>
					{t.object}#{t.relation}@{t.subject}
				</div>
			))}
			<div className="rp-log-title">Grants in the room</div>
			{inRoom.length === 0 && <div className="rp-log-empty">None.</div>}
			{inRoom.map((t) => (
				<div key={t}>{t}</div>
			))}
		</div>
	)
}

function ServerLog({ room }: { room: LocalRoom }) {
	const lines = useValue(room.log)
	return (
		<div className="rp-log">
			<div className="rp-log-title">Server log</div>
			{lines.length === 0 && <div className="rp-log-empty">Nothing yet.</div>}
			{lines.map((line, i) => (
				<div key={i}>{line}</div>
			))}
		</div>
	)
}
