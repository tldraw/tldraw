/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import {
	DefaultPeopleMenuAvatar,
	DefaultPeopleMenuFacePile,
	InstancePresenceRecordType,
	PeopleMenu,
	TLUserId,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import '../tla/styles/tla.css'
import { Specimen, SPECIMEN_CSS } from './dev-components-kit'
import { DevComponentsNav } from './dev-components-nav'
import { MinimalEditorHarness } from './dev-editor-harness'

/**
 * Dev-only inventory of the dotcom collaboration / presence UI: cursors, avatars,
 * the people menu, the current user. This family is almost entirely DELEGATED to
 * the SDK — dotcom wires up TldrawCurrentUser / PeopleMenu / TldrawUser and the
 * editor renders the live cursors and presence. The app owns colour and wiring,
 * not the UI. Mocked (the real components need a live editor / sync session).
 *
 * Route: /dev/components/presence.
 */

const Stat = ({ n, label }: { n: string; label: string }): ReactNode => (
	<div className="stat">
		<div className="stat__n">{n}</div>
		<div className="stat__label">{label}</div>
	</div>
)

/**
 * Live presence with no sync session. The cursor UI is real — the editor renders
 * a cursor for every collaborator in editor.getCollaborators(), which just reads
 * instance_presence records from the store. We fake the data by putting three
 * fake presence records in (lastActivityTimestamp: null = "active right now", so
 * they never time out). Real UI, fake collaborators — no multiplayer needed.
 */
const COLLABORATORS = [
	{ id: 'user:casey', name: 'Casey', color: '#268bd2', x: 70, y: 50 },
	{ id: 'user:jordan', name: 'Jordan', color: '#859900', x: 180, y: 95 },
	{ id: 'user:morgan', name: 'Morgan', color: '#cb4b16', x: 120, y: 140 },
]
const COLLAB_IDS = COLLABORATORS.map((c) => c.id as TLUserId)

/**
 * Puts fake collaborators into the editor store so the real presence UI has data
 * to render (lastActivityTimestamp: null = always active). cursors=false parks
 * them off-screen so cards that show a DOM component (facepile / menu) aren't
 * cluttered by cursors on the canvas behind.
 */
const InjectPresence = ({ cursors }: { cursors?: boolean }): ReactNode => {
	const editor = useEditor()
	useEffect(() => {
		const currentPageId = editor.getCurrentPageId()
		editor.store.put(
			COLLABORATORS.map((c) =>
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId(c.id),
					userId: c.id as TLUserId,
					userName: c.name,
					currentPageId,
					color: c.color,
					cursor: cursors
						? { x: c.x, y: c.y, type: 'default', rotation: 0 }
						: { x: -1000, y: -1000, type: 'default', rotation: 0 },
					lastActivityTimestamp: null,
				})
			)
		)
	}, [editor, cursors])
	return null
}

/** One presence card: a minimal editor (fake collaborators) with an optional
 * DOM component overlaid. cursors shows the collaborator cursors on the canvas. */
const PresenceCard = ({
	cursors,
	children,
}: {
	cursors?: boolean
	children?: ReactNode
}): ReactNode => (
	<MinimalEditorHarness height={150} bare>
		<InjectPresence cursors={cursors} />
		{children && <div className="presenceOverlay">{children}</div>}
	</MinimalEditorHarness>
)

