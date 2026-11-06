import {
	CanvasComments,
	CommentModificationContext,
	CommentTool,
	commentToolOverrides,
} from '@tldraw/commenting'
import '@tldraw/commenting/commenting.css'
import { useSync } from '@tldraw/sync'
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import {
	Editor,
	PageRecordType,
	RecordAccess,
	TLAssetStore,
	TLEditorPermissions,
	TLRecord,
	Tldraw,
	UserRecordType,
	commentSchemaRecords,
	computed,
	createShapeId,
	createUserId,
	createTLSchema,
	defaultShapeSchemas,
	toRichText,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import {
	ClassroomMeta,
	GRADE_TYPE,
	classroomActor,
	classroomPermissions,
} from './classroomPermissions'
import { GradeShapeUtil } from './GradeShape'
import { createInPageRoom } from './inPageRoom'
import './permission-chain.css'
import { USE_CASES, layerSource } from './useCases'

// There's a guide at the bottom of this file!

// [1]
const chain = classroomPermissions()

// [2]
const schema = createTLSchema({
	shapes: { ...defaultShapeSchemas, [GRADE_TYPE]: { props: GradeShapeUtil.props } },
	records: commentSchemaRecords,
})
const shapeUtils = [GradeShapeUtil]

const ANSWERS_PAGE = PageRecordType.createId('answers')
const AGENT_AREA = createShapeId('agent-area')
const STAR = createShapeId('star')
const GRADES = { alice: createShapeId('grade-alice'), bob: createShapeId('grade-bob') }

const TEACHER: ClassroomMeta = { userId: 'teacher', role: 'teacher' }
const ALICE: ClassroomMeta = { userId: 'alice', role: 'student' }
type LinkRole = 'view' | 'edit'
const thirdMeta = (third: string, linkRole: LinkRole): ClassroomMeta => {
	switch (third) {
		case 'viewer':
			return { userId: 'visitor', role: 'viewer' }
		case 'guest':
			return { userId: 'guest', role: linkRole === 'edit' ? 'student' : 'viewer', viaLink: true }
		case 'agent':
			return { userId: 'agent', role: 'agent', frameId: AGENT_AREA }
		default:
			return { userId: 'bob', role: 'student' }
	}
}

const COLORS: Record<string, string> = {
	teacher: '#e03131',
	alice: '#1971c2',
	bob: '#2f9e44',
	guest: '#f08c00',
	visitor: '#868e96',
	agent: '#9c36b5',
}
const NAMES: Record<string, string> = {
	teacher: 'Teacher',
	alice: 'Alice',
	bob: 'Bob',
	guest: 'Guest',
	visitor: 'Visitor',
	agent: 'Agent',
}

const assets: TLAssetStore = {
	upload: async () => {
		throw new Error('This demo does not upload files')
	},
	resolve: (asset) => asset.props.src,
}

const DemoContext = createContext<{
	room: ReturnType<typeof createInPageRoom>['room']
	linkRole: LinkRole
	setLinkRole(role: LinkRole): void
} | null>(null)

export default function PermissionChainExample() {
	const [roomLog, setRoomLog] = useState<string[]>([])
	// [3]
	const [{ room, connect }] = useState(() =>
		createInPageRoom({
			chain,
			schema,
			onDenied: (message) => setRoomLog((prev) => [message, ...prev].slice(0, 6)),
		})
	)
	const [isSeeded, setIsSeeded] = useState(false)
	const [third, setThird] = useState('bob')
	const [linkRole, setLinkRole] = useState<LinkRole>('view')
	// One meta object per role, so the pane's actor only changes when the role does.
	const thirdPaneMeta = useMemo(() => thirdMeta(third, linkRole), [third, linkRole])

	const changeLinkRole = (role: LinkRole) => {
		setLinkRole(role)
		// [4]
		room.updateSessionMeta('guest', thirdMeta('guest', role))
	}

	return (
		<DemoContext.Provider value={{ room, linkRole, setLinkRole: changeLinkRole }}>
			<div className="permission-chain">
				<div className="permission-chain__panes">
					<Pane
						title="Teacher"
						meta={TEACHER}
						connect={connect}
						onMount={(editor) => {
							seed(editor)
							setIsSeeded(true)
						}}
					/>
					{isSeeded && <Pane title="Alice (student)" meta={ALICE} connect={connect} />}
					{isSeeded && (
						<Pane
							key={third}
							title={
								<select value={third} onChange={(e) => setThird(e.currentTarget.value)}>
									<option value="bob">Bob (student)</option>
									<option value="guest">Guest (share link)</option>
									<option value="viewer">Visitor (viewer)</option>
									<option value="agent">Agent (works in its area)</option>
								</select>
							}
							meta={thirdPaneMeta}
							connect={connect}
						/>
					)}
				</div>
				<div className="permission-chain__room">
					<strong>Room</strong>
					{roomLog.length === 0
						? ' No denied writes yet.'
						: roomLog.map((l, i) => <div key={i}>Denied {l}</div>)}
				</div>
				<UseCases />
			</div>
		</DemoContext.Provider>
	)
}

function Pane({
	title,
	meta,
	connect,
	onMount,
}: {
	title: React.ReactNode
	meta: ClassroomMeta
	connect: ReturnType<typeof createInPageRoom>['connect']
	onMount?(editor: Editor): void
}) {
	const [log, setLog] = useState<string[]>([])
	const [attempt, setAttempt] = useState(0)
	const [skipChecks, setSkipChecks] = useState(false)
	// The room learns a later role change from `updateSessionMeta`, so a new meta must not reconnect.
	const metaRef = useRef(meta)
	metaRef.current = meta
	// [5]
	const store = useSync({
		connect: useCallback(
			() => connect(metaRef.current.userId, metaRef.current),
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[connect, meta.userId, attempt]
		),
		assets,
		schema,
		// One user per pane, so each pane sees the others' cursors (presence passes the read chain).
		users: useMemo(
			() => ({
				currentUser: computed('pane user', () =>
					UserRecordType.create({
						id: createUserId(meta.userId),
						name: NAMES[meta.userId] ?? meta.userId,
						color: COLORS[meta.userId] ?? '#888888',
					})
				),
			}),
			[meta.userId]
		),
	})
	// [6]
	const permissions = useMemo<TLEditorPermissions | undefined>(
		() =>
			skipChecks
				? undefined
				: {
						chain,
						actor: classroomActor(meta),
						// A drag that the chain denies on its way (into another's frame) is denied again on
						// each pointer move, so show each reason once in a row.
						onDenied: (denials) =>
							setLog((prev) => {
								const reasons = [...new Set(denials.map((d) => d.reason))].filter(
									(r) => r !== prev[0]
								)
								return [...reasons, ...prev].slice(0, 4)
							}),
					},
		[meta, skipChecks]
	)
	// [7]
	const tools = useMemo(() => [CommentTool.configure({ canModifyComment: mayModifyComment })], [])
	const components = useMemo(
		() => ({
			SharePanel: () => <Controls meta={meta} />,
			InFrontOfTheCanvas: () => (
				<>
					<LockedHint />
					<CanvasComments
						currentUserId={meta.role === 'viewer' ? null : meta.userId}
						resolveAuthor={(id) => ({ name: NAMES[id] ?? id })}
					/>
				</>
			),
		}),
		[meta]
	)

	return (
		<div className="permission-chain__pane">
			<div className="permission-chain__header">
				{title}
				{meta.role === 'student' && !meta.viaLink && (
					<label title="Turn off the chain in this editor. The room still enforces it.">
						<input
							type="checkbox"
							checked={skipChecks}
							onChange={(e) => setSkipChecks(e.currentTarget.checked)}
						/>
						Skip client checks
					</label>
				)}
			</div>
			<div className="permission-chain__canvas">
				{store.status === 'error' ? (
					<div className="permission-chain__closed">
						The room closed this connection: {store.error.message}{' '}
						<button onClick={() => setAttempt((a) => a + 1)}>Try again</button>
					</div>
				) : (
					<Tldraw
						store={store}
						shapeUtils={shapeUtils}
						tools={tools}
						overrides={[commentToolOverrides]}
						permissions={permissions}
						onMount={(editor) => {
							onMount?.(editor)
							editor.timers.setTimeout(() => editor.zoomToFit(), 300)
						}}
						components={components}
					/>
				)}
			</div>
			<div className="permission-chain__log">
				{log.length === 0
					? 'No denied writes yet.'
					: log.map((l, i) => <div key={i}>Denied: {l}</div>)}
			</div>
		</div>
	)
}

/**
 * Why the shape under the pointer is locked for this user. The editor asks the chain with a dry
 * run (`editor.getShapePermissionDenial`), and treats a denied shape as locked.
 */
function LockedHint() {
	const editor = useEditor()
	const reason = useValue(
		'locked reason',
		() => {
			const shape = editor.getShapeAtPoint(editor.inputs.getCurrentPagePoint(), {
				hitInside: true,
				hitLocked: true,
				renderingOnly: true,
			})
			return shape ? editor.getShapePermissionDenial(shape) : undefined
		},
		[editor]
	)
	if (!reason) return null
	return <div className="permission-chain__locked">Locked for you: {reason}</div>
}

/** Ask the editor's chain whether a comment write would pass, so the menu offers only that. */
function mayModifyComment(ctx: CommentModificationContext) {
	let access: RecordAccess<TLRecord>
	if (ctx.action === 'delete-comment') {
		access = { type: 'update', prev: ctx.comment, next: { ...ctx.comment, isDeleted: true } }
	} else if (ctx.action === 'edit-comment') {
		access = { type: 'update', prev: ctx.comment, next: { ...ctx.comment, editedAt: Date.now() } }
	} else {
		access = { type: 'update', prev: ctx.thread, next: { ...ctx.thread, isDeleted: true } }
	}
	return ctx.editor.store.checkWrites([access]).denied.length === 0
}

// [8]
function Controls({ meta }: { meta: ClassroomMeta }) {
	const editor = useEditor()
	const demo = useContext(DemoContext)!
	const actor = classroomActor(meta)
	const canLock = chain.can({ actor, action: 'page.lock' })
	const canGrade = chain.can({ actor, action: 'grade.change' })
	const canShare = chain.can({ actor, action: 'file.share' })
	const page = useValue('page', () => editor.getCurrentPage(), [editor])
	const answers = useValue('answers', () => editor.getPage(ANSWERS_PAGE), [editor])
	const isClosed = useValue('closed', () => !!editor.getDocumentSettings().meta.closed, [editor])

	if (meta.role === 'agent') {
		const draw = (count: number, x: number) =>
			editor.createShapes(
				Array.from({ length: count }, (_, i) => ({
					type: 'geo' as const,
					parentId: x < 500 ? AGENT_AREA : undefined,
					x: x + (i % 10) * 40,
					y: 40 + Math.floor(i / 10) * 40,
					props: { w: 30, h: 30 },
				}))
			)
		return (
			<div className="permission-chain__controls">
				<button onClick={() => draw(3, 40)}>Draw in my area</button>
				<button onClick={() => draw(1, 900)}>Draw outside</button>
				<button onClick={() => draw(60, 40)}>Draw 60 shapes</button>
			</div>
		)
	}

	const teacherOnly = (allowed: boolean) => ({
		disabled: !allowed,
		title: allowed ? '' : 'Only a teacher can do this',
	})

	return (
		<div className="permission-chain__controls">
			<button
				{...teacherOnly(canLock)}
				onClick={() =>
					editor.updatePage({ id: page.id, meta: { ...page.meta, locked: !page.meta.locked } })
				}
			>
				{page.meta.locked ? 'Unlock page' : 'Lock page'}
			</button>
			<button
				{...teacherOnly(canLock)}
				onClick={() => editor.updateDocumentSettings({ meta: { closed: !isClosed } })}
			>
				{isClosed ? 'Open class' : 'Close class'}
			</button>
			{answers && (
				<button
					{...teacherOnly(canLock)}
					onClick={() =>
						editor.updatePage({
							id: ANSWERS_PAGE,
							meta: { ...answers.meta, private: !answers.meta.private },
						})
					}
				>
					{answers.meta.private ? 'Show answers' : 'Hide answers'}
				</button>
			)}
			<button {...teacherOnly(canGrade)} onClick={() => changeGrades(editor)}>
				Change grades
			</button>
			<select
				{...teacherOnly(canShare)}
				value={demo.linkRole}
				onChange={(e) => demo.setLinkRole(e.currentTarget.value as LinkRole)}
			>
				<option value="view">Link: can view</option>
				<option value="edit">Link: can edit</option>
			</select>
		</div>
	)
}

function changeGrades(editor: Editor) {
	const next = (text: string) => ({ A: 'B', B: 'C', C: 'A' })[text] ?? 'A'
	for (const id of Object.values(GRADES)) {
		const grade = editor.getShape(id)
		if (grade?.type !== GRADE_TYPE) continue
		editor.updateShape({ id, type: GRADE_TYPE, props: { text: next(grade.props.text) } })
	}
}

function UseCases() {
	const [open, setOpen] = useState<string | null>(USE_CASES[0].id)
	return (
		<div className="permission-chain__cases">
			<div className="permission-chain__cases-title">Use cases</div>
			{USE_CASES.map((useCase) => (
				<div key={useCase.id} className="permission-chain__case">
					<button onClick={() => setOpen(open === useCase.id ? null : useCase.id)}>
						{useCase.title}
					</button>
					{open === useCase.id && (
						<div className="permission-chain__case-body">
							<p>{useCase.how}</p>
							<ol>
								{useCase.steps.map((step, i) => (
									<li key={i}>{step}</li>
								))}
							</ol>
							{useCase.layers.map((layer) => (
								<pre key={layer}>{layerSource(layer)}</pre>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	)
}

// [9]
function seed(editor: Editor) {
	if (editor.getCurrentPageShapes().length > 0) return
	editor.run(() => {
		editor.renamePage(editor.getCurrentPageId(), 'Class')
		editor.createShape({
			type: 'text',
			x: 40,
			y: -80,
			props: { richText: toRichText('Draw your answer. You can only change your own shapes.') },
		})
		editor.createShape({
			id: AGENT_AREA,
			type: 'frame',
			x: 40,
			y: 360,
			props: { w: 420, h: 220, name: 'Agent area' },
		})
		editor.createShape({
			id: STAR,
			type: 'geo',
			x: 40,
			y: 0,
			props: { w: 160, h: 100, geo: 'star' },
		})
		editor.createShape({
			id: GRADES.alice,
			type: GRADE_TYPE,
			x: 300,
			y: 0,
			props: { studentId: 'alice', text: 'A' },
		})
		editor.createShape({
			id: GRADES.bob,
			type: GRADE_TYPE,
			x: 300,
			y: 80,
			props: { studentId: 'bob', text: 'B' },
		})
		editor.createPage({ id: ANSWERS_PAGE, name: 'Answers', meta: { private: true } })
		editor.createShape({
			type: 'text',
			parentId: ANSWERS_PAGE,
			x: 0,
			y: 0,
			props: { richText: toRichText('The answer is 42.') },
		})
	})
}

/*
This example runs one permission chain in two places: in a sync room that lives in this page, and
in each editor. The rules are in classroomPermissions.ts, and the list on the right shows, for each
use case, the layers that solve it and how to see it here. Each rule is a layer that sees a whole
batch: all writes of one editor operation, all writes of one push, or all records that one
session is about to receive.

[1]
One chain, built once. The room uses it to enforce. The editors use it to stop a write before it is
sent, and to tell the user why.

[2]
The room and the editors share one schema: the default shapes, a plugin shape type (grades), and
the comment records.

[3]
The room. In a real app this is your server, with the same chain passed to `TLSocketRoom`. The
"Room" strip shows the writes it denies: those that an editor sent anyway.

[4]
Share links: the teacher changes the link's role, and the host tells the room with
`updateSessionMeta`. The guest's next write and read use the new role, with no reconnect. A real
server does this in its "change link" endpoint, after `chain.can({ action: 'file.share' })`.

[5]
`useSync` with a custom `connect`, so each pane talks to the in-page room. The room learns the
role from `meta` at connect.

[6]
The `permissions` prop. The editor runs the chain once per operation, and puts back what it denies.
The actor has the same shape as the one the room builds from the session. "Skip client checks"
removes it, to show that the room enforces the same rules.

[7]
The comment tool asks the editor's chain before it offers "Delete": `store.checkWrites` is a dry run
of the write that the menu item would make, with this editor's actor.

[8]
Actions that are not record writes ask the same chain with `chain.can`. A server endpoint (for
example "share file") would ask the same question. The room asks the action `room.open` when a
session connects: that is file read control.

[9]
The teacher seeds the room. The other panes wait, because a student may not create pages.
*/
