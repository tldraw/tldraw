/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import 'tldraw/tldraw.css'
import '../tla/styles/tla.css'
import { Specimen, SPECIMEN_CSS } from './dev-components-kit'
import { DevComponentsNav } from './dev-components-nav'

/**
 * Dev-only inventory of the dotcom app's transient feedback & overlay UI:
 * toasts, tooltips, popovers. These show the DELEGATION mode — the app owns no
 * implementation, it calls the SDK. Toasts especially: the app renders nothing,
 * it just calls addToast(); the SDK owns the toast UI entirely. The opposite
 * pole from TlaButton (own + diverge). Every toast call site is shown.
 *
 * Route: /dev/components/overlays.
 */

const Stat = ({ n, label }: { n: string; label: string }): ReactNode => (
	<div className="stat">
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
				<title>Feedback & overlays — dev</title>
			</Helmet>
			<style>{PAGE_CSS + SPECIMEN_CSS}</style>

			<div className="page">
				<DevComponentsNav />
				<header className="page__header">
					<h1 className="page__title">Feedback &amp; overlays</h1>
					<p className="page__lede">
						Toasts, tooltips, popovers — transient UI the app <strong>delegates</strong> to the SDK.
						A new mode: not "own and diverge" (buttons) but "call and render nothing." For toasts the
						app owns <em>no</em> component at all — it calls <code>addToast()</code> and the SDK draws
						it.
					</p>
				</header>

				<section className="section">
					<h2 className="section__title">Toasts — all {TOASTS.length} call sites</h2>
					<p className="section__note">
						Every <code>addToast(&#123; title, severity?, keepOpen? &#125;)</code> in the app. No toast
						component is rendered by dotcom; the SDK&rsquo;s toast manager owns the UI. Mocks below
						are coloured by severity.
					</p>
					<div className="stats" style={{ marginBottom: 20 }}>
						<Stat n="6" label="severity: error" />
						<Stat n="6" label="no severity (neutral)" />
						<Stat n="2" label="success" />
						<Stat n="1" label="info" />
						<Stat n="1" label="warning" />
					</div>
					<div className="grid">
						{TOASTS.map((t) => (
							<Specimen
								key={t.source}
								label={t.title}
								code={`addToast({ severity: '${t.sev}'${t.keepOpen ? ', keepOpen: true' : ''} })`}
								meta={t.keepOpen ? 'keepOpen — manual dismiss' : 'auto-dismiss'}
								source={t.source}
								mock
							>
								<div className="toastMock" data-sev={t.sev}>
									{t.title}
								</div>
							</Specimen>
						))}
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">Tooltips</h2>
					<p className="section__note">
						<code>TldrawUiTooltip</code> (SDK) used directly in 3 files, plus the{' '}
						<code>TlaMenuControlInfoTooltip</code> app wrapper. Mocked.
					</p>
					<div className="grid">
						{TOOLTIPS.map((t) => (
							<Specimen key={t.name + t.source} label={t.name} code={t.code} meta={t.meta} source={t.source} mock>
								<div className="tipMock">{t.sample}</div>
							</Specimen>
						))}
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">Popovers</h2>
					<p className="section__note">
						<code>TldrawUiPopover</code> (SDK: Root / Trigger / Content) — one consumer, the share
						menu. Mocked.
					</p>
					<div className="grid">
						<Specimen
							label="TldrawUiPopover"
							code={`<TldrawUiPopoverRoot><Trigger/><Content/>`}
							meta="Radix popover · ×1 consumer"
							source="TlaFileShareMenu.tsx"
							mock
						>
							<div className="popMock">
								<div className="popMock__trigger">Share ▾</div>
							</div>
						</Specimen>
					</div>
				</section>

			</div>
		</div>
	)
}

type Sev = 'error' | 'warning' | 'info' | 'success' | 'default'