export function Component() {
	return (
		<div
			className="tla tl-container tla-theme-container tla-theme__light tl-theme__light"
			style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'auto' }}
		>
			<Helmet>
				<title>Presence inventory — dev</title>
			</Helmet>
			<style>{PAGE_CSS + SPECIMEN_CSS}</style>

			<div className="page">
				<DevComponentsNav />
				<header className="page__header">
					<h1 className="page__title">Presence &amp; collaboration</h1>
					<p className="page__lede">
						Cursors, avatars, the people menu, the current user — multiplayer UI the app{' '}
						<strong>delegates</strong> to the SDK (the same mode as{' '}
						<a href="/dev/components/overlays">overlays</a>). dotcom wires up the SDK presence
						components and supplies the user colour; the editor draws the live cursors. The app owns
						almost no collaboration UI of its own.
					</p>
				</header>

				<section className="section">
					<h2 className="section__title">What dotcom uses</h2>
					<div className="stats">
						<Stat n="9" label="TldrawCurrentUser" />
						<Stat n="3" label="PeopleMenu" />
						<Stat n="2" label="TldrawUser" />
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">Live presence — fake collaborators, real UI</h2>
					<p className="section__note">
						No multiplayer session. Each card is a minimal editor with three fake{' '}
						<code>instance_presence</code> records (<code>lastActivityTimestamp: null</code> = always
						active); the real SDK presence components then render from that data. Real UI — only the
						collaborators are fake.
					</p>
					<div className="grid">
						<Specimen
							label="live cursor"
							code={`(editor canvas · from presence)`}
							meta="name label in the user's colour"
							source="editor — TlaEditor.tsx"
						>
							<PresenceCard cursors />
						</Specimen>
						<Specimen
							label="DefaultPeopleMenuAvatar"
							code={`<DefaultPeopleMenuAvatar userId />`}
							meta="one collaborator's avatar"
							source="SharePanel"
						>
							<PresenceCard>
								<DefaultPeopleMenuAvatar userId={COLLAB_IDS[0]} />
							</PresenceCard>
						</Specimen>
						<Specimen
							label="DefaultPeopleMenuFacePile"
							code={`<DefaultPeopleMenuFacePile userIds />`}
							meta="all collaborators' avatars"
							source="TldrawUiSharePanel"
						>
							<PresenceCard>
								<DefaultPeopleMenuFacePile userIds={COLLAB_IDS} userName="You" userColor="#6c71c4" />
							</PresenceCard>
						</Specimen>
						<Specimen
							label="PeopleMenu"
							code={`<PeopleMenu />`}
							meta="facepile + collaborators dropdown · ×3"
							source="TlaInviteTab.tsx"
						>
							<PresenceCard>
								<PeopleMenu />
							</PresenceCard>
						</Specimen>
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">Where dotcom touches presence</h2>
					<table className="matrix">
						<thead>
							<tr>
								<th>what</th>
								<th>who owns it</th>
								<th>dotcom&rsquo;s part</th>
							</tr>
						</thead>
						<tbody>
							{ROWS.map((r) => (
								<tr key={r[0]}>
									<td>{r[0]}</td>
									<td>{r[1]}</td>
									<td>{r[2]}</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>
			</div>
		</div>
	)
}

const ROWS: ReadonlyArray<readonly [string, string, string]> = [
	['live cursors', 'SDK editor', 'nothing — rendered from sync presence'],
	['collaborator avatars', 'SDK share panel / PeopleMenu', 'wires PeopleMenu into the invite tab'],
	['current user', 'SDK (TldrawCurrentUser)', 'supplies identity + colour via useUser'],
	['user colour', 'dotcom + SDK', 'member.userColor seeds the presence colour'],
]

const PAGE_CSS = `
.page {
	min-height: 100vh;
	background: var(--tl-color-background);
	color: var(--tl-color-text);
	font-family: var(--tla-font-ui);
	padding: 24px 40px 80px;
	box-sizing: border-box;
}
.page__header { max-width: 760px; margin-bottom: 40px; }
.page__title { font-size: 28px; font-weight: 700; margin: 0 0 12px; }
.page__lede { font-size: 14px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0; }
.page__lede strong { color: var(--tl-color-text-0); font-weight: 600; }
.page__lede code, .page__footer code { font-family: ui-monospace, monospace; font-size: 0.92em; background: var(--tl-color-low); padding: 1px 4px; border-radius: 3px; }
.page__lede a { color: var(--tl-color-primary); }
.section { margin-bottom: 48px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 760px; }
.stats { display: flex; gap: 16px; flex-wrap: wrap; }
.stat { border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 20px; min-width: 180px; background: var(--tl-color-panel); }
.stat__n { font-size: 26px; font-weight: 700; font-family: ui-monospace, monospace; }
.stat__label { font-size: 12px; color: var(--tl-color-text-1); margin-top: 4px; font-family: ui-monospace, monospace; }
.presenceOverlay { position: absolute; top: 12px; right: 12px; z-index: 100; }
.cursorMock { display: inline-flex; align-items: center; gap: 4px; }
.cursorMock__name { background: #268bd2; color: #fff; font-size: 11px; padding: 1px 6px; border-radius: 4px; }
.facepile { display: inline-flex; }
.avatar { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; color: #fff; font-size: 10px; font-weight: 600; border: 2px solid var(--tl-color-panel); margin-left: -6px; }
.avatar:first-child { margin-left: 0; }
.ctrlMock { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border: 1px solid var(--tla-color-secondary-border, var(--tl-color-divider)); border-radius: var(--tl-radius-2); background: var(--tl-color-panel); font-size: 12px; }
.matrix { border-collapse: collapse; font-size: 12px; font-family: ui-monospace, monospace; }
.matrix th, .matrix td { text-align: left; padding: 6px 18px 6px 0; border-bottom: 1px solid var(--tl-color-divider); vertical-align: top; }
.matrix th { color: var(--tl-color-text-3); font-weight: 500; }
.page__footer { max-width: 760px; font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); border-top: 1px solid var(--tl-color-divider); padding-top: 20px; }
`
