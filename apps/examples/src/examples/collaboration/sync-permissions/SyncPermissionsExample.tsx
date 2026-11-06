import { CanvasComments, CommentTool, commentToolOverrides } from '@tldraw/commenting'
import { InMemorySyncStorage, TLSocketRoom, useSync } from '@tldraw/sync'
import {
	ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import {
	CommentToolbarItem,
	DefaultToolbar,
	DefaultToolbarContent,
	Editor,
	TLComponents,
	TLRecord,
	TLStore,
	TLUiOverrides,
	Tldraw,
	UserRecordType,
	atom,
	createTLStore,
	createUserId,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeUtils,
	inlineBase64AssetStore,
	tipTapDefaultExtensions,
	track,
	useValue,
} from 'tldraw'
import '@tldraw/commenting/commenting.css'
import 'tldraw/tldraw.css'
import {
	Meta,
	Policy,
	Session,
	clientCanWrite,
	clientChecksOn,
	installClientChecks,
	serverOptions,
	writeLog,
} from './access'
import { LocalRoom } from './local-room'
import { DemoUser, Scene, SceneContext } from './scene'
import { scenes } from './scenes'
import { customShapeUtils, schema } from './shapes'
import './sync-permissions.css'

// There's a guide at the bottom of this file!

export default function SyncPermissionsExample() {
	// [1]
	const [sceneId, setSceneId] = useState(
		() => new URLSearchParams(window.location.search).get('scene') ?? scenes[0].id
	)
	const [resets, setResets] = useState(0)
	const scene = scenes.find((s) => s.id === sceneId) ?? scenes[0]

	return (
		<div className="perm-root">
			<nav className="perm-scenes">
				{scenes.map((s, i) => (
					<button
						key={s.id}
						className={s.id === scene.id ? 'is-active' : undefined}
						onClick={() => setSceneId(s.id)}
					>
						<span className="perm-num">{i + 1}</span>
						<span>{s.title}</span>
						<span className={`perm-status perm-status--${s.status}`}>{s.status}</span>
					</button>
				))}
			</nav>
			<SceneRunner
				key={`${scene.id}:${resets}`}
				scene={scene}
				onReset={() => setResets((r) => r + 1)}
			/>
		</div>
	)
}

interface Room {
	local: LocalRoom
	policy: Policy
}

// [2]
function createRoom(scene: Scene, getState: () => unknown): Room {
	const seedStore = createTLStore({ schema })
	const seeder = new Editor({
		store: seedStore,
		shapeUtils: [...defaultShapeUtils, ...customShapeUtils],
		bindingUtils: defaultBindingUtils,
		tools: [],
		getContainer: () => document.createElement('div'),
		options: {
			text: {
				addFontsFromNode: defaultAddFontsFromNode,
				tipTapConfig: { extensions: tipTapDefaultExtensions },
			},
		},
	})
	scene.seed(seeder)
	const snapshot = seedStore.getStoreSnapshot('document')
	seeder.dispose()

	const policy = scene.policy(getState)
	const room = new TLSocketRoom<TLRecord, Meta>({
		schema,
		storage: new InMemorySyncStorage<TLRecord>({
			snapshot: {
				documents: Object.values(snapshot.store).map((state) => ({ state, lastChangedClock: 0 })),
				schema: snapshot.schema,
			},
			objectTypes: policy.objectTypes,
		}),
		...serverOptions(policy),
	})
	const local = new LocalRoom(room, (userId) =>
		scene.connect(scene.users.find((u) => u.id === userId)!, getState())
	)
	return { local, policy }
}

function SceneRunner({ scene, onReset }: { scene: Scene; onReset(): void }) {
	const [state, setStateValue] = useState(scene.initialState)
	const stateRef = useRef(state)
	const getState = useCallback(() => stateRef.current, [])

	const roomKey = scene.roomKey?.(state) ?? ''
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const room = useMemo(() => createRoom(scene, getState), [scene, getState, roomKey])
	useEffect(() => () => room.local.close(), [room])

	useEffect(() => {
		clientChecksOn.set(scene.clientChecks ?? true)
		writeLog.set([])
	}, [scene])

	const [editors, setEditors] = useState<Record<string, Editor | undefined>>({})
	const [accessVersions, setAccessVersions] = useState<Record<string, number>>({})

	const ctx: SceneContext<any> = {
		state,
		room: room.local.room,
		editors,
		setState(patch, opts) {
			stateRef.current = { ...stateRef.current, ...patch }
			setStateValue(stateRef.current)
			for (const userId of opts?.reconnect ?? []) {
				room.local.reconnect(userId)
				setAccessVersions((v) => ({ ...v, [userId]: (v[userId] ?? 0) + 1 }))
			}
		},
	}

	const Controls = useMemo(
		() =>
			scene.Controls && track(scene.Controls as (props: { ctx: SceneContext<any> }) => ReactNode),
		[scene]
	)
	const onEditor = useCallback(
		(userId: string, editor: Editor | undefined) => setEditors((e) => ({ ...e, [userId]: editor })),
		[]
	)

	return (
		<main className="perm-main">
			<SceneInfo scene={scene} onReset={onReset} />
			{Controls && (
				<div className="perm-controls">
					<Controls ctx={ctx} />
				</div>
			)}
			<div
				className="perm-editors"
				style={{ gridTemplateColumns: `repeat(${scene.users.length}, 1fr)` }}
			>
				{scene.users.map((user) => (
					<EditorPanel
						key={`${user.id}:${roomKey}`}
						scene={scene}
						user={user}
						room={room}
						state={state}
						accessVersion={accessVersions[user.id] ?? 0}
						onEditor={onEditor}
					/>
				))}
			</div>
			<WriteLog users={scene.users} />
		</main>
	)
}

const SceneInfo = track(function SceneInfo({ scene, onReset }: { scene: Scene; onReset(): void }) {
	return (
		<section className="perm-info">
			<header>
				<h2>{scene.title}</h2>
				<span className={`perm-status perm-status--${scene.status}`}>{scene.status}</span>
				<span className="perm-spacer" />
				<label className="perm-check" title="Run the write rules in each client before sending">
					<input
						type="checkbox"
						checked={clientChecksOn.get()}
						onChange={(e) => clientChecksOn.set(e.target.checked)}
					/>
					Client checks
				</label>
				<button className="perm-action" onClick={onReset}>
					Reset scene
				</button>
			</header>
			<p>{scene.summary}</p>
			<div className="perm-columns">
				<div>
					<h3>What to try</h3>
					<ol>
						{scene.tryThis.map((t) => (
							<li key={t}>{t}</li>
						))}
					</ol>
				</div>
				<div>
					<h3>What you should see</h3>
					<p>{scene.expect}</p>
				</div>
				{scene.gap && (
					<div className="perm-gap">
						<h3>Gap</h3>
						<p>{scene.gap}</p>
					</div>
				)}
			</div>
			<div className="perm-primitives">
				{scene.primitives.map((p) => (
					<code key={p}>{p}</code>
				))}
			</div>
		</section>
	)
})

interface PanelProps {
	scene: Scene
	user: DemoUser
	room: Room
	state: unknown
	accessVersion: number
	onEditor(userId: string, editor: Editor | undefined): void
}

// [3]
function EditorPanel(props: PanelProps) {
	const [epoch, setEpoch] = useState(0)
	const status = useRef('loading')
	const onStatus = useCallback((s: string) => {
		status.current = s
	}, [])
	useEffect(() => {
		// A client that was refused stops for good: mount a new one, which connects again.
		if (status.current === 'error') setEpoch((e) => e + 1)
	}, [props.accessVersion])
	return (
		<div className="perm-panel" style={{ borderTopColor: props.user.color }}>
			<UserEditor key={epoch} {...props} onStatus={onStatus} />
		</div>
	)
}

function UserEditor({
	scene,
	user,
	room,
	state,
	onEditor,
	onStatus,
}: PanelProps & { onStatus(status: string): void }) {
	const decision = scene.connect(user, state)
	const getSession = useCallback((): Session => {
		const d = room.local.grantFor(user.id)
		return d?.allow
			? { sessionId: user.id, isReadonly: d.isReadonly, meta: d.meta }
			: { sessionId: user.id, isReadonly: true, meta: { userId: user.id, role: 'none' } }
	}, [room, user])

	const connect = useMemo(() => room.local.connect(user.id), [room, user.id])
	const users = useMemo(
		() => ({
			currentUser: atom(
				'user',
				UserRecordType.create({ id: createUserId(user.id), name: user.name, color: user.color })
			),
		}),
		[user]
	)
	const store = useSync({ connect, schema, assets: inlineBase64AssetStore, users })
	useEffect(() => {
		onStatus(store.status)
	}, [store.status, onStatus])

	// [4]
	const objectAccess = useMemo(() => atom('object access', 'read'), [])
	const grantedAccess = store.status === 'synced-remote' ? store.objectAccess : 'read'
	useEffect(() => {
		objectAccess.set(grantedAccess)
	}, [objectAccess, grantedAccess])

	// [5]
	const canWrite = useMemo(
		() => (room.policy.write ? clientCanWrite(room.policy, getSession) : undefined),
		[room, getSession]
	)

	const { tools, overrides, components } = useMemo(() => {
		// The style panel would crowd the narrow editors.
		if (!scene.comments)
			return { tools: [], overrides: [] as TLUiOverrides[], components: { StylePanel: null } }
		const components: TLComponents = {
			StylePanel: null,
			// Commenters are read-only on the canvas, and the read-only toolbar shows only tools
			// marked readonlyOk, so add the comment tool to it.
			Toolbar: (props) => (
				<DefaultToolbar {...props}>
					<DefaultToolbarContent />
					<CommentToolbarItem />
				</DefaultToolbar>
			),
			InFrontOfTheCanvas: () => (
				<CanvasComments
					currentUserId={user.id}
					resolveAuthor={(id) => scene.users.find((u) => u.id === id) ?? { name: id }}
				/>
			),
		}
		return {
			tools: [CommentTool.configure({ canComment: () => objectAccess.get() === 'write' })],
			overrides: [
				commentToolOverrides,
				{
					tools: (_, tools) => ({ ...tools, comment: { ...tools.comment, readonlyOk: true } }),
				},
			],
			components,
		}
	}, [scene, user, objectAccess])

	const [editor, setEditor] = useState<Editor>()
	const onMount = useCallback(
		(editor: Editor) => {
			const cleanup = scene.setup?.(editor, user, getSession)
			editor.zoomToFit()
			if (editor.getZoomLevel() > 1) editor.resetZoom()
			setEditor(editor)
			onEditor(user.id, editor)
			return () => {
				cleanup?.()
				onEditor(user.id, undefined)
			}
		},
		[scene, user, getSession, onEditor]
	)

	return (
		<>
			<PanelHeader
				user={user}
				role={decision.allow ? decision.meta.role : 'no access'}
				editor={store.status === 'synced-remote' ? editor : undefined}
				status={store.status === 'synced-remote' ? store.connectionStatus : store.status}
				objectAccess={
					store.status === 'synced-remote' && scene.comments ? store.objectAccess : null
				}
			/>
			{store.status === 'synced-remote' ? (
				<div className="perm-canvas">
					{room.policy.write && (
						<ClientChecks store={store.store} policy={room.policy} getSession={getSession} />
					)}
					<Tldraw
						store={store.store}
						shapeUtils={customShapeUtils}
						tools={tools}
						overrides={overrides}
						components={components}
						canWrite={canWrite}
						onMount={onMount}
						autoFocus={false}
					/>
				</div>
			) : (
				<div className="perm-empty">
					{store.status === 'error' ? (
						<>
							<strong>No access</strong>
							<span>The server refused the connection ({store.error.message}).</span>
						</>
					) : (
						'Connecting…'
					)}
				</div>
			)}
		</>
	)
}

// Rendered before <Tldraw>, so its layout effect registers the store handlers before the editor
// registers its own.
function ClientChecks({
	store,
	policy,
	getSession,
}: {
	store: TLStore
	policy: Policy
	getSession(): Session
}) {
	useLayoutEffect(() => installClientChecks(store, policy, getSession), [store, policy, getSession])
	return null
}

function PanelHeader({
	user,
	role,
	editor,
	status,
	objectAccess,
}: {
	user: DemoUser
	role: string
	editor: Editor | undefined
	status: string
	objectAccess: string | null
}) {
	const readonly = useValue('readonly', () => editor?.getIsReadonly() ?? false, [editor])
	// What this client holds, to show what the server sent it.
	const holds = useValue(
		'holds',
		() => {
			if (!editor) return ''
			const pages = editor.getPages().map((p) => p.name)
			const shapes = editor.store.query.records('shape').get().length
			return `${shapes} shape${shapes === 1 ? '' : 's'} · ${pages.join(', ')}`
		},
		[editor]
	)
	return (
		<header className="perm-panel-header">
			<span className="perm-dot" style={{ background: user.color }} />
			<strong>{user.name}</strong>
			<span className="perm-role">{role}</span>
			<span className="perm-spacer" />
			{holds && <span className="perm-holds">{holds}</span>}
			{editor && (
				<span className={`perm-badge ${readonly ? 'is-off' : ''}`}>
					{readonly ? 'read only' : 'can edit'}
				</span>
			)}
			{objectAccess && (
				<span className={`perm-badge ${objectAccess === 'write' ? '' : 'is-off'}`}>
					{objectAccess === 'write' ? 'can comment' : 'reads comments'}
				</span>
			)}
			<span className={`perm-badge perm-badge--${status}`}>{status}</span>
		</header>
	)
}

function WriteLog({ users }: { users: DemoUser[] }) {
	const entries = useValue(writeLog)
	const name = (id: string) => users.find((u) => u.id === id)?.name ?? id
	return (
		<section className="perm-log">
			<h3>Write log</h3>
			{entries.length === 0 ? (
				<p className="perm-muted">No denied writes yet.</p>
			) : (
				<ul>
					{entries.map((e) => (
						<li key={e.id} className={e.allowed ? 'is-allowed' : 'is-denied'}>
							<span className={`perm-side perm-side--${e.side}`}>{e.side}</span>
							<span>{e.allowed ? 'allowed' : 'denied'}</span>
							<strong>{name(e.userId)}</strong>
							<span>
								{e.op} <code>{e.recordId}</code>
							</span>
							<span className="perm-reason">{e.reason}</span>
							{e.count > 1 && <span className="perm-muted">×{e.count}</span>}
						</li>
					))}
				</ul>
			)}
		</section>
	)
}

/*
This example runs a real sync server in the browser and connects one editor per user to it, so
you can try each permission use case without a backend. Pick a use case on the left.

[1]
Each use case is a scene (see scenes.tsx): the users, the first document, what each user gets
when they connect, the write and read rules, and the controls. `?scene=<id>` opens one directly.

[2]
The room is a real `TLSocketRoom`. Only the WebSocket is fake (see local-room.ts). The policy is
built from public primitives only (see access.ts): `canWrite` and `canRead` for who may write and
see what, `beforeWrite` and `beforeRead` hooks for stamping and masking, composed with
`composeBeforeWrite` and `composeBeforeRead`, and `writeRejection`.

[3]
Each editor is a normal `useSync` client with its own session. When the app changes a user's
access, the room closes that user's session and the client reconnects, so the server resolves the
session options again. A client that the server refused stops, so the panel mounts a new one.

[4]
`objectAccess` comes from the server with the session. The comment tool reads it, so a viewer can
read comments but gets no composer.

[5]
The same write rules that run on the server also run in the client, as the editor's `canWrite`
option. The editor blocks a write that the rules refuse, and rolls back the whole operation, so a
group or a page delete lands whole or not at all. The UI asks the same option, so a tool or action
the user may not use is hidden or disabled. The option gets only the stored record for an update,
so store side effects check the new values too, and log each denial (`installClientChecks`). Turn off "Client checks" to
send every write and see the server undo it.
*/
