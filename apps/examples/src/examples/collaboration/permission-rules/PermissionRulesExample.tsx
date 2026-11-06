import { TLRulesDefinition, compileRules } from '@tldraw/rules'
import { useSync } from '@tldraw/sync'
import isEqual from 'lodash/isEqual'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	Editor,
	TLAssetStore,
	TLRecord,
	TLUserStore,
	Tldraw,
	atom,
	computed,
	createUserId,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { LocalRoom, seedSnapshot } from './localRoom'
import './permission-rules.css'
import { Scenario, scenarios } from './scenarios'

// There's a guide at the bottom of this file!

const assets: TLAssetStore = {
	upload: async () => ({ src: '' }),
	resolve: (asset) => asset.props.src,
}

export default function PermissionRulesExample() {
	const [scenarioId, setScenarioId] = useState(scenarios[0].id)
	const scenario = scenarios.find((s) => s.id === scenarioId)!

	return (
		<div className="pr-root">
			<header className="pr-header">
				<nav className="pr-tabs">
					{scenarios.map((s) => (
						<button
							key={s.id}
							className={s.id === scenarioId ? 'pr-tab pr-tab--active' : 'pr-tab'}
							onClick={() => setScenarioId(s.id)}
						>
							{s.title}
						</button>
					))}
				</nav>
				<p className="pr-summary">{scenario.summary}</p>
				<ol className="pr-steps">
					{scenario.steps.map((step, i) => (
						<li key={i}>
							<span className="pr-step-do">{step.do}</span>
							<span className="pr-step-see">{step.see}</span>
						</li>
					))}
				</ol>
			</header>
			{/* [1] */}
			<ScenarioView key={scenario.id} scenario={scenario} />
		</div>
	)
}

function ScenarioView({ scenario }: { scenario: Scenario }) {
	// [2]
	const room = useMemo(() => new LocalRoom(seedSnapshot(scenario.seed), scenario.rules), [scenario])
	useEffect(() => () => room.close(), [room])
	const [rules, setRules] = useState<TLRulesDefinition>(scenario.rules)

	return (
		<div className="pr-body">
			<div className="pr-panes">
				{scenario.panes.map((userIndex, i) => (
					<Pane key={i} room={room} scenario={scenario} initialUser={userIndex} />
				))}
			</div>
			<RulesPanel
				scenario={scenario}
				rules={rules}
				onApply={(next) => {
					// [3]
					room.room.updateRules(next)
					setRules(next)
				}}
			/>
		</div>
	)
}

function Pane({
	room,
	scenario,
	initialUser,
}: {
	room: LocalRoom
	scenario: Scenario
	initialUser: number
}) {
	const [userIndex, setUserIndex] = useState(initialUser)
	const userRef = useRef(scenario.users[initialUser].user)
	// [8]
	const [users] = useState(() => {
		const label = atom('pane user', scenario.users[initialUser])
		const store: TLUserStore = {
			currentUser: computed('current user', () => {
				const { label: name, user } = label.get()
				if (typeof user.id !== 'string') return null
				return {
					id: createUserId(user.id),
					typeName: 'user',
					name,
					color: '#2563eb',
					imageUrl: '',
					meta: {},
				}
			}),
		}
		return { label, store }
	})
	const sessionRef = useRef<string | null>(null)
	const [editor, setEditor] = useState<Editor | null>(null)

	// [4]
	const connect = useCallback(() => {
		const { sessionId, socket } = room.connect(userRef.current)
		sessionRef.current = sessionId
		return socket
	}, [room])
	const store = useSync({ connect, assets, users: users.store })

	const changeUser = (index: number) => {
		setUserIndex(index)
		userRef.current = scenario.users[index].user
		users.label.set(scenario.users[index])
		// [5]
		if (sessionRef.current) room.room.updateSessionUser(sessionRef.current, userRef.current)
	}

	return (
		<div className="pr-pane">
			<div className="pr-pane-header">
				<select value={userIndex} onChange={(e) => changeUser(Number(e.target.value))}>
					{scenario.users.map((u, i) => (
						<option key={i} value={i}>
							{u.label}
						</option>
					))}
				</select>
				{editor && <PaneStatus editor={editor} scenario={scenario} />}
			</div>
			{editor && <PaneHoldings editor={editor} room={room} />}
			<div className="pr-canvas">
				<Tldraw
					store={store}
					onMount={(e) => {
						e.zoomToFit()
						setEditor(e)
					}}
				/>
			</div>
			{editor && <DenialBar editor={editor} />}
		</div>
	)
}

