import { useSync } from '@tldraw/sync'
import { useCallback, useMemo, useState } from 'react'
import {
	Editor,
	PageRecordType,
	TLAssetStore,
	TLEditorPermissions,
	Tldraw,
	createShapeId,
	toRichText,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { ClassroomMeta, classroomActor, classroomPermissions } from './classroomPermissions'
import { createInPageRoom } from './inPageRoom'
import './permission-chain.css'

// There's a guide at the bottom of this file!

// [1]
const chain = classroomPermissions()

const ANSWERS_PAGE = PageRecordType.createId('answers')
const AGENT_AREA = createShapeId('agent-area')

const TEACHER: ClassroomMeta = { userId: 'teacher', role: 'teacher' }
const ALICE: ClassroomMeta = { userId: 'alice', role: 'student' }
const THIRD: Record<string, ClassroomMeta> = {
	bob: { userId: 'bob', role: 'student' },
	viewer: { userId: 'visitor', role: 'viewer' },
	agent: { userId: 'agent', role: 'agent', frameId: AGENT_AREA },
}

const assets: TLAssetStore = {
	upload: async () => {
		throw new Error('This demo does not upload files')
	},
	resolve: (asset) => asset.props.src,
}

export default function PermissionChainExample() {
	// [2]
	const [{ connect }] = useState(() => createInPageRoom(chain))
	const [isSeeded, setIsSeeded] = useState(false)
	const [third, setThird] = useState('bob')

	return (
		<div className="permission-chain">
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
							<option value="viewer">Visitor (viewer)</option>
							<option value="agent">Agent (works in its area)</option>
						</select>
					}
					meta={THIRD[third]}
					connect={connect}
				/>
			)}
		</div>
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
	// [3]
	const store = useSync({
		// eslint-disable-next-line react-hooks/exhaustive-deps
		connect: useCallback(() => connect(meta.userId, meta), [connect, meta, attempt]),
		assets,
	})
	// [4]
	const permissions = useMemo<TLEditorPermissions>(
		() => ({
			chain,
			actor: classroomActor(meta),
			// A denied drag is denied again on each pointer move, so show each reason once in a row.
			onDenied: (denials) =>
				setLog((prev) => {
					const reasons = [...new Set(denials.map((d) => d.reason))].filter((r) => r !== prev[0])
					return [...reasons, ...prev].slice(0, 4)
				}),
		}),
		[meta]
	)

	return (
		<div className="permission-chain__pane">
			<div className="permission-chain__header">{title}</div>
			<div className="permission-chain__canvas">
				{store.status === 'error' ? (
					<div className="permission-chain__closed">
						The room closed this connection: {store.error.message}{' '}
						<button onClick={() => setAttempt((a) => a + 1)}>Try again</button>
					</div>
				) : (
					<Tldraw
						store={store}
						permissions={permissions}
						onMount={(editor) => {
							onMount?.(editor)
							editor.timers.setTimeout(() => editor.zoomToFit(), 300)
						}}
						components={{ SharePanel: () => <Controls meta={meta} /> }}
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

// [5]
function Controls({ meta }: { meta: ClassroomMeta }) {
	const editor = useEditor()
	const actor = classroomActor(meta)
	const canLock = chain.can({ actor, action: 'page.lock' })
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

	return (
		<div className="permission-chain__controls">
			<button
				disabled={!canLock}
				title={canLock ? '' : 'Only a teacher can do this'}
				onClick={() =>
					editor.updatePage({ id: page.id, meta: { ...page.meta, locked: !page.meta.locked } })
				}
			>
				{page.meta.locked ? 'Unlock page' : 'Lock page'}
			</button>
			<button
				disabled={!canLock}
				onClick={() => editor.updateDocumentSettings({ meta: { closed: !isClosed } })}
			>
				{isClosed ? 'Open class' : 'Close class'}
			</button>
			{answers && (
				<button
					disabled={!canLock}
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
		</div>
	)
}

// [6]
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
		editor.createShape({ type: 'geo', x: 40, y: 0, props: { w: 160, h: 100, geo: 'star' } })
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
in each editor. The rules are in classroomPermissions.ts. Each rule is a layer that sees a whole
batch: all writes of one editor operation, all writes of one push, or all records that one
session is about to receive.

[1]
One chain, built once. The room uses it to enforce. The editors use it to stop a write before it is
sent, and to tell the user why.

[2]
The room. In a real app this is your server, with the same chain passed to `TLSocketRoom`.

[3]
`useSync` with a custom `connect`, so each pane talks to the in-page room. The room learns the
role from `meta` at connect.

[4]
The `permissions` prop. The editor runs the chain once per operation, and puts back what it denies.
The actor has the same shape as the one the room builds from the session.

[5]
Actions that are not record writes ask the same chain with `chain.can`. A server endpoint (for
example "share file") would ask the same question. The room asks the action `room.open` when a
session connects: that is file read control.

[6]
The teacher seeds the room. The other panes wait, because a student may not create pages.

Things to try:
- As Alice, move the teacher's star. The move snaps back, and the log says why.
- As the teacher, click "Show answers". The answers page appears for the students.
- As the teacher, lock the page. The students can no longer draw on it.
- As the teacher, close the class. The room closes the students' connections, and a student
  cannot open the file again until the teacher opens the class.
- Switch the third pane to the agent, and try each button.
*/
