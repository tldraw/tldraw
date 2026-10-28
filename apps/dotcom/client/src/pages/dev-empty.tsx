/* eslint-disable tldraw/jsx-no-literals */
import { CommentsList, EmptyState } from '@tldraw/commenting'
import { Dialog as RadixDialog } from 'radix-ui'
import { Helmet } from 'react-helmet-async'
import 'tldraw/tldraw.css'
import { BoardHistoryLog } from '../components/BoardHistoryLog/BoardHistoryLog'
import { TlaInviteExpiredDialog } from '../tla/components/dialogs/TlaInviteExpiredDialog'
import { Specimen, SPECIMEN_CSS } from './dev-components-kit'
import '../tla/styles/tla.css'
import { DevComponentsNav } from './dev-components-nav'
import { IsolationProviders } from './dev-editor-harness'
import sidebarStyles from '../tla/components/TlaSidebar/sidebar.module.css'

/**
 * Dev-only inventory of the dotcom app's empty states: what renders when a list,
 * search, or resource has nothing to show. The third member of the non-happy-path
 * triad alongside /dev/components/states (error & loading).
 *
 * Route: /dev/components/empty.
 */

const preventDefault = (e: Event) => e.preventDefault()
const noop = () => {}

export function Component() {
	return (
		<div
			className="tla tl-container tla-theme-container tla-theme__light tl-theme__light"
			style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'auto' }}
		>
			<Helmet>
				<title>Empty states — dev</title>
			</Helmet>
			<style>{PAGE_CSS + SPECIMEN_CSS}</style>

			<IsolationProviders>
				<div className="page">
					<DevComponentsNav />
					<header className="page__header">
						<h1 className="page__title">Empty states</h1>
						<p className="page__lede">
							What renders when there&rsquo;s nothing to show. {TREATMENTS.length} treatments across
							dotcom and <code>@tldraw/commenting</code>: one shared list shell, one exported
							component nothing uses, two inline one-offs, and an empty state built as a dialog.
						</p>
					</header>

					<section className="section">
						<h2 className="section__title">Treatments side by side</h2>
						<table className="matrix">
							<thead>
								<tr>
									<th>treatment</th>
									<th>type</th>
									<th>colour</th>
									<th>padding</th>
									<th>icon</th>
									<th>copy</th>
								</tr>
							</thead>
							<tbody>
								{TREATMENTS.map((t) => (
									<tr key={t.label}>
										<td>{t.label}</td>
										<td>{t.type}</td>
										<td>{t.colour}</td>
										<td>{t.padding}</td>
										<td>{t.icon}</td>
										<td>{t.copy}</td>
									</tr>
								))}
							</tbody>
						</table>
					</section>

					<section className="section">
						<h2 className="section__title">The comments list shell</h2>
						<p className="section__note">
							<code>CommentsList</code> renders its <code>empty</code> prop in place of the list
							when <code>items</code> is empty. Three empty states share this one shell; only the
							copy differs. The notifications panel is dotcom code reusing the commenting
							package&rsquo;s shell, so its empty state is styled by <code>comments.css</code>.
						</p>
						<div className="grid">
							<Specimen
								label="page has no threads"
								code={`<CommentsList items={[]} empty="No comments on this page yet." />`}
								meta=".tlui-cmt-list__empty · 12px · text-3"
								source="comments-sidebar.tsx:23 · comments-list.tsx:93"
							>
								<div className="listStage">
									<CommentsList
										items={[]}
										header="Comments"
										empty="No comments on this page yet."
									/>
								</div>
							</Specimen>
							<Specimen
								label="filters hide every thread"
								code={`<CommentsList items={[]} empty="No comments match your filters." />`}
								meta="chosen when the page has threads but the filters hide them all"
								source="comments-sidebar.tsx:24 · comments-sidebar.tsx:176"
							>
								<div className="listStage">
									<CommentsList
										items={[]}
										header="Comments"
										empty="No comments match your filters."
									/>
								</div>
							</Specimen>
							<Specimen
								label="notifications, all read"
								code={`<CommentsList items={[]} empty="You’re all caught up." />`}
								meta="dotcom panel, commenting package shell"
								source="TlaSidebarNotificationsPanel.tsx:51 · TlaSidebarNotificationsPanel.tsx:300"
							>
								<div className="listStage">
									<CommentsList items={[]} header="Notifications" empty="You’re all caught up." />
								</div>
							</Specimen>
						</div>
					</section>

					<section className="section">
						<h2 className="section__title">EmptyState — exported, no consumers</h2>
						<p className="section__note">
							<code>@tldraw/commenting</code> exports <code>EmptyState</code> as public API, and the
							SDK docs list it as &ldquo;the list&rsquo;s empty state&rdquo;. Nothing renders it:
							the list uses its own <code>.tlui-cmt-list__empty</code> div instead. Its doc comment
							describes a different case again (&ldquo;a thread has no comments yet&rdquo;).
						</p>
						<div className="grid">
							<Specimen
								label="EmptyState"
								code={`<EmptyState message="No comments on this page yet." />`}
								meta=".tlui-cmt-empty · fixed 240px wide · 💬 at 28px"
								source="commenting/src/ui/empty-state.tsx:7 · comments.css:490 · commenting.mdx:642"
							>
								<EmptyState message="No comments on this page yet." />
							</Specimen>
						</div>
					</section>

					<section className="section">
						<h2 className="section__title">Inline one-offs</h2>
						<p className="section__note">
							Written in place inside the component that owns the list, with no shared primitive.
						</p>
						<div className="grid">
							<Specimen
								label="sidebar search, no matches"
								code={`<div className={styles.sidebarSearchEmpty}>`}
								meta="text-3 · padding space-3 · inherits font size"
								source="sidebar.module.css:779 · inline in TlaSidebarRecentFiles.tsx:110"
							>
								<div className="sidebarStage">
									<div className={sidebarStyles.sidebarSearchEmpty}>No files found</div>
								</div>
							</Specimen>
							<Specimen
								label="BoardHistoryLog, no history"
								code={`<BoardHistoryLog data={[]} />`}
								meta="bare <p>, no class · string literal, not translated"
								source="BoardHistoryLog.tsx:42"
							>
								<BoardHistoryLog data={[]} />
							</Specimen>
						</div>
					</section>

					<section className="section">
						<h2 className="section__title">Empty as a dialog</h2>
						<p className="section__note">
							An invite link that no longer resolves (404) opens a dialog rather than an inline
							state. It reuses <code>sadFaceIcon</code> from <code>ErrorPage</code>, so the expired
							invite borrows the error screen&rsquo;s face.
						</p>
						<div className="grid grid--dialogs">
							<Specimen
								label="TlaInviteExpiredDialog"
								code={`<TlaInviteExpiredDialog onClose={…} />`}
								meta="TldrawUiDialog parts + TlaButton cta · sadFaceIcon from ErrorPage"
								source="TlaInviteExpiredDialog.tsx:12 · opened by WorkspaceInviteHandler.tsx:139"
							>
								<div className="dialogCardStage">
									<RadixDialog.Root open modal={false}>
										<RadixDialog.Content
											className="tlui-dialog__content"
											onInteractOutside={preventDefault}
											onEscapeKeyDown={preventDefault}
											onOpenAutoFocus={preventDefault}
										>
											<TlaInviteExpiredDialog onClose={noop} />
										</RadixDialog.Content>
									</RadixDialog.Root>
								</div>
							</Specimen>
						</div>
					</section>

					<section className="section">
						<h2 className="section__title">Designed away</h2>
						<p className="section__note">
							Places that could be empty but never render an empty state, plus the admin
							panel&rsquo;s internal-only empties.
						</p>
						<table className="matrix">
							<thead>
								<tr>
									<th>case</th>
									<th>what happens instead</th>
									<th>source</th>
								</tr>
							</thead>
							<tbody>
								{DESIGNED_AWAY.map((d) => (
									<tr key={d.source}>
										<td>{d.label}</td>
										<td>{d.instead}</td>
										<td>{d.source}</td>
									</tr>
								))}
							</tbody>
						</table>
					</section>
				</div>
			</IsolationProviders>
		</div>
	)
}

