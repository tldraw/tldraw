/* eslint-disable tldraw/jsx-no-literals, react/no-unescaped-entities */
import { ReactNode, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import {
	DefaultPeopleMenuAvatar,
	InstancePresenceRecordType,
	PeopleMenu,
	TLUserId,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { TlaIcon } from '../tla/components/TlaIcon/TlaIcon'
import '../tla/styles/tla.css'
import { Specimen, SPECIMEN_CSS } from './dev-components-kit'
import { DevComponentsNav } from './dev-components-nav'
import { MinimalEditorHarness } from './dev-editor-harness'

/**
 * Dev-only inventory of how a user's DISPLAY NAME is sourced and rendered. There
 * is no single source of truth and no shared accessor: Clerk seeds the name once,
 * then the app keeps three independent copies (user.name, member.userName, the
 * SDK presence name) that each drift. Each surface reads a different raw field,
 * with a different empty-name fallback and a different avatar treatment.
 *
 * Two "seed once, never resync" bugs are catalogued here:
 *   1. Clerk fullName -> user.name is create-once (TLUserDurableObject.ts:114,
 *      `if (!user)`); renaming in Clerk never propagates.
 *   2. user.name -> member.userName is write-once (mutators.ts:260/:482); the
 *      workspace members list tracks neither Clerk nor user.name.
 *
 * The presence surfaces render live (fake instance_presence); the app-coupled
 * surfaces (user menu, members list) are faithful representations. Candidate for
 * a shared useUserName / <UserAvatar> primitive. Route: /dev/components/identity.
 */

const USER = { id: 'user:casey' as TLUserId, name: 'Casey Jordan', color: '#268bd2' }

/** Fake presence so the real SDK name UI has data (lastActivityTimestamp: null =
 * always active). `name` overrides so we can demo empty-name fallbacks. */
const InjectPresence = ({ name = USER.name }: { name?: string }): ReactNode => {
	const editor = useEditor()
	useEffect(() => {
		editor.store.put([
			InstancePresenceRecordType.create({
				id: InstancePresenceRecordType.createId(USER.id),
				userId: USER.id,
				userName: name,
				currentPageId: editor.getCurrentPageId(),
				color: USER.color,
				cursor: { x: 60, y: 45, type: 'default', rotation: 0 },
				lastActivityTimestamp: null,
			}),
		])
	}, [editor, name])
	return null
}

const PresenceStage = ({ name, overlay }: { name?: string; overlay?: ReactNode }): ReactNode => (
	<MinimalEditorHarness height={140} bare>
		<InjectPresence name={name} />
		{overlay && <div className="idOverlay">{overlay}</div>}
	</MinimalEditorHarness>
)

/** Faithful representation of the sidebar user-settings trigger, which reads
 * app.getUser().name and falls back to the literal text "Account". Marked mock:
 * the real TlaSidebarUserSettingsMenu needs the app/Zero context. */
const UserMenuTrigger = ({ name }: { name: string }): ReactNode => (
	<span className="menuTrigger">
		<TlaIcon icon="avatar" className="menuTrigger__avatar" />
		<span className="menuTrigger__name">{name || 'Account'}</span>
		<TlaIcon icon="dots-vertical-strong" className="menuTrigger__dots" />
	</span>
)

/** The members-list treatment: an initials chip from userName.charAt(0) + the name. */
const MemberRow = ({ name }: { name: string }): ReactNode => (
	<span className="memberRow">
		<span className="memberRow__initial" style={{ background: USER.color }}>
			{name.charAt(0).toUpperCase()}
		</span>
		<span className="memberRow__name">{name}</span>
	</span>
)

export function Component() {
	return (
		<div
			className="tla tl-container tla-theme-container tla-theme__light tl-theme__light"
			style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'auto' }}
		>
			<Helmet>
				<title>Identity & names — dev</title>
			</Helmet>
			<style>{PAGE_CSS + SPECIMEN_CSS}</style>

			<div className="page">
				<DevComponentsNav />
				<header className="page__header">
					<h1 className="page__title">Identity &amp; names</h1>
					<p className="page__lede">
						How a user's <strong>display name</strong> is sourced and shown. There is{' '}
						<strong>no single source of truth and no shared accessor</strong> — Clerk seeds the name
						once, then three independent copies drift, and every surface reads a different raw field
						with a different empty-name fallback and a different avatar. Same shape as the{' '}
						<a href="/dev/components/timestamps">dates</a> finding, but with a live staleness bug.
					</p>
				</header>

				<section className="section">
					<div className="stats">
						<Stat n="3" label="stored copies of the name" accent />
						<Stat n="0" label="shared accessor (useUserName)" />
						<Stat n="2" label='"seed once, never resync" bugs' accent />
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">The flow</h2>
					<p className="section__note">
						One name, seeded from Clerk, denormalised into three stores at different lifecycle
						moments. Bold arrows are the two one-way seed steps that never resync.
					</p>
					<div className="flow">
						<div className="flow__node flow__node--root">
							Clerk<span className="flow__sub">clerkUser.fullName</span>
						</div>
						<div className="flow__arrow flow__arrow--bug">
							↓ create-once
							<span className="flow__sub">TLUserDurableObject.ts:114 · if (!user)</span>
						</div>
						<div className="flow__node">
							user record<span className="flow__sub">user.name</span>
						</div>
						<div className="flow__split">
							<div className="flow__branch">
								<div className="flow__arrow">↓ derived (live)</div>
								<div className="flow__node flow__node--sdk">
									SDK presence<span className="flow__sub">instance_presence.userName</span>
								</div>
								<div className="flow__arrow">↓</div>
								<div className="flow__leaf">user cursor · people menu</div>
							</div>
							<div className="flow__branch">
								<div className="flow__arrow">↓ read (live)</div>
								<div className="flow__leaf">user menu</div>
							</div>
							<div className="flow__branch">
								<div className="flow__arrow flow__arrow--bug">
									↓ write-once<span className="flow__sub">mutators.ts:260</span>
								</div>
								<div className="flow__node flow__node--snap">
									member record<span className="flow__sub">member.userName (snapshot)</span>
								</div>
								<div className="flow__arrow">↓</div>
								<div className="flow__leaf">workspace members list</div>
							</div>
						</div>
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">The same name, four surfaces</h2>
					<p className="section__note">
						Presence surfaces render live (a fake <code>instance_presence</code> record); the
						app-coupled surfaces are faithful representations (they need the app/Zero context).
					</p>
					<div className="grid">
						<Specimen
							label="user cursor"
							code={`instance_presence.userName`}
							meta="name label in the user's colour"
							source="SDK editor · TlaEditor.tsx"
						>
							<PresenceStage />
						</Specimen>
						<Specimen
							label="people menu"
							code={`<PeopleMenu />`}
							meta="collaborator names"
							source="TlaInviteTab.tsx"
						>
							<PresenceStage overlay={<PeopleMenu />} />
						</Specimen>
						<Specimen
							label="people-menu avatar"
							code={`<DefaultPeopleMenuAvatar userId />`}
							meta="colour swatch, no initials"
							source="SharePanel"
						>
							<PresenceStage overlay={<DefaultPeopleMenuAvatar userId={USER.id} />} />
						</Specimen>
						<Specimen
							label="user menu (sidebar)"
							code={`app.getUser().name || 'Account'`}
							meta="generic avatar icon · fallback text 'Account'"
							source="TlaSidebarUserSettingsMenu.tsx:67"
							mock
						>
							<UserMenuTrigger name={USER.name} />
						</Specimen>
						<Specimen
							label="workspace members"
							code={`member.userName · userName.charAt(0)`}
							meta="initials chip from the snapshot name"
							source="WorkspaceSettingsDialog.tsx:440"
							mock
						>
							<MemberRow name={USER.name} />
						</Specimen>
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">Where each store comes from</h2>
					<table className="matrix">
						<thead>
							<tr>
								<th>store</th>
								<th>seeded from</th>
								<th>updates when</th>
								<th>feeds</th>
							</tr>
						</thead>
						<tbody>
							{STORES.map((r) => (
								<tr key={r[0]} data-bug={r[4] || undefined}>
									<td>{r[0]}</td>
									<td>{r[1]}</td>
									<td>{r[2]}</td>
									<td>{r[3]}</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>

				<section className="section">
					<h2 className="section__title">The bug: seed once, never resync</h2>
					<div className="callout callout--bug">
						Two copies are written once and never updated.{' '}
						<strong>
							<code>user.name</code> is create-once
						</strong>{' '}
						(<code>TLUserDurableObject.ts:114</code> guards the whole bootstrap with{' '}
						<code>if (!user)</code>, seeding <code>clerkUser.fullName</code>), and there's no Clerk
						webhook — so renaming yourself in Clerk never reaches dotcom.{' '}
						<strong>
							<code>member.userName</code> is write-once
						</strong>{' '}
						(<code>mutators.ts:260</code>, no update path). Editing your name in the editor updates{' '}
						<code>user.name</code> (cursor + menu) but not <code>member.userName</code> — so the
						workspace members list is <strong>doubly stale</strong>: it tracks neither Clerk nor{' '}
						<code>user.name</code>.
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">Empty-name: three different fallbacks (live)</h2>
					<p className="section__note">
						The same user with <code>name = ''</code>. Each surface degrades differently — no shared
						"anonymous" treatment.
					</p>
					<div className="grid">
						<Specimen label="cursor" meta="blank label (?? '')" source="SDK">
							<PresenceStage name="" />
						</Specimen>
						<Specimen label="user menu" meta={`text 'Account'`} source="menu" mock>
							<UserMenuTrigger name="" />
						</Specimen>
						<Specimen label="members list" meta="empty initial + blank" source="members" mock>
							<MemberRow name="" />
						</Specimen>
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">The gap</h2>
					<div className="callout">
						Timestamps needed a <code>&lt;Timestamp&gt;</code>; names need a shared{' '}
						<strong>
							<code>useUserName(userId)</code> / <code>&lt;UserName&gt;</code> +{' '}
							<code>&lt;UserAvatar&gt;</code>
						</strong>{' '}
						resolver. The denormalised copies can stay for sync/perf, but every read should go
						through one accessor that resolves a single source, decides the snapshot-vs-live
						question once, and owns the fallback + avatar treatment — instead of four raw
						field-reads with four different empty-states.
					</div>
				</section>
			</div>
		</div>
	)
}

const Stat = ({ n, label, accent }: { n: string; label: string; accent?: boolean }): ReactNode => (
	<div className="stat" data-accent={accent || undefined}>
		<div className="stat__n">{n}</div>
		<div className="stat__label">{label}</div>
	</div>
)

const STORES: ReadonlyArray<readonly [string, string, string, string, boolean]> = [
	[
		'clerkUser.fullName',
		'the user (Clerk account)',
		'user edits Clerk profile',
		'seed only',
		false,
	],
	[
		'user.name',
		'Clerk fullName, once',
		'editor preferences only — NOT Clerk',
		'cursor · people menu · user menu',
		true,
	],
	[
		'member.userName',
		'user.name / Clerk, at join',
		'never (write-once)',
		'workspace members list',
		true,
	],
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
.page__header { max-width: 820px; margin-bottom: 32px; }
.page__title { font-size: 28px; font-weight: 700; margin: 0 0 12px; }
.page__lede { font-size: 14px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0; }
.page__lede strong { color: var(--tl-color-text-0); font-weight: 600; }
.page__lede a { color: var(--tl-color-primary); }
.page__lede code, .section__note code, .callout code { font-family: ui-monospace, monospace; font-size: 0.92em; background: var(--tl-color-low); padding: 1px 4px; border-radius: 3px; }
.section { margin-bottom: 44px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 820px; }
.stats { display: flex; gap: 16px; flex-wrap: wrap; }
.stat { border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 20px; min-width: 180px; background: var(--tl-color-panel); }
.stat[data-accent] { border-color: var(--tl-color-warning, #cb4b16); }
.stat__n { font-size: 26px; font-weight: 700; font-family: ui-monospace, monospace; }
.stat[data-accent] .stat__n { color: var(--tl-color-warning, #cb4b16); }
.stat__label { font-size: 12px; color: var(--tl-color-text-1); margin-top: 4px; }
.idOverlay { position: absolute; top: 12px; right: 12px; z-index: 100; }
.menuTrigger { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: var(--tl-radius-2); background: var(--tl-color-panel); border: 1px solid var(--tl-color-divider); font-size: 13px; }
.menuTrigger__avatar { width: 20px; height: 20px; color: var(--tl-color-text-3); }
.menuTrigger__name { font-weight: 500; color: var(--tl-color-text-0); }
.menuTrigger__dots { width: 16px; height: 16px; color: var(--tl-color-text-3); margin-left: 8px; }
.memberRow { display: inline-flex; align-items: center; gap: 10px; font-size: 13px; }
.memberRow__initial { width: 26px; height: 26px; border-radius: 50%; color: #fff; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; }
.memberRow__name { color: var(--tl-color-text-0); }
.flow { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 12px; font-family: ui-monospace, monospace; padding: 8px 0; }
.flow__node { border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 8px 14px; background: var(--tl-color-panel); text-align: center; }
.flow__node--root { border-color: var(--tl-color-primary); }
.flow__node--sdk { border-color: var(--tl-color-selected, #3b82f6); }
.flow__node--snap { border-color: var(--tl-color-warning, #cb4b16); }
.flow__sub { display: block; font-size: 10px; color: var(--tl-color-text-3); margin-top: 2px; }
.flow__arrow { color: var(--tl-color-text-3); text-align: center; padding: 2px 0; }
.flow__arrow--bug { color: var(--tl-color-warning, #cb4b16); font-weight: 600; }
.flow__split { display: flex; gap: 24px; align-items: flex-start; margin-top: 6px; flex-wrap: wrap; justify-content: center; }
.flow__branch { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.flow__leaf { border: 1px dashed var(--tl-color-divider); border-radius: 6px; padding: 6px 12px; color: var(--tl-color-text-1); }
.matrix { border-collapse: collapse; font-size: 12px; font-family: ui-monospace, monospace; width: 100%; max-width: 900px; }
.matrix th, .matrix td { text-align: left; padding: 6px 18px 6px 0; border-bottom: 1px solid var(--tl-color-divider); vertical-align: top; }
.matrix th { color: var(--tl-color-text-3); font-weight: 500; }
.matrix tr[data-bug] td:nth-child(3) { color: var(--tl-color-warning, #cb4b16); font-weight: 600; }
.callout { font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 18px; max-width: 900px; }
.callout strong { color: var(--tl-color-text-0); font-weight: 600; }
.callout--bug { border-color: var(--tl-color-warning, #cb4b16); }
`