const TOASTS: ReadonlyArray<{ title: string; sev: Sev; keepOpen?: boolean; source: string }> = [
	{ title: 'Shared document open error', sev: 'error', source: 'SneakyOnDropOverride:28' },
	{ title: 'Unsupported mermaid diagram', sev: 'warning', source: 'SneakyMermaidHandler:55' },
	{ title: 'Mutation error', sev: 'default', source: 'TldrawApp:391' },
	{ title: 'Max files reached', sev: 'default', keepOpen: true, source: 'TldrawApp:696' },
	{ title: 'Uploading .tldr files…', sev: 'info', source: 'TldrawApp:1111' },
	{ title: 'Unknown error', sev: 'error', keepOpen: true, source: 'TldrawApp:1149' },
	{ title: 'Adding .tldr files', sev: 'success', source: 'TldrawApp:1176' },
	{ title: 'Copied invite link', sev: 'default', source: 'TldrawApp:1280' },
	{ title: 'Error accepting invite', sev: 'error', source: 'TldrawApp:1298' },
	{ title: 'Error accepting invite', sev: 'error', source: 'TldrawApp:1313' },
	{ title: 'Copied link', sev: 'default', source: 'TlaFileMenu:147' },
	{ title: 'Workspace invite error', sev: 'error', keepOpen: true, source: 'WorkspaceInviteHandler:122' },
	{ title: 'Already a member', sev: 'default', source: 'WorkspaceInviteHandler:155' },
	{ title: 'Feedback submitted', sev: 'success', source: 'SubmitFeedbackDialog:107' },
	{ title: 'Debug mode', sev: 'default', keepOpen: true, source: 'SneakyDebugModeToast:26' },
	{ title: 'Import failed', sev: 'error', keepOpen: true, source: 'local.tsx:54' },
]

const TOOLTIPS: ReadonlyArray<{ name: string; code: string; meta: string; sample: string; source: string }> = [
	{ name: 'TldrawUiTooltip', code: '<TldrawUiTooltip content>', meta: 'SDK · sidebar file link', sample: 'Rename', source: 'TlaSidebarFileLink.tsx' },
	{ name: 'TldrawUiTooltip', code: '<TldrawUiTooltip content>', meta: 'SDK · menu control', sample: 'Info', source: 'tla-menu.tsx' },
	{ name: 'TldrawUiTooltip', code: '<TldrawUiTooltip content>', meta: 'SDK · workspace settings', sample: 'Copy', source: 'WorkspaceSettingsDialog.tsx' },
	{ name: 'TlaMenuControlInfoTooltip', code: '<TlaMenuControlInfoTooltip>', meta: 'app wrapper · ×4', sample: 'ⓘ', source: 'tla-menu.tsx' },
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
.page__lede strong, .page__footer strong { color: var(--tl-color-text-0); font-weight: 600; }
.page__lede code, .section__note code, .page__footer code { font-family: ui-monospace, monospace; font-size: 0.92em; background: var(--tl-color-low); padding: 1px 4px; border-radius: 3px; }
.section { margin-bottom: 48px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 760px; }
.stats { display: flex; gap: 12px; flex-wrap: wrap; }
.stat { border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 14px 18px; min-width: 130px; background: var(--tl-color-panel); }
.stat__n { font-size: 24px; font-weight: 700; font-family: ui-monospace, monospace; }
.stat__label { font-size: 11px; color: var(--tl-color-text-1); margin-top: 4px; }
.toastMock { padding: 9px 11px; border-radius: 6px; font-size: 12px; background: var(--tl-color-panel); border: 1px solid var(--tl-color-divider); border-left: 3px solid var(--tl-color-text-3); width: 100%; box-sizing: border-box; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.toastMock[data-sev=error] { border-left-color: var(--tl-color-danger, #dc322f); }
.toastMock[data-sev=warning] { border-left-color: var(--tl-color-warning, #cb4b16); }
.toastMock[data-sev=info] { border-left-color: var(--tl-color-primary); }
.toastMock[data-sev=success] { border-left-color: var(--tl-color-success, #2a9d3c); }
.tipMock { font-size: 12px; color: var(--tl-color-panel-contrast, #fff); background: var(--tl-color-tooltip, #1d1d1d); padding: 5px 9px; border-radius: 5px; }
.popMock { display: inline-block; }
.popMock__trigger { font-size: 13px; padding: 6px 12px; border: 1px solid var(--tl-color-divider); border-radius: var(--tl-radius-2); background: var(--tl-color-panel); }
.page__footer { max-width: 760px; font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); border-top: 1px solid var(--tl-color-divider); padding-top: 20px; }
`
