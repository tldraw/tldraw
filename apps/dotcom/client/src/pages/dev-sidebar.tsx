/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import 'tldraw/tldraw.css'
import '../tla/styles/tla.css'
import { DevComponentsNav } from './dev-components-nav'

/**
 * Dev-only CONSUMPTION MAP for the dotcom file-navigation sidebar — a different
 * kind of page from the rest of the gallery. Not "what is this component?" but
 * "what does this feature consume?": per sidebar component, which design-system
 * primitives it uses vs. where it reaches for a bespoke class. The sidebar is
 * the densest concentration of the buttons-page (#9193) bespoke-button debt.
 *
 * Route: /dev/components/sidebar.
 */

const Stat = ({ n, label, accent }: { n: string; label: string; accent?: boolean }): ReactNode => (
	<div className="stat" data-accent={accent || undefined}>
		<div className="stat__n">{n}</div>
		<div className="stat__label">{label}</div>
	</div>
)

export function Component() {
	return (
		<div
			className="tla tl-container tla-theme-container tla-theme__light tl-theme__light"
			style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'auto' }}
		>
			<Helmet>
				<title>Sidebar consumption map — dev</title>
			</Helmet>
			<style>{PAGE_CSS}</style>

			<div className="page">
				<DevComponentsNav />
				<header className="page__header">
					<h1 className="page__title">Sidebar — consumption map</h1>
					<p className="page__lede">
						A different lens: the file-navigation sidebar isn&rsquo;t a component to inventory,
						it&rsquo;s a feature that <em>consumes</em> the design system. Per component below: the DS
						primitives it uses (green) and where it rolls a bespoke class (orange). The pattern is
						stark — icons are fully adopted, but almost every clickable element is bespoke.
					</p>
				</header>

				<section className="section">
					<div className="stats">
						<Stat n="17" label="sidebar components" />
						<Stat n="5" label="DS-only (no bespoke)" />
						<Stat n="9" label="distinct bespoke button/trigger classes" accent />
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">Per-component consumption</h2>
					<p className="section__note">
						Green = design-system primitive used as-is. Orange = bespoke class / raw element.
					</p>
					<table className="cmap">
						<thead>
							<tr>
								<th>component</th>
								<th>design-system primitives</th>
								<th>bespoke</th>
							</tr>
						</thead>
						<tbody>
							{ROWS.map((r) => (
								<tr key={r.name} data-clean={r.bespoke.length === 0 || undefined}>
									<td className="cmap__name">{r.name}</td>
									<td>
										{r.ds.length ? (
											r.ds.map((d) => (
												<span key={d} className="chip chip--ds">
													{d}
												</span>
											))
										) : (
											<span className="chip chip--none">—</span>
										)}
									</td>
									<td>
										{r.bespoke.length ? (
											r.bespoke.map((b) => (
												<span key={b} className="chip chip--bespoke">
													{b}
												</span>
											))
										) : (
											<span className="chip chip--ok">none ✓</span>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>

				<section className="section">
					<h2 className="section__title">The bespoke button vocabulary</h2>
					<p className="section__note">
						The sidebar has invented its own set of clickable-element classes instead of using
						TldrawUiButton / TlaButton. This is where the #9193 debt concentrates — nine of them:
					</p>
					<div className="vocab">
						{VOCAB.map((v) => (
							<span key={v} className="chip chip--bespoke">
								.{v}
							</span>
						))}
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">What it tells a redesign</h2>
					<div className="callout">
						The sidebar consumes <strong>icons cleanly</strong> (TlaIcon everywhere) and{' '}
						<strong>inputs cleanly</strong> (TldrawUiInput, wrapped once as TlaSidebarInlineInput) —
						but its <strong>interactive elements are almost all bespoke</strong>. Where it does pull
						in TldrawUiButton, it&rsquo;s for secondary icon-buttons inside menus; the primary rows,
						triggers, and links each have their own <code>.sidebar*</code> class. So a redesign that
						adds a complete TlaButton (the #9194 / orthogonal-variant work) would have its biggest
						single payoff <em>here</em> — nine bespoke classes collapsing into button variants. The
                        sidebar is the test case for whether the button rework actually lands.
					</div>
				</section>

			</div>
		</div>
	)
}

const ROWS: ReadonlyArray<{ name: string; ds: string[]; bespoke: string[] }> = [
	{ name: 'TlaSidebar (parent)', ds: [], bespoke: ['<button> overlay (all:unset, keep-raw)'] },
	{ name: 'TlaSidebarWorkspaceLink', ds: ['TlaLogo'], bespoke: ['.sidebarWorkspaceButton'] },
	{ name: 'TlaSidebarWorkspaceSwitcher', ds: ['TlaIcon'], bespoke: ['<button> .sidebarWorkspaceSwitcherTrigger'] },
	{ name: 'TlaSidebarWorkspaceActions', ds: ['TlaIcon'], bespoke: ['<button> .sidebarActionButton'] },
	{ name: 'TlaSidebarCreateFileButton', ds: ['TlaIcon', 'TldrawUiButton'], bespoke: ['.sidebarCreateFileButton'] },
	{ name: 'TlaSidebarRecentFiles', ds: [], bespoke: [] },
	{ name: 'TlaSidebarFileSection', ds: ['TlaIcon', 'TldrawUiButton'], bespoke: ['.sidebarCreateFileButton'] },
	{ name: 'TlaSidebarFileLink', ds: ['TlaIcon', 'TldrawUiTooltip'], bespoke: ['.sidebarFileListItemButton', '.sidebarFileListItemGuestBadgeTrigger'] },
	{ name: 'TlaSidebarFileLinkMenu', ds: ['TlaIcon', 'TldrawUiButton'], bespoke: ['.sidebarFileListItemMenuTrigger'] },
	{ name: 'TlaSidebarSearch', ds: ['TlaIcon', 'TldrawUiButton', 'TldrawUiInput'], bespoke: ['<button> .sidebarActionButton'] },
	{ name: 'TlaSidebarInlineInput', ds: ['TldrawUiInput'], bespoke: [] },
	{ name: 'TlaSidebarRenameInline', ds: ['TlaSidebarInlineInput'], bespoke: [] },
	{ name: 'TlaSidebarDotDevLink', ds: ['ExternalLink'], bespoke: ['.sidebarLinkButton'] },
	{ name: 'TlaSidebarFeedbackButton', ds: ['TlaIcon'], bespoke: ['<button> .sidebarLinkButton'] },
	{ name: 'TlaSidebarUserSettingsMenu', ds: ['TlaIcon', 'TldrawUiButton', 'TldrawUiDropdownMenu'], bespoke: ['.sidebarUserSettingsTrigger'] },
	{ name: 'TlaSidebarToggle', ds: ['TlaIcon', 'TldrawUiButton'], bespoke: [] },
	{ name: 'TlaSidebarToggleMobile', ds: ['TlaIcon', 'TldrawUiButton'], bespoke: [] },
]

const VOCAB = [
	'sidebarWorkspaceButton',
	'sidebarWorkspaceSwitcherTrigger',
	'sidebarActionButton',
	'sidebarCreateFileButton',
	'sidebarFileListItemButton',
	'sidebarFileListItemMenuTrigger',
	'sidebarFileListItemGuestBadgeTrigger',
	'sidebarLinkButton',
	'sidebarUserSettingsTrigger',
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
.page__header { max-width: 800px; margin-bottom: 32px; }
.page__title { font-size: 28px; font-weight: 700; margin: 0 0 12px; }
.page__lede { font-size: 14px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0; }
.page__lede em, .callout em { font-style: italic; }
.section { margin-bottom: 40px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 760px; }
.callout code, .page__footer code { font-family: ui-monospace, monospace; font-size: 0.92em; background: var(--tl-color-low); padding: 1px 4px; border-radius: 3px; }
.stats { display: flex; gap: 16px; flex-wrap: wrap; }
.stat { border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 20px; min-width: 160px; background: var(--tl-color-panel); }
.stat[data-accent] { border-color: var(--tl-color-warning, #cb4b16); }
.stat__n { font-size: 26px; font-weight: 700; font-family: ui-monospace, monospace; }
.stat[data-accent] .stat__n { color: var(--tl-color-warning, #cb4b16); }
.stat__label { font-size: 12px; color: var(--tl-color-text-1); margin-top: 4px; }
.cmap { border-collapse: collapse; width: 100%; max-width: 1000px; font-size: 12px; }
.cmap th, .cmap td { text-align: left; padding: 8px 14px 8px 0; border-bottom: 1px solid var(--tl-color-divider); vertical-align: top; }
.cmap th { color: var(--tl-color-text-3); font-weight: 500; font-family: ui-monospace, monospace; }
.cmap__name { font-family: ui-monospace, monospace; font-weight: 600; white-space: nowrap; }
.cmap tr[data-clean] .cmap__name { color: var(--tl-color-success, #2a9d3c); }
.chip { display: inline-block; font-family: ui-monospace, monospace; font-size: 11px; padding: 2px 7px; border-radius: 4px; margin: 2px 4px 2px 0; }
.chip--ds { background: color-mix(in srgb, var(--tl-color-success, #2a9d3c) 14%, transparent); color: var(--tl-color-success, #2a9d3c); }
.chip--bespoke { background: color-mix(in srgb, var(--tl-color-warning, #cb4b16) 14%, transparent); color: var(--tl-color-warning, #cb4b16); }
.chip--ok { color: var(--tl-color-success, #2a9d3c); }
.chip--none { color: var(--tl-color-text-3); }
.vocab { display: flex; flex-wrap: wrap; gap: 2px; max-width: 900px; }
.callout { font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 18px; max-width: 860px; }
.callout strong { color: var(--tl-color-text-0); font-weight: 600; }
.page__footer { max-width: 800px; font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); border-top: 1px solid var(--tl-color-divider); padding-top: 20px; }
`