function PaneStatus({ editor, scenario }: { editor: Editor; scenario: Scenario }) {
	const isReadonly = useValue('readonly', () => editor.getIsReadonly(), [editor])
	const user = useValue('user', () => editor.rules.getUser(), [editor])
	const canAct = useValue(
		'can act',
		() => (scenario.action ? scenario.action.show(editor) : false),
		[editor, scenario]
	)
	return (
		<>
			{isReadonly && <span className="pr-badge">read-only (derived)</span>}
			{canAct && (
				<button className="pr-action" onClick={() => scenario.action!.run(editor)}>
					{scenario.action!.label}
				</button>
			)}
			<code className="pr-user">{JSON.stringify(user)}</code>
		</>
	)
}

// [9]
function PaneHoldings({ editor, room }: { editor: Editor; room: LocalRoom }) {
	const [holdings, setHoldings] = useState({
		held: 0,
		total: 0,
		notSent: [] as string[],
		masked: [] as string[],
	})
	useEffect(() => {
		const update = () => {
			const inRoom = room.records()
			const notSent: string[] = []
			const masked: string[] = []
			let held = 0
			for (const record of inRoom) {
				const mine = editor.store.get(record.id)
				if (!mine) notSent.push(describe(record))
				else {
					held++
					if (!isEqual(mine, record)) masked.push(describe(record))
				}
			}
			setHoldings({ held, total: inRoom.length, notSent, masked })
		}
		update()
		const t = setInterval(update, 500)
		return () => clearInterval(t)
	}, [editor, room])
	return (
		<div className="pr-holdings">
			This pane holds <strong>{holdings.held}</strong> of {holdings.total} records in the room.
			{holdings.notSent.length > 0 && (
				<span title={holdings.notSent.join('\n')}>
					{' '}
					Not sent: <strong>{holdings.notSent.length}</strong> (
					{holdings.notSent.slice(0, 3).join(', ')}
					{holdings.notSent.length > 3 ? ', …' : ''}).
				</span>
			)}
			{holdings.masked.length > 0 && (
				<span title={holdings.masked.join('\n')}>
					{' '}
					Sent with a hidden field: <strong>{holdings.masked.length}</strong> (
					{holdings.masked.join(', ')}).
				</span>
			)}
		</div>
	)
}

function describe(record: TLRecord) {
	if (record.typeName === 'page') return `page “${record.name}”`
	if (record.typeName === 'shape') return `${record.type} ${record.id.replace('shape:', '')}`
	return record.typeName
}

// [6]
function DenialBar({ editor }: { editor: Editor }) {
	const last = useValue('last denial', () => editor.rules.getLastDenial(), [editor])
	const [visible, setVisible] = useState(false)
	useEffect(() => {
		if (!last) return
		setVisible(true)
		const t = setTimeout(() => setVisible(false), 4000)
		return () => clearTimeout(t)
	}, [last])
	if (!last || !visible) return <div className="pr-denial pr-denial--empty" />
	return (
		<div className="pr-denial">
			<strong>{last.denial.message ?? 'Not allowed'}</strong>
			<span>
				Why: {last.denial.reason}. Rule <code>{last.denial.rule}</code>, clause{' '}
				<code>{last.denial.clause}</code>.
			</span>
		</div>
	)
}

/** Only the parts of a definition at these paths, such as `let` or `types.shape`. */
function excerpt(rules: TLRulesDefinition, paths: string[]) {
	const out: Record<string, any> = {}
	for (const path of paths) {
		const keys = path.split('.')
		let from: any = rules
		for (const k of keys) from = from?.[k]
		if (from === undefined) continue
		let to = out
		keys.slice(0, -1).forEach((k) => (to = to[k] ??= {}))
		to[keys[keys.length - 1]] = from
	}
	return out
}

