import { useSync } from '@tldraw/sync'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	Editor,
	Tldraw,
	UserRecordType,
	atom,
	createUserId,
	inlineBase64AssetStore,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { agentArea } from './agentArea'
import { classroom } from './classroom'
import { comments } from './comments'
import { connectToLocalRoom } from './localRoom'
import { pageAccess } from './pageAccess'
import { plugins } from './plugins'
import './record-policies.css'
import { Person, Scenario, actorFor, schemaOptionsFor } from './scenario'
import { shareLinks } from './shareLinks'

// There's a guide at the bottom of this file!

const scenarios = [classroom, shareLinks, pageAccess, comments, agentArea, plugins]

export default function RecordPoliciesExample() {
	const [scenario, setScenario] = useState<Scenario>(scenarios[0])
	return (
		<div className="record-policies">
			<div className="record-policies__tabs">
				{scenarios.map((s) => (
					<button key={s.id} aria-pressed={s === scenario} onClick={() => setScenario(s)}>
						{s.title}
					</button>
				))}
			</div>
			<div className="record-policies__about">
				<p>{scenario.rules}</p>
				<p>
					<strong>Try this:</strong> {scenario.tryThis}
				</p>
			</div>
			<div className="record-policies__panes">
				{scenario.people.map((person) => (
					<Pane key={`${scenario.id}-${person.id}`} scenario={scenario} person={person} />
				))}
			</div>
		</div>
	)
}

function Pane({ scenario, person }: { scenario: Scenario; person: Person }) {
	// [1]
	const connect = useCallback(() => connectToLocalRoom(scenario, person), [scenario, person])
	const users = useMemo(
		() => ({
			currentUser: atom(
				'user',
				UserRecordType.create({ id: createUserId(person.id), name: person.name })
			),
		}),
		[person]
	)
	const store = useSync({
		connect,
		users,
		assets: inlineBase64AssetStore,
		...schemaOptionsFor(scenario),
	})
	const tldrawProps = useMemo(() => scenario.tldrawProps?.(person, scenario), [scenario, person])
	const [editor, setEditor] = useState<Editor | null>(null)
	const [checkLocally, setCheckLocally] = useState(true)
	const [blocked, setBlocked] = useState(0)

	// [2]
	const actor = useValue('actor', () => actorFor(person), [person])
	useEffect(() => {
		if (!editor) return
		editor.setActor(checkLocally ? actor : null)
	}, [editor, actor, checkLocally])

	useEffect(() => {
		if (!editor) return
		editor.getInitialMetaForShape = () => ({ ownerId: person.id })
		scenario.seed?.(editor, person)
		return editor.store.addPolicyDeniedListener((denied) => setBlocked((n) => n + denied.length))
	}, [editor, scenario, person])

	const Controls = scenario.Controls
	return (
		<div className="record-policies__pane">
			<div className="record-policies__header">
				<strong>{person.name}</strong>
				<span className="record-policies__role">{person.role}</span>
				<label title="Run the policies in this editor too. Off: only the server checks, so denied changes snap back.">
					<input
						type="checkbox"
						checked={checkLocally}
						onChange={(e) => setCheckLocally(e.target.checked)}
					/>
					Check locally
				</label>
				{blocked > 0 && <span className="record-policies__blocked">{blocked} blocked</span>}
				{editor && Controls && <Controls editor={editor} person={person} scenario={scenario} />}
			</div>
			<div className="record-policies__editor">
				{store.status === 'synced-remote' ? (
					<Tldraw
						store={store.store}
						shapeUtils={scenario.shapeUtils}
						{...tldrawProps}
						onMount={(editor) => {
							setEditor(editor)
							// Every scenario seeds its shapes near the origin.
							editor.setCamera({ x: 40, y: 80, z: 0.6 })
						}}
					/>
				) : (
					<div className="record-policies__loading">Connecting…</div>
				)}
			</div>
		</div>
	)
}

/*
Each tab is one use case. Three editors connect to one sync room that runs in this browser tab
(localRoom.ts). The editors and the room build their schema from the same scenario: its
`policies`, plus the rules that its record types and shape utils bring.

[1]
`useSync` gets the schema options, policies included, and the room gets the same options
(`schemaOptionsFor`). The room's `getActor` returns each session's actor on every push, so an
access change (see "Share links") applies to the next change without a reconnect.

[2]
`editor.setActor` turns on the client check. A change that the policies deny is reverted in the
editor before it is sent, and shapes that the actor may not change behave like locked shapes.
Turn "Check locally" off to see the server alone: the room discards the push, and the change
snaps back. `getInitialMetaForShape` stamps the owner on new shapes; the policies only verify it.
*/
