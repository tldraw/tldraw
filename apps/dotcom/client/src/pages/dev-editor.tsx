/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import 'tldraw/tldraw.css'
import '../tla/styles/tla.css'
import { DevComponentsNav } from './dev-components-nav'

/**
 * Dev-only CONSUMPTION MAP for the dotcom editor — companion to the sidebar map,
 * but the inverse shape. The sidebar builds its own chrome; the editor is the SDK
 * <Tldraw> with only a few slots overridden (MenuPanel / TopPanel / SharePanel)
 * plus behavioral injections. Mostly delegated, small bespoke surface.
 *
 * Route: /dev/components/editor.
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
				<title>Editor consumption map — dev</title>
			</Helmet>
			<style>{PAGE_CSS}</style>

			<div className="page">
				<DevComponentsNav />
				<header className="page__header">
					<h1 className="page__title">Editor — consumption map</h1>
					<p className="page__lede">
						The inverse of the <a href="/dev/components/sidebar">sidebar</a>. The editor isn&rsquo;t
						built by dotcom — it&rsquo;s the SDK <code>&lt;Tldraw&gt;</code> with a handful of slots
						swapped via its <code>components=&#123;&#125;</code> prop. Canvas, toolbar, style panel,
						context menu — all SDK defaults, untouched. dotcom overrides three slots and injects some
						behavior.
					</p>
				</header>

				<section className="section">
					<div className="stats">
						<Stat n="3" label="SDK slots overridden" />
						<Stat n="5" label="editor variants (<Tldraw> wrappers)" />
						<Stat n="3" label="bespoke chrome classes" accent />
						<Stat n="8" label="Sneaky* behavior injections" />
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">The override model</h2>
					<p className="section__note">
						What dotcom swaps in via <code>&lt;Tldraw components=&#123;…&#125;&gt;</code>. Everything
						not listed is the SDK default.
					</p>
					<table className="cmap">
						<thead>
							<tr>
								<th>SDK slot</th>
								<th>dotcom override</th>
								<th>what it is</th>
							</tr>
						</thead>
						<tbody>
							{SLOTS.map((s) => (
								<tr key={s.slot}>
									<td className="cmap__name">{s.slot}</td>
									<td>
										<span className="chip chip--ds">{s.override}</span>
									</td>
									<td>{s.note}</td>
								</tr>
							))}
							<tr data-default>
								<td className="cmap__name">everything else</td>
								<td>
									<span className="chip chip--ok">SDK default ✓</span>
								</td>
								<td>canvas, Toolbar, StylePanel, ContextMenu, HelpMenu… — untouched</td>
							</tr>
						</tbody>
					</table>
				</section>

				<section className="section">
					<h2 className="section__title">Override-panel consumption</h2>
					<p className="section__note">
						The two slots that hold real chrome. Green = design-system primitive; orange = bespoke
						class / raw element. This is the editor&rsquo;s entire bespoke surface — three classes.
					</p>
					<table className="cmap">
						<thead>
							<tr>
								<th>panel</th>
								<th>design-system primitives</th>
								<th>bespoke</th>
							</tr>
						</thead>
						<tbody>
							{PANELS.map((p) => (
								<tr key={p.name}>
									<td className="cmap__name">{p.name}</td>
									<td>
										{p.ds.map((d) => (
											<span key={d} className="chip chip--ds">
												{d}
											</span>
										))}
									</td>
									<td>
										{p.bespoke.map((b) => (
											<span key={b} className="chip chip--bespoke">
												{b}
											</span>
										))}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>

				<section className="section">
					<h2 className="section__title">Editor variants</h2>
					<p className="section__note">
						Five <code>&lt;Tldraw&gt;</code> wrappers, each overriding a slightly different slot set.
					</p>
					<table className="cmap">
						<thead>
							<tr>
								<th>wrapper</th>
								<th>slots overridden</th>
								<th>for</th>
							</tr>
						</thead>
						<tbody>
							{VARIANTS.map((v) => (
								<tr key={v.name}>
									<td className="cmap__name">{v.name}</td>
									<td>{v.slots}</td>
									<td>{v.note}</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>

				<section className="section">
					<h2 className="section__title">Behavioral injections (Sneaky*)</h2>
					<p className="section__note">
						Side-effect components mounted inside the editor — mostly no UI, just behavior (a couple
						open SDK dialogs). The &ldquo;sneaky&rdquo; prefix is the codebase&rsquo;s name for
						editor-injected behavior.
					</p>
					<table className="cmap">
						<thead>
							<tr>
								<th>component</th>
								<th>does</th>
								<th>UI?</th>
							</tr>
						</thead>
						<tbody>
							{SNEAKY.map((s) => (
								<tr key={s.name}>
									<td className="cmap__name">{s.name}</td>
									<td>{s.does}</td>
									<td>{s.ui ? <span className="chip chip--ds">{s.ui}</span> : <span className="chip chip--none">none</span>}</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>

				<section className="section">
					<h2 className="section__title">vs the sidebar</h2>
					<div className="callout">
						The two maps are opposite poles of the ownership axis. The{' '}
						<a href="/dev/components/sidebar">sidebar</a> <strong>builds its own chrome</strong> — 17
						components, 9 bespoke button classes. The editor <strong>borrows the SDK&rsquo;s</strong>{' '}
						— it overrides 3 slots and adds 3 bespoke classes, total. Same app, two strategies: where
						the SDK offers a slot (the editor), dotcom delegates and diverges little; where it
						doesn&rsquo;t (the sidebar is pure dotcom), dotcom builds and diverges a lot. The
						editor&rsquo;s small bespoke surface is the strongest evidence that{' '}
						<strong>good SDK extension points prevent drift</strong>.
					</div>
				</section>
			</div>
		</div>
	)
}

const SLOTS: ReadonlyArray<{ slot: string; override: string; note: string }> = [
	{ slot: 'MenuPanel', override: 'TlaEditorMenuPanel → TlaEditorTopLeftPanel', note: 'file name, main menu, logo' },
	{ slot: 'TopPanel', override: 'TlaEditorTopPanel', note: 'top-centre strip' },
	{ slot: 'SharePanel', override: 'TlaEditorSharePanel (+ Legacy / Published) → TlaEditorTopRightPanel', note: 'share / sign-in CTA' },
]

const PANELS: ReadonlyArray<{ name: string; ds: string[]; bespoke: string[] }> = [
	{
		name: 'TlaEditorTopLeftPanel (466)',
		ds: ['TlaIcon', 'TlaLogo', 'TldrawUiButton', 'TldrawUiInput', 'TldrawUiDropdownMenu', 'ExternalLink'],
		bespoke: ['<button>', '.topLeftMainMenuTrigger', '.topLeftPanelButton'],
	},
	{
		name: 'TlaEditorTopRightPanel (183)',
		ds: ['TlaCtaButton', 'TlaIcon', 'TldrawUiButton'],
		bespoke: ['.topRightAnonShareButton'],
	},
]

const VARIANTS: ReadonlyArray<{ name: string; slots: string; note: string }> = [
	{ name: 'TlaEditor', slots: 'MenuPanel · TopPanel · SharePanel', note: 'the main editor' },
	{ name: 'TlaLegacyFileEditor', slots: 'MenuPanel · TopPanel · SharePanel (legacy)', note: 'legacy files' },
	{ name: 'TlaPublishEditor', slots: 'MenuPanel (anon) · SharePanel (published)', note: 'published read-only view' },
	{ name: 'TlaHistorySnapshotEditor', slots: '<Tldraw> + TlaCtaButton restore bar', note: 'file history snapshot' },
	{ name: 'TlaLegacySnapshotEditor', slots: '<Tldraw> (defaults)', note: 'legacy snapshot' },
]

const SNEAKY: ReadonlyArray<{ name: string; does: string; ui?: string }> = [
	{ name: 'SneakyDarkModeSync', does: 'syncs app theme → editor color scheme' },
	{ name: 'SneakyFileDropHandler', does: 'handles .tldr / image file drops' },
	{ name: 'SneakyToolSwitcher', does: 'tool-switching behavior' },
	{ name: 'SneakySetDocumentTitle', does: 'sets document.title from file name' },
	{ name: 'SneakyLegacytSetDocumentTitle', does: 'document.title for legacy files' },
	{ name: 'SneakyDebugModeToast', does: 'shows a debug-mode toast', ui: 'addToast' },
	{ name: 'SneakyLargeFileHandler', does: 'warns on too-large files', ui: 'TldrawUiDialog' },
	{ name: 'SneakyLegacyModal', does: 'legacy-changes acknowledgement', ui: 'TldrawUiDialog' },
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
.page__lede a, .callout a { color: var(--tl-color-primary); }
.page__lede code, .section__note code, .callout code { font-family: ui-monospace, monospace; font-size: 0.92em; background: var(--tl-color-low); padding: 1px 4px; border-radius: 3px; }
.section { margin-bottom: 40px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 780px; }
.stats { display: flex; gap: 16px; flex-wrap: wrap; }
.stat { border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 20px; min-width: 150px; background: var(--tl-color-panel); }
.stat[data-accent] { border-color: var(--tl-color-warning, #cb4b16); }
.stat__n { font-size: 26px; font-weight: 700; font-family: ui-monospace, monospace; }
.stat[data-accent] .stat__n { color: var(--tl-color-warning, #cb4b16); }
.stat__label { font-size: 12px; color: var(--tl-color-text-1); margin-top: 4px; }
.cmap { border-collapse: collapse; width: 100%; max-width: 1000px; font-size: 12px; }
.cmap th, .cmap td { text-align: left; padding: 8px 14px 8px 0; border-bottom: 1px solid var(--tl-color-divider); vertical-align: top; }
.cmap th { color: var(--tl-color-text-3); font-weight: 500; font-family: ui-monospace, monospace; }
.cmap__name { font-family: ui-monospace, monospace; font-weight: 600; white-space: nowrap; }
.cmap tr[data-default] .cmap__name { color: var(--tl-color-success, #2a9d3c); }
.chip { display: inline-block; font-family: ui-monospace, monospace; font-size: 11px; padding: 2px 7px; border-radius: 4px; margin: 2px 4px 2px 0; }
.chip--ds { background: color-mix(in srgb, var(--tl-color-success, #2a9d3c) 14%, transparent); color: var(--tl-color-success, #2a9d3c); }
.chip--bespoke { background: color-mix(in srgb, var(--tl-color-warning, #cb4b16) 14%, transparent); color: var(--tl-color-warning, #cb4b16); }
.chip--ok { color: var(--tl-color-success, #2a9d3c); }
.chip--none { color: var(--tl-color-text-3); }
.callout { font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 18px; max-width: 860px; }
.callout strong { color: var(--tl-color-text-0); font-weight: 600; }
`