const TOOLS = ['draw', 'geo', 'text', 'note', 'arrow', 'frame', 'line'] as const

// [7]
function RulesPanel({
	scenario,
	rules,
	onApply,
}: {
	scenario: Scenario
	rules: TLRulesDefinition
	onApply(rules: TLRulesDefinition): void
}) {
	const [text, setText] = useState(() => JSON.stringify(rules, null, 2))
	const [error, setError] = useState<string | null>(null)
	const compiled = useMemo(() => compileRules(rules), [rules])

	return (
		<aside className="pr-rules">
			<h3>The rules for this scenario</h3>
			<p className="pr-note">
				The part that matters here. It is plain data: the room enforces it, and every editor gets a
				copy.
			</p>
			<pre className="pr-excerpt">
				{JSON.stringify(excerpt(rules, scenario.rulePaths), null, 2)}
			</pre>
			<details>
				<summary>Edit all the rules, live</summary>
				<textarea spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} />
			</details>
			<div className="pr-rules-actions">
				<button
					onClick={() => {
						try {
							const next = JSON.parse(text) as TLRulesDefinition
							compileRules(next)
							setError(null)
							onApply(next)
						} catch (e) {
							setError((e as Error).message)
						}
					}}
				>
					Apply to the room
				</button>
				{error && <span className="pr-error">{error}</span>}
			</div>
			<h3>What the analyzer derives</h3>
			<table className="pr-analysis">
				<thead>
					<tr>
						<th>User</th>
						{TOOLS.map((t) => (
							<th key={t}>{t}</th>
						))}
						<th>read-only</th>
					</tr>
				</thead>
				<tbody>
					{scenario.users.map((u) => {
						const readonly = (['create', 'update', 'delete'] as const).every(
							(op) => compiled.decide(op, 'shape', u.user) === 'deny'
						)
						return (
							<tr key={u.label}>
								<td>{u.label}</td>
								{TOOLS.map((t) => {
									const d = compiled.decide('create', 'shape', u.user, { next: { type: t } })
									return (
										<td key={t} className={`pr-d pr-d--${d}`}>
											{d}
										</td>
									)
								})}
								<td>{readonly ? 'yes' : 'no'}</td>
							</tr>
						)
					})}
				</tbody>
			</table>
			<p className="pr-note">
				“maybe” means it depends on the record, such as where the shape is drawn. The toolbar hides
				only “deny”.
			</p>
		</aside>
	)
}

/*
This example runs a real sync room in the browser, with access rules from `@tldraw/rules`. Each
pane is a separate session, as a separate person on a separate machine would be.

[1]
Each scenario gets a fresh room. The rules for each one live in `useCaseRules` in
`@tldraw/rules`, and the sync-core tests backtest the same rule sets.

[2]
`LocalRoom` wraps a `TLSocketRoom` with `rules`. The room checks every write against the rules,
stamps trusted fields (like `meta.ownerId`) on create, and sends each session only the records
its read rules allow.

[3]
Rules are data. The room can replace them live, and every session re-checks and re-filters.

[4]
`useSync` takes a `connect` function for custom transports. The room sends the rules and this
session's user facts at connect. The editor compiles the same rules, so `editor.rules` answers
"may I?" exactly as the server will: it hides tools, locks shapes the user may not touch, and
turns the editor read-only when no shape write is possible.

[5]
Changing who a pane is changes the session's user facts on the server. The client gets the new
facts and gains or loses records, live, with no reconnect.

[6]
A write the rules deny never leaves the editor. `editor.rules.getLastDenial()` has the rule's
message, the clause that failed, and a reason in plain words, such as `prev.meta.ownerId is
"bob" and user.id is "ann"`.

[7]
Because rules are data, the editor can analyze them: `decide()` answers for a partial record,
which is how the toolbar knows which tools to show before any write.

[8]
Each person publishes their display name as a `user` record. The rules (`userRecordRules`) let
each person write only the record at their own id, so nobody can rename someone else.

[9]
The proof of read control. The pane compares what it holds with what the room holds: records the
room never sent, and records it sent with a field hidden (a card face). It reads the room
directly, which only this demo can do, because the room runs in the same browser tab.
*/
