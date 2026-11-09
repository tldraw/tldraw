import {
	CanvasComments,
	CommentTool,
	commentToolOverrides,
	useCanComment,
} from '@tldraw/commenting'
import '@tldraw/commenting/commenting.css'
import { useSync } from '@tldraw/sync'
import { ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	CustomRecordInfo,
	DefaultToolbar,
	DefaultToolbarContent,
	Editor,
	T,
	TLAccess,
	TLComponents,
	TLPage,
	TLPageId,
	TLPermissionDenial,
	TLRecord,
	TLRule,
	TLShape,
	TLUiOverrides,
	Tldraw,
	ToolbarItem,
	UserRecordType,
	ancestorIdsOf,
	atom,
	commentSchemaRecords,
	confineToShape,
	createShapeId,
	defaultAbilityRules,
	definePermissions,
	inlineBase64AssetStore,
	intentOwnsTypes,
	ownShapesOnly,
	ownerOf,
	pageReadAccess,
	pageWriteAccess,
	stampOwner,
	toRichText,
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
const NOTES_FRAME = createShapeId('notes')
const HOMEWORK_FRAME = createShapeId('homework')

const voteRecord: CustomRecordInfo = {
	scope: 'document',
	validator: T.object({
		id: T.string,
		typeName: T.literal('vote'),
		userId: T.string,
		option: T.string,
	}),
}

// [2]
function isPrivateTo(record: TLRecord | undefined, userId: string | null) {
	return record?.typeName === 'shape' && record.meta.private === true && ownerOf(record) !== userId
}

// [3]
const lockedFrames: TLRule<TLRecord> = (tx) => {
	if (tx.can('teach')) return
	for (const change of tx.changes) {
		const sides = [
			[tx.before, change.prev],
			[tx.after, change.next],
		] as const
		for (const [records, record] of sides) {
			if (!record) continue
			for (const id of [record.id, ...ancestorIdsOf(records, record)]) {
				const frame = records.get(id)
				if (frame?.typeName === 'shape' && frame.meta.locked) {
					return 'The teacher locked this frame.'
				}
			}
		}
	}
	return undefined
}

// [10]
const pageSettingsByTeacher: TLRule<TLRecord> = (tx) => {
	if (tx.can('teach')) return
	for (const change of tx.changes) {
		if ((change.next ?? change.prev)?.typeName !== 'page') continue
		const before = ((change.prev as TLPage | null)?.meta ?? {}) as TLPageMeta
		const after = ((change.next as TLPage | null)?.meta ?? {}) as TLPageMeta
		if (!!before.locked !== !!after.locked || !!before.hidden !== !!after.hidden) {
			return 'Only the teacher can lock or hide pages.'
		}
	}
	return undefined
}

interface TLPageMeta {
	locked?: boolean
	hidden?: boolean
}

/** UI that one pane adds to its header. */
type PaneTools = ComponentType<{ editor: Editor; setRole(role: string): void }>

interface Scenario {
	title: string
	summary: string
	/** What to do, and what you should see. */
	steps: Array<[string, string]>
	panes: Array<{ name: string; role: keyof typeof ROLES; Tools?: PaneTools }>
	createRoom(): LocalRoom
	/** Shapes that the first pane makes when the room is new. */
	seed?(editor: Editor): void
	comments?: boolean
}

// [4]
const SCENARIOS: Record<string, Scenario> = {
	roles: {
		title: 'Roles and share links',
		summary: 'Each share link gives a role. A role is a list of abilities.',
		steps: [
			['As Eve, draw a rectangle.', 'It appears in every pane.'],
			['As Vic, try to select and move it.', 'Vic is a viewer: there are no tools to change it.'],
			[
				'As Cam, pick the comment tool (C) and click the rectangle.',
				'Cam can comment and everyone sees it, but Cam cannot change shapes.',
			],
			['In Eve’s pane, click "Revoke link".', 'Eve becomes a viewer at once, with no reload.'],
		],
		panes: [
			{ name: 'Vic', role: 'viewer' },
			{ name: 'Cam', role: 'commenter' },
			{ name: 'Eve', role: 'editor', Tools: RevokeLinkButton },
		],
		comments: true,
		createRoom: () =>
			new LocalRoom({
				records: commentSchemaRecords,
				permissions: definePermissions<TLRecord>({ rules: defaultAbilityRules() }),
			}),
	},
	classroom: {
		title: 'Classroom',
		summary: 'Students change only their own shapes. The teacher can change anything.',
		steps: [
			['As Ann, draw a rectangle.', 'It appears in every pane.'],
			[
				'As Bob, drag Ann’s rectangle by its edge, or select it and press Delete.',
				'It does not change, and "Denied changes" says why.',
			],
			['As Tia, drag Ann’s rectangle.', 'It moves for everyone: the teacher may.'],
		],
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
	private: {
		title: 'Private shapes',
		summary: 'A private shape is never sent to anyone but its owner.',
		steps: [
			['As Ann, click "Draw a private shape".', 'Ann sees it. Bob’s pane stays empty.'],
			['As Ann, draw a normal shape.', 'Bob sees that one.'],
			['As Ann, click "Make them public".', 'The private shape appears for Bob.'],
		],
		panes: [
			{ name: 'Ann', role: 'editor', Tools: PrivateShapeButtons },
			{ name: 'Bob', role: 'editor' },
		],
		createRoom: () =>
			new LocalRoom({
				permissions: definePermissions<TLRecord>({
					rules: defaultAbilityRules(),
					// [5]
					canRead: (record, ctx) => {
						const userId = ctx.access.userId
						if (record.typeName === 'binding') {
							return (
								!isPrivateTo(ctx.records.get(record.fromId), userId) &&
								!isPrivateTo(ctx.records.get(record.toId), userId)
							)
						}
						return !isPrivateTo(record, userId)
					},
					stamps: [stampOwner()],
				}),
			}),
	},
	pages: {
		title: 'Pages',
		summary: 'Lock a page, or hide it with everything on it.',
		steps: [
			['As Sam, open the page menu.', 'Sam sees "Page 1" and "Locked", but not "Answers".'],
			['As Sam, go to "Locked" and try to draw.', 'The shape is denied.'],
			['As Tia, click "Show answers".', 'The "Answers" page and its text appear for Sam.'],
		],
		panes: [
			{ name: 'Tia', role: 'teacher', Tools: AnswersToggle },
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
						pageSettingsByTeacher,
						pageWriteAccess({
							canEditPage: (page: any, tx) => !page.meta.locked || tx.can('teach'),
						}),
					],
					canRead: pageReadAccess({
						canSeePage: (page: any, ctx) => !page.meta.hidden || ctx.can('teach'),
					}),
				}),
			}),
		seed: (editor) => {
			editor.createShape({
				type: 'text',
				parentId: LOCKED_PAGE,
				x: 80,
				y: 120,
				props: { richText: toRichText('Only the teacher can change this page.') },
			})
			editor.createShape({
				type: 'text',
				parentId: ANSWERS_PAGE,
				x: 80,
				y: 120,
				props: { richText: toRichText('Answer: 42') },
			})
		},
	},
	offline: {
		title: 'Offline',
		summary: 'Changes made offline are checked one by one when you reconnect.',
		steps: [
			['As Ann, click "Go offline".', 'Ann’s pane stops syncing.'],
			[
				'As Ann, draw a shape in "Notes" and another in "Homework".',
				'They appear only in Ann’s pane.',
			],
			['As Tia, click "Lock homework".', 'Tia sees "Homework (locked)". Ann does not, yet.'],
			[
				'As Ann, click "Reconnect".',
				'The "Notes" shape syncs. The server denies the "Homework" shape, and it disappears.',
			],
		],
		panes: [
			{ name: 'Tia', role: 'teacher', Tools: LockHomeworkButton },
			{ name: 'Ann', role: 'student' },
		],
		createRoom: () =>
			new LocalRoom({
				permissions: definePermissions<TLRecord>({
					rules: [...defaultAbilityRules(), lockedFrames],
				}),
			}),
		seed: (editor) => {
			editor.createShapes([
				{
					id: NOTES_FRAME,
					type: 'frame',
					x: 40,
					y: 80,
					props: { w: 320, h: 180, name: 'Notes' },
				},
				{
					id: HOMEWORK_FRAME,
					type: 'frame',
					x: 40,
					y: 300,
					props: { w: 320, h: 180, name: 'Homework' },
				},
			])
		},
	},
	agent: {
		title: 'Agent',
		summary: 'The agent changes shapes inside its frame only. People are not limited.',
		steps: [
			['As Bot, draw inside "Bot’s frame".', 'It works, and Ann sees it.'],
			['As Bot, draw outside the frame.', 'The shape is denied.'],
			['As Ann, draw anywhere.', 'It works: the limit is only for the agent.'],
		],
		panes: [
			{ name: 'Ann', role: 'editor' },
			{ name: 'Bot', role: 'agent' },
		],
		createRoom: () =>
			new LocalRoom({
				permissions: definePermissions<TLRecord>({
					rules: [
						...defaultAbilityRules(),
						confineToShape({
							appliesTo: (tx) => tx.can('agent'),
							rootId: (tx) => {
								const frame = tx.before.get(AGENT_FRAME)
								return frame?.typeName === 'shape' && frame.meta.agentId === tx.access.userId
									? AGENT_FRAME
									: null
							},
							reason: 'The agent can only change shapes inside its frame.',
						}),
					],
				}),
			}),
		seed: (editor) => {
			editor.createShape({
				id: AGENT_FRAME,
				type: 'frame',
				x: 40,
				y: 80,
				meta: { agentId: 'bot' },
				props: { w: 320, h: 240, name: 'Bot’s frame' },
			})
		},
	},
	poll: {
		title: 'Poll plugin',
		summary: 'A plugin with its own records. Votes change only through the "vote" action.',
		steps: [
			['As Ann, click "Vote A".', 'A has 1 vote in both panes.'],
			['As Ann, click "Vote B".', 'Ann’s vote moves to B: one vote per person.'],
			['As Ann, click "Write a vote directly".', 'Denied: votes only change through "vote".'],
			['As Val, click "Vote A".', 'Denied: viewers cannot vote.'],
		],
		panes: [
			{ name: 'Ann', role: 'student', Tools: PollButtons },
			{ name: 'Val', role: 'viewer', Tools: PollButtons },
		],
		createRoom: () =>
			new LocalRoom({
				records: { vote: voteRecord },
				permissions: definePermissions<TLRecord>({
					rules: [
						...defaultAbilityRules(),
						intentOwnsTypes('vote', { types: ['vote'], ability: 'poll:vote' }),
					],
					// [6]
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
	const [scenarioId, setScenarioId] = useState('roles')
	const scenario = SCENARIOS[scenarioId]
	// a new room for each scenario
	const room = useMemo(() => scenario.createRoom(), [scenario])
	// With several editors on one page, only the one you last clicked should get key presses.
	// Otherwise Delete in Bob's pane also deletes what Ann has selected.
	const focused = useRef<Editor | null>(null)
	const focusEditor = useCallback((editor: Editor) => {
		if (focused.current === editor) return
		focused.current?.blur()
		editor.focus()
		focused.current = editor
	}, [])

	return (
		<div className="permissions-example">
			<div className="permissions-example__tabs" role="tablist">
				{Object.entries(SCENARIOS).map(([id, s]) => (
					<button
						key={id}
						role="tab"
						aria-selected={id === scenarioId}
						onClick={() => setScenarioId(id)}
					>
						{s.title}
					</button>
				))}
			</div>
			<div className="permissions-example__guide">
				<p>{scenario.summary}</p>
				<strong>Try this</strong>
				<ol>
					{scenario.steps.map(([action, outcome]) => (
						<li key={action}>
							<b>{action}</b> {outcome}
						</li>
					))}
				</ol>
			</div>
			<div className="permissions-example__panes">
				{scenario.panes.map((pane, i) => (
					<Pane
						key={scenarioId + pane.name}
						room={room}
						scenario={scenario}
						scenarioId={scenarioId}
						name={pane.name}
						initialRole={pane.role}
						Tools={pane.Tools}
						seeds={i === 0}
						onFocus={focusEditor}
					/>
				))}
			</div>
		</div>
	)
}

interface LogEntry extends TLPermissionDenial {
	key: number
	count: number
}

function Pane({
	room,
	scenario,
	scenarioId,
	name,
	initialRole,
	Tools,
	seeds,
	onFocus,
}: {
	room: LocalRoom
	scenario: Scenario
	scenarioId: string
	name: string
	initialRole: string
	Tools?: PaneTools
	seeds: boolean
	onFocus(editor: Editor): void
}) {
	const userId = name.toLowerCase()
	const sessionId = `${scenarioId}-${userId}`
	const [role, setRoleState] = useState(initialRole)
	const [online, setOnline] = useState(true)
	const [editor, setEditor] = useState<Editor | null>(null)
	const [log, setLog] = useState<LogEntry[]>([])

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

	const setRole = (next: string) => {
		setRoleState(next)
		// [7]
		room.setAccess(sessionId, ROLES[next](userId))
	}

	// [8]
	useEffect(() => {
		if (!editor) return
		let key = 0
		const onDenied = (denial: TLPermissionDenial) => {
			setLog((log) => {
				const [last, ...rest] = log
				if (last && last.reason === denial.reason && last.source === denial.source) {
					return [{ ...last, count: last.count + 1 }, ...rest]
				}
				return [{ ...denial, key: key++, count: 1 }, ...log].slice(0, 4)
			})
		}
		editor.on('permission-denied', onDenied)
		return () => {
			editor.off('permission-denied', onDenied)
		}
	}, [editor])

	const comments = useCommentsUi(scenario.comments ? userId : null)

	return (
		<div className="permissions-example__pane" data-testid={`pane-${userId}`}>
			<div className="permissions-example__pane-header">
				<strong>{name}</strong>
				<select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
					{Object.keys(ROLES).map((r) => (
						<option key={r}>{r}</option>
					))}
				</select>
				<button
					onClick={() => {
						// [9]
						room.setOnline(sessionId, !online)
						setOnline(!online)
					}}
				>
					{online ? 'Go offline' : 'Reconnect'}
				</button>
				{!online && <span className="permissions-example__offline">Offline</span>}
				{editor && Tools && <Tools editor={editor} setRole={setRole} />}
			</div>
			<div
				className="permissions-example__canvas"
				onPointerDownCapture={() => editor && onFocus(editor)}
			>
				<Tldraw
					store={store}
					autoFocus={false}
					{...comments}
					onMount={(editor) => {
						setEditor(editor)
						if (seeds) scenario.seed?.(editor)
					}}
				/>
			</div>
			<div className="permissions-example__log" aria-label="Denied changes">
				<strong>Denied changes</strong>
				{log.length === 0 ? (
					<span className="permissions-example__empty">None yet</span>
				) : (
					<ul>
						{log.map((entry) => (
							<li key={entry.key}>
								<span className="permissions-example__source" data-source={entry.source}>
									{entry.source === 'local' ? 'editor' : 'server'}
								</span>
								{entry.intent && <code>{entry.intent.name}</code>} {entry.reason}
								{entry.count > 1 && ` (×${entry.count})`}
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	)
}

const COMMENT_TOOLS = [CommentTool]
// A commenter's editor is read-only, which hides the quick actions where the comment tool
// usually sits. Put it in the main toolbar, and mark it as fine to use when read-only.
const commentOverrides: TLUiOverrides = {
	tools(editor, tools, helpers) {
		const next = commentToolOverrides.tools!(editor, tools, helpers)
		next.comment = { ...next.comment, readonlyOk: true }
		return next
	},
}

function useCommentsUi(userId: string | null) {
	return useMemo(() => {
		if (!userId) return {}
		const components: TLComponents = {
			Toolbar: () => (
				<DefaultToolbar>
					<CommentToolbarButton userId={userId} />
					<DefaultToolbarContent />
				</DefaultToolbar>
			),
			InFrontOfTheCanvas: () => (
				<CanvasComments
					currentUserId={userId}
					resolveAuthor={(id) => ({ name: id[0].toUpperCase() + id.slice(1) })}
				/>
			),
		}
		return { tools: COMMENT_TOOLS, overrides: [commentOverrides], components }
	}, [userId])
}

function CommentToolbarButton({ userId }: { userId: string }) {
	const canComment = useCanComment(userId)
	return canComment ? <ToolbarItem tool="comment" /> : null
}

// Revoking a link is the server's job, not a change to the document, so no rule decides it.
function RevokeLinkButton({ setRole }: { editor: Editor; setRole(role: string): void }) {
	return <button onClick={() => setRole('viewer')}>Revoke link</button>
}

function PrivateShapeButtons({ editor }: { editor: Editor }) {
	const privateShapes = useValue(
		'private shapes',
		() => editor.getCurrentPageShapes().filter((s) => s.meta.private === true),
		[editor]
	)
	return (
		<>
			<button
				onClick={() =>
					editor.createShape({
						type: 'geo',
						x: 60 + privateShapes.length * 30,
						y: 80 + privateShapes.length * 30,
						meta: { private: true },
						props: {
							w: 220,
							h: 90,
							color: 'red',
							dash: 'dashed',
							richText: toRichText('Private to Ann'),
						},
					})
				}
			>
				Draw a private shape
			</button>
			{privateShapes.length > 0 && (
				<button
					onClick={() =>
						editor.updateShapes(
							privateShapes.map((s: TLShape) => ({ ...s, meta: { ...s.meta, private: false } }))
						)
					}
				>
					Make them public
				</button>
			)}
		</>
	)
}

function AnswersToggle({ editor }: { editor: Editor }) {
	// [11]
	const toggled = useValue(
		'toggled answers page',
		() => {
			const page = editor.getPage(ANSWERS_PAGE)
			return page && { ...page, meta: { ...page.meta, hidden: !page.meta.hidden } }
		},
		[editor]
	)
	const allowed = useValue(
		'can toggle answers',
		() => !!toggled && editor.permissions.wouldAllowPut([toggled]).ok,
		[editor, toggled]
	)
	if (!toggled || !allowed) return null
	return (
		<button onClick={() => editor.updatePage(toggled)}>
			{toggled.meta.hidden ? 'Hide answers' : 'Show answers'}
		</button>
	)
}

function LockHomeworkButton({ editor }: { editor: Editor }) {
	const toggled = useValue(
		'toggled homework',
		() => {
			const frame = editor.getShape(HOMEWORK_FRAME)
			if (!frame || frame.type !== 'frame') return undefined
			const locked = !frame.meta.locked
			return {
				...frame,
				meta: { ...frame.meta, locked },
				props: { ...frame.props, name: locked ? 'Homework (locked)' : 'Homework' },
			}
		},
		[editor]
	)
	const allowed = useValue(
		'can lock homework',
		() => !!toggled && editor.permissions.wouldAllowPut([toggled]).ok,
		[editor, toggled]
	)
	if (!toggled || !allowed) return null
	return (
		<button onClick={() => editor.updateShapes([toggled])}>
			{toggled.meta.locked ? 'Lock homework' : 'Unlock homework'}
		</button>
	)
}

function PollButtons({ editor }: { editor: Editor }) {
	const votes = useValue(
		'votes',
		() => editor.store.allRecords().filter((r) => (r.typeName as string) === 'vote') as any[],
		[editor]
	)
	const userId = editor.permissions.getAccess().userId
	return (
		<>
			{['A', 'B'].map((option) => (
				<button key={option} onClick={() => editor.permissions.mutate('vote', { option })}>
					Vote {option} ({votes.filter((v) => v.option === option).length})
				</button>
			))}
			<button
				onClick={() =>
					editor.run(() => {
						editor.store.put([
							{ id: `vote:${userId}-2`, typeName: 'vote', userId, option: 'A' } as any,
						])
					})
				}
			>
				Write a vote directly
			</button>
		</>
	)
}

/*
This example runs a sync room in the browser and connects several editors to it, one per pane.
In an app, the room runs on your server. Everything else here is the same code an app uses.

[1]
Access is what a session may do: a user id and a list of abilities. Your server decides it when
a socket connects, from a cookie or a share link token: a "view" link gives no abilities, a
"comment" link gives `comment`, an "edit" link gives `edit` and `comment`. The default rules
(`defaultAbilityRules`) need `edit` to change the canvas and `comment` to write comments.
Abilities are plain strings, so your own rules can add more, like "teach" or "poll:vote".

[2]
A shape is private to its owner when `meta.private` is true. `ownerOf` reads `meta.ownerId`,
which `stampOwner` writes on every shape the user creates.

[3]
A rule is a function. It gets the whole transaction (every changed record before and after, the
room before and after, and the session's access) and returns a reason to deny it, or nothing to
allow it. This one denies any change inside a frame whose `meta.locked` is true, unless the
session can "teach". It reads both sides, so a shape cannot be moved into or out of a locked
frame either.

[4]
Each scenario is one permissions object from `definePermissions`: `rules` that check each change
as one transaction, an optional `canRead` that hides records, optional `mutators` that the server
runs itself, and `stamps` that fill in fields on new records. The same object goes to the server
(`TLSocketRoom`) and to the client (`useSync`), so the editor denies a change at once, before it
is sent, and the server checks it again.

[5]
`canRead` decides which records each session receives. The server never sends Bob a record that
Ann made private, so it is not in his browser at all. When a record changes, the server checks it
again: make the shape public, and it is sent to Bob. A session also cannot write a record it
cannot see, before or after the change. Bindings to a hidden shape are hidden too, so Bob's
client never holds an arrow that points at nothing.

[6]
A mutator is a named action. `editor.permissions.mutate('vote', args)` runs it on the client as a
prediction, and the server runs it again and keeps its own result, so a client cannot vote for
someone else. `intentOwnsTypes` makes the "vote" action the only way to change vote records:
writing one directly is denied.

[7]
`room.updateSessionAccess` changes a session's access live, with no reconnect. Change a role, or
revoke a link, and the pane updates at once: it becomes read-only, or a hidden page appears.

[8]
The editor emits `permission-denied` for changes it denies itself (source "local") and for
changes the server denied (source "server"). The default UI also shows a toast. A denied change is
rolled back, so the canvas shows only what the server accepts.

[9]
While offline, the editor still checks each change against the access it last had. On reconnect,
the client sends what it changed offline one action at a time, and the server checks each one
against the room as it is now. If the teacher locked a frame in the meantime, only the changes
inside that frame are denied and rolled back. The rest are kept.

[10]
Rules can be about any field. This one lets only the teacher change a page's `locked` or `hidden`
flag. Without it, a student could hide "Page 1" from everyone.

[11]
UI asks the same rules that the server checks. `editor.permissions.wouldAllowPut(records)` checks
one change without making it, so the button shows only when the click would be allowed, and it
updates when the access changes. Do not copy a rule into the UI as an ability check, such as
`can('teach')`: the two drift apart, and the button then offers a change that is denied.
*/
