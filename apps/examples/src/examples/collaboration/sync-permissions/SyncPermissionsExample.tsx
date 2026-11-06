import { useSync } from '@tldraw/sync'
import { useMemo, useState } from 'react'
import {
	CustomRecordInfo,
	Editor,
	T,
	TLAccess,
	TLPageId,
	TLPermissionDenial,
	TLRecord,
	TLShapeId,
	Tldraw,
	UserRecordType,
	atom,
	confineToShape,
	createShapeId,
	defaultAbilityRules,
	definePermissions,
	inlineBase64AssetStore,
	intentOwnsTypes,
	ownShapesOnly,
	pageReadAccess,
	pageWriteAccess,
	stampOwner,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { LocalRoom } from './localRoom'
import './sync-permissions.css'

// There's a guide at the bottom of this file!

// [1]
const ROLES: Record<string, (userId: string) => TLAccess> = {
	viewer: (userId) => ({ userId, abilities: [] }),
	commenter: (userId) => ({ userId, abilities: ['comment'] }),
	editor: (userId) => ({ userId, abilities: ['edit', 'comment'] }),
	student: (userId) => ({ userId, abilities: ['edit', 'comment', 'poll:vote'] }),
	teacher: (userId) => ({ userId, abilities: ['edit', 'comment', 'teach', 'poll:vote'] }),
	agent: (userId) => ({ userId, abilities: ['edit', 'agent'] }),
}

const LOCKED_PAGE = 'page:locked' as TLPageId
const ANSWERS_PAGE = 'page:answers' as TLPageId
const AGENT_FRAME = createShapeId('agent-frame')

const voteRecord: CustomRecordInfo = {
	scope: 'document',
	validator: T.object({
		id: T.string,
		typeName: T.literal('vote'),
		userId: T.string,
		option: T.string,
	}),
}

interface Scenario {
	title: string
	about: string
	panes: Array<{ name: string; role: keyof typeof ROLES }>
	createRoom(): LocalRoom
}

// [2]
const SCENARIOS: Record<string, Scenario> = {
	classroom: {
		title: 'Classroom',
		about:
			'Students change only their own shapes. Try to move, group, or delete a shape someone else drew. The teacher can change anything.',
		panes: [
			{ name: 'Tia', role: 'teacher' },
			{ name: 'Ann', role: 'student' },
			{ name: 'Bob', role: 'student' },
		],
		createRoom: () =>
			new LocalRoom({
				permissions: definePermissions<TLRecord>({
					rules: [...defaultAbilityRules(), ownShapesOnly({ unless: 'teach' })],
					stamps: [stampOwner()],
				}),
			}),
	},
	pages: {
		title: 'Pages',
		about:
			'Students cannot edit the "Locked" page and cannot see the "Answers" page, its shapes, or cursors on it. The teacher can show or hide the answers live.',
		panes: [
			{ name: 'Tia', role: 'teacher' },
			{ name: 'Sam', role: 'student' },
		],
		createRoom: () =>
			new LocalRoom({
				pages: [
					{ id: LOCKED_PAGE, name: 'Locked', meta: { locked: true } },
					{ id: ANSWERS_PAGE, name: 'Answers', meta: { hidden: true } },
				],
				permissions: definePermissions<TLRecord>({
					rules: [
						...defaultAbilityRules(),
						pageWriteAccess({
							canEditPage: (page: any, tx) => !page.meta.locked || tx.can('teach'),
						}),
					],
					canRead: pageReadAccess({
						canSeePage: (page: any, ctx) => !page.meta.hidden || ctx.can('teach'),
					}),
				}),
			}),
	},
	agent: {
		title: 'Agent',
		about:
			'The agent can change shapes inside its frame only. People are not limited. Use the agent pane as the agent would.',
		panes: [
			{ name: 'Ann', role: 'editor' },
			{ name: 'Bot', role: 'agent' },
		],
		createRoom: () =>
			new LocalRoom({
				setup: (store) => store.put([frameRecord('page:page' as TLPageId) as any]),
				permissions: definePermissions<TLRecord>({
					rules: [
						...defaultAbilityRules(),
						confineToShape({
							appliesTo: (tx) => tx.can('agent'),
							rootId: (tx) => {
								const frame = tx.before.get(AGENT_FRAME) as any
								return frame?.meta.agentId === tx.access.userId ? AGENT_FRAME : null
							},
							reason: 'The agent can only change shapes inside its frame.',
						}),
					],
				}),
			}),
	},
	poll: {
		title: 'Poll plugin',
		about:
			'A plugin with its own record type. Votes change only through the "vote" action, which the server runs again, so nobody can vote twice or for someone else. Viewers cannot vote.',
		panes: [
			{ name: 'Ann', role: 'student' },
			{ name: 'Val', role: 'viewer' },
		],
		createRoom: () =>
			new LocalRoom({
				records: { vote: voteRecord },
				permissions: definePermissions<TLRecord>({
					rules: [
						...defaultAbilityRules(),
						intentOwnsTypes('vote', { types: ['vote'], ability: 'poll:vote' }),
					],
					mutators: {
						vote(ctx, args: { option: string }) {
							if (!ctx.can('poll:vote')) throw new Error('You cannot vote.')
							const id = `vote:${ctx.access.userId}`
							ctx.put([
								{ id, typeName: 'vote', userId: ctx.access.userId, option: args.option } as any,
							])
						},
					},
				}),
			}),
	},
}

export default function SyncPermissionsExample() {
	const [scenarioId, setScenarioId] = useState('classroom')
	const scenario = SCENARIOS[scenarioId]
	// a new room for each scenario
	const room = useMemo(() => scenario.createRoom(), [scenario])

	return (
		<div className="permissions-example">
			<div className="permissions-example__bar">
				{Object.entries(SCENARIOS).map(([id, s]) => (
					<button key={id} data-active={id === scenarioId} onClick={() => setScenarioId(id)}>
						{s.title}
					</button>
				))}
				<span>{scenario.about}</span>
			</div>
			<div className="permissions-example__panes">
				{scenario.panes.map((pane) => (
					<Pane
						key={scenarioId + pane.name}
						room={room}
						scenarioId={scenarioId}
						name={pane.name}
						initialRole={pane.role}
					/>
				))}
			</div>
		</div>
	)
}

// [3]
function Pane({
	room,
	scenarioId,
	name,
	initialRole,
}: {
	room: LocalRoom
	scenarioId: string
	name: string
	initialRole: string
}) {
	const userId = name.toLowerCase()
	const sessionId = `${scenarioId}-${userId}`
	const [role, setRole] = useState(initialRole)
	const [editor, setEditor] = useState<Editor | null>(null)
	const [denial, setDenial] = useState<TLPermissionDenial | null>(null)

	const connect = useMemo(
		() => room.connect(sessionId, ROLES[initialRole](userId)),
		[room, sessionId, initialRole, userId]
	)
	const users = useMemo(
		() => ({
			currentUser: atom(
				'user',
				UserRecordType.create({ id: UserRecordType.createId(userId), name })
			),
		}),
		[userId, name]
	)
	const store = useSync({
		connect,
		users,
		permissions: room.permissions,
		assets: inlineBase64AssetStore,
		records: room.records,
	})

	return (
		<div className="permissions-example__pane">
			<div className="permissions-example__pane-header">
				<strong>{name}</strong>
				<select
					value={role}
					onChange={(e) => {
						setRole(e.target.value)
						// [4]
						room.setAccess(sessionId, ROLES[e.target.value](userId))
					}}
				>
					{Object.keys(ROLES).map((r) => (
						<option key={r}>{r}</option>
					))}
				</select>
				{editor && scenarioId === 'pages' && <AnswersToggle editor={editor} />}
				{editor && scenarioId === 'poll' && <PollPanel editor={editor} />}
				{denial && (
					<span className="permissions-example__denial">
						Denied ({denial.source}): {denial.reason}
					</span>
				)}
			</div>
			<div className="permissions-example__canvas">
				<Tldraw
					store={store}
					onMount={(editor) => {
						setEditor(editor)
						// [5]
						editor.on('permission-denied', setDenial)
						if (scenarioId === 'agent') editor.zoomToFit()
					}}
				/>
			</div>
		</div>
	)
}

function AnswersToggle({ editor }: { editor: Editor }) {
	const page = useValue('answers page', () => editor.getPage(ANSWERS_PAGE), [editor])
	if (!page || !editor.permissions.can('teach')) return null
	return (
		<button
			onClick={() => editor.updatePage({ id: ANSWERS_PAGE, meta: { hidden: !page.meta.hidden } })}
		>
			{page.meta.hidden ? 'Show answers' : 'Hide answers'}
		</button>
	)
}

function PollPanel({ editor }: { editor: Editor }) {
	const votes = useValue(
		'votes',
		() => editor.store.allRecords().filter((r) => (r.typeName as string) === 'vote') as any[],
		[editor]
	)
	return (
		<>
			{['A', 'B'].map((option) => (
				// [6]
				<button key={option} onClick={() => editor.permissions.mutate('vote', { option })}>
					Vote {option} ({votes.filter((v) => v.option === option).length})
				</button>
			))}
		</>
	)
}

function frameRecord(pageId: TLPageId) {
	return {
		id: AGENT_FRAME as TLShapeId,
		typeName: 'shape',
		type: 'frame',
		x: 100,
		y: 100,
		rotation: 0,
		index: 'a1',
		parentId: pageId,
		isLocked: false,
		opacity: 1,
		meta: { agentId: 'bot' },
		props: { w: 400, h: 300, name: "Bot's frame", color: 'black' },
	}
}

/*
This example runs a sync room in the browser and connects several editors to it, one per pane.
In an app, the room runs on your server. Everything else here is the same code an app uses.

[1]
Access is what a session may do: a user id and a list of abilities. Your server decides it when
a socket connects, from a cookie or a share link token. Abilities are plain strings, so a plugin
can add its own, like "poll:vote".

[2]
Each scenario is one permissions object: rules that check each change as a whole transaction,
an optional `canRead` that hides records, and optional mutators that the server runs itself. The
same object goes to the server (`TLSocketRoom`) and the client (`useSync`), so the editor denies
a change at once, before it is sent, and the server checks it again.

[3]
Each pane is one user with their own session. Draw in one pane and see it in the others.

[4]
`updateSessionAccess` changes a session's access live, with no reconnect. Change a role and the
pane updates at once: it becomes read-only, or a hidden page appears.

[5]
The editor emits `permission-denied` for changes it denies itself ("local") and for changes the
server denied ("server"). The default UI also shows a toast.

[6]
`editor.permissions.mutate` runs a named action. The client runs it as a prediction, and the
server runs it again and keeps its own result.
*/