const TREATMENTS: ReadonlyArray<{
	label: string
	type: string
	colour: string
	padding: string
	icon: string
	copy: string
}> = [
	{
		label: '.tlui-cmt-list__empty',
		type: '12px',
		colour: 'text-3',
		padding: '20px 14px',
		icon: '—',
		copy: 'empty prop · SDK useTranslation',
	},
	{
		label: 'EmptyState (.tlui-cmt-empty)',
		type: '12px / 1.4',
		colour: 'text-3',
		padding: '24px · width 240px',
		icon: '💬 emoji',
		copy: 'message prop',
	},
	{
		label: '.sidebarSearchEmpty',
		type: 'inherited',
		colour: 'text-3',
		padding: 'space-3',
		icon: '—',
		copy: 'SDK <F>',
	},
	{
		label: 'BoardHistoryLog',
		type: 'browser default <p>',
		colour: 'inherited',
		padding: 'browser default',
		icon: '—',
		copy: 'string literal',
	},
	{
		label: 'TlaInviteExpiredDialog',
		type: '16px title · 12px body',
		colour: 'dialog defaults',
		padding: 'dialog body',
		icon: 'sadFaceIcon SVG',
		copy: 'SDK <F>',
	},
]

const DESIGNED_AWAY: ReadonlyArray<{ label: string; instead: string; source: string }> = [
	{
		label: 'workspace with no files',
		instead: 'selecting it creates a blank file and opens it',
		source: 'TlaSidebarWorkspaceSwitcher.tsx:221',
	},
	{
		label: 'deleting the last file in a workspace',
		instead: 'creates a fresh blank file, same as opening an empty workspace',
		source: 'TlaDeleteFileDialog.tsx:46',
	},
	{
		label: 'admin: no pending effects',
		instead: 'bare <p>No pending effects</p>',
		source: 'pages/admin/EffectsSection.tsx:96',
	},
	{
		label: 'admin: no history snapshots',
		instead: 'inline string in the files table',
		source: 'pages/admin/FilesSection.tsx:259',
	},
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
.page__lede code, .section__note code { font-family: ui-monospace, monospace; font-size: 0.92em; background: var(--tl-color-low); padding: 1px 4px; border-radius: 3px; }
.section { margin-bottom: 48px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 760px; }
.matrix { border-collapse: collapse; font-size: 12px; font-family: ui-monospace, monospace; width: 100%; max-width: 920px; }
.matrix th, .matrix td { text-align: left; padding: 6px 18px 6px 0; border-bottom: 1px solid var(--tl-color-divider); vertical-align: top; }
.matrix th { color: var(--tl-color-text-3); font-weight: 500; }
.listStage { width: 100%; max-width: 260px; background: var(--tl-color-panel); border-radius: 6px; }
.sidebarStage { width: 100%; max-width: 260px; background: var(--tl-color-panel); border-radius: 6px; }
.grid.grid--dialogs { grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); }
.dialogCardStage { position: relative; transform: translateZ(0); width: 100%; min-height: 210px; display: flex; align-items: center; justify-content: center; padding: 16px; border-radius: 8px; background: var(--tl-color-low); overflow: hidden; }
.dialogCardStage .tlui-dialog__content { position: static; width: 100%; min-width: 0; max-width: 340px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
`
