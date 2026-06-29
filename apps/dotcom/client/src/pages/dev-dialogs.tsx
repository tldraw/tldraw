/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import 'tldraw/tldraw.css'
import '../tla/styles/tla.css'
import { DevComponentsNav } from './dev-components-nav'
import { Specimen, SPECIMEN_CSS } from './dev-components-kit'

/**
 * Dev-only inventory of the dotcom app's dialogs. The healthiest family: nearly
 * every dialog uses the SDK TldrawUiDialog primitive, so the divergence is not
 * structural but CONFIGURATIONAL — the body maxWidth is hand-set per dialog with
 * no shared size convention — plus one justified bespoke exception.
 *
 * Serves tldraw/tldraw#9199 (misc design-system cleanups). Route:
 * /dev/components/dialogs.
 */

export function Component() {
	return (
		<div
			className="tla tl-container tla-theme-container tla-theme__light tl-theme__light"
			style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'auto' }}
		>
			<Helmet>
				<title>Dialog inventory — dev</title>
			</Helmet>
			<style>{PAGE_CSS + SPECIMEN_CSS}</style>

			<div className="page">
				<DevComponentsNav />
				<header className="page__header">
					<h1 className="page__title">Dialog inventory</h1>
					<p className="page__lede">
						Every dialog in the dotcom app. Unlike buttons / inputs / type, this family is well
						consolidated: almost all use the SDK <code>TldrawUiDialog</code> primitive. The
						divergence is configurational — inconsistent body widths — plus one justified bespoke
						modal.
					</p>
				</header>

				<section className="section">
					<h2 className="section__title">Adoption</h2>
					<p className="section__note">
						12 of 13 dialogs compose the SDK <code>TldrawUiDialog*</code> parts. One is bespoke (and
						documented).
					</p>
					<div className="stats">
						<Stat n="12" label="use TldrawUiDialog primitive" good />
						<Stat n="1" label="bespoke modal (justified)" />
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">The SDK primitive — anatomy</h2>
					<p className="section__note">
						<code>TldrawUiDialog</code> is a Radix-based compound:{' '}
						<code>Header › Title + CloseButton</code>, <code>Body</code>, <code>Footer</code>. The
						mock below uses the real <code>.tlui-dialog__*</code> classes.
					</p>
					<div className="dialogMock">
						<div className="tlui-dialog__header dialogMock__header">
							<span className="tlui-dialog__header__title">Dialog title</span>
							<span className="dialogMock__x">✕</span>
						</div>
						<div className="tlui-dialog__body dialogMock__body">
							Body content — the only part dialogs size differently.
						</div>
						<div className="tlui-dialog__footer dialogMock__footer">Footer · actions</div>
					</div>
					<div className="section__api" style={{ marginTop: 20 }}>
						<div>
							<span className="k">parts</span>
							TldrawUiDialogHeader, TldrawUiDialogTitle, TldrawUiDialogCloseButton,
							TldrawUiDialogBody, TldrawUiDialogFooter
						</div>
						<div>
							<span className="k">opened</span>
							via the editor's dialogs manager (addDialog / useDialogs) — portalled by Radix
						</div>
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">Props in use</h2>
					<p className="section__note">
						The parts have a tiny API; the only behavioural prop lives in the open call.
					</p>
					<div className="section__api">
						<div>
							<span className="k">parts</span>
							className + children + style (Body / Title) — that's the whole surface. Footer
							consistently uses className="tlui-dialog__footer__actions".
						</div>
						<div>
							<span className="k">width</span>
							body width set two ways — style={'{{'} maxWidth {'}}'} (6) vs className (8); see below
						</div>
					</div>
					<div className="section__api" style={{ marginTop: 12 }}>
						<div>
							<span className="k">open</span>
							addDialog({'{'} id, component, onClose?, preventBackgroundClose? {'}'}) — id +
							component always; onClose common
						</div>
						<div>
							<span className="k">prevent</span>
							preventBackgroundClose: true — only 2 dialogs (WorkspaceInviteHandler sign-in +
							invite-join, SneakyLegacyModal). Opts out of backdrop dismiss for required-state
							dialogs.
						</div>
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">The dialogs</h2>
					<p className="section__note">
						Every dialog component, its mechanism, and the width it sets on the body.
					</p>
					<div className="grid">
						{DIALOGS.map((r) => (
							<Specimen key={r[0]} label={r[0]} code={r[1]} meta={`maxWidth ${r[2]} · ${r[3]}`} mock>
								<div className="miniDialog" data-bespoke={r[1] === 'bespoke' || undefined}>
									<div className="miniDialog__h" />
									<div className="miniDialog__b" />
								</div>
							</Specimen>
						))}
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">Width divergence (the real cleanup)</h2>
					<p className="section__note">
						Two inconsistencies at once. <strong>Mechanism</strong>: 6 bodies set width via inline{' '}
						<code>
							style={'{{'} maxWidth {'}}'}
						</code>
						, 8 via a <code>className</code> — same goal, two idioms in sibling files.{' '}
						<strong>Value</strong>: <code>maxWidth: 350</code> is hand-typed inline 5 times, with no
						shared rung. A single <code>size</code> prop (or one width class) collapses both.
					</p>
					<table className="matrix">
						<thead>
							<tr>
								<th>width</th>
								<th>count</th>
								<th>note</th>
							</tr>
						</thead>
						<tbody>
							{WIDTHS.map((r) => (
								<tr key={r[0]} data-off={r[2].startsWith('drift') || undefined}>
									<td>{r[0]}</td>
									<td>{r[1]}</td>
									<td>{r[2]}</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>

				<section className="section">
					<h2 className="section__title">The one bespoke modal — justified</h2>
					<div className="callout">
						<code>MaybeForceUserRefresh</code> is <strong>not</strong> a <code>TldrawUiDialog</code>
						: it renders at the app-provider root to dim the whole app when the client is outdated —
						a context where the Radix dialog primitives and their UI-context hooks (
						<code>useTranslation</code>, <code>useDirection</code>) are not available. It&rsquo;s a
						custom overlay by necessity, and it&rsquo;s documented in-code. This is a{' '}
						<strong>justified</strong> divergence, not drift — the kind an audit should leave alone.
					</div>
				</section>

			</div>
		</div>
	)
}

const Stat = ({ n, label, good }: { n: string; label: string; good?: boolean }): ReactNode => (
	<div className="stat" data-good={good || undefined}>
		<div className="stat__n">{n}</div>
		<div className="stat__label">{label}</div>
	</div>
)

const DIALOGS: ReadonlyArray<readonly [string, string, string, string]> = [
	['ConfirmDialog', 'TldrawUiDialog', '300', 'generic confirm'],
	['CreateWorkspaceDialog', 'TldrawUiDialog', '350', 'create a workspace'],
	['TlaDeleteFileDialog', 'TldrawUiDialog', '350', 'delete-file confirm'],
	['SneakyLargeFileHandler', 'TldrawUiDialog', '350', 'large-file warning'],
	['shouldOverrideDocument', 'TldrawUiDialog', '350', 'override-document prompt'],
	['TlaSignInDialog', 'TldrawUiDialog', '450 (auth)', 'sign in (Clerk)'],
	['SubmitFeedbackDialog', 'TldrawUiDialog', '— (500)', 'feedback form (textarea)'],
	['TlaInviteDialog', 'TldrawUiDialog', '— (500)', 'accept workspace invite'],
	['TlaInviteExpiredDialog', 'TldrawUiDialog', '— (500)', 'invite expired'],
	['TlaManageCookiesDialog', 'TldrawUiDialog', '— (500)', 'cookie settings'],
	['WorkspaceSettingsDialog', 'TldrawUiDialog', '— (500)', 'workspace settings (large)'],
	['SneakyLegacyModal', 'TldrawUiDialog', '— (500)', 'legacy editor modal'],
	['MaybeForceUserRefresh', 'bespoke', 'full-screen', 'force-refresh outdated client'],
]

const WIDTHS: ReadonlyArray<readonly [string, string, string]> = [
	['350px', '5', 'drift — hand-typed inline, no shared class'],
	['300px', '1', 'ConfirmDialog'],
	['450px', '1', 'auth (sign-in)'],
	['500px', 'default', '.dialogBody base'],
	['360 / 240px', '2', 'other dialog elements'],
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
.section { margin-bottom: 48px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 760px; }
.section code, .callout code, .page__footer code, .section__note code { font-family: ui-monospace, monospace; font-size: 0.92em; background: var(--tl-color-low); padding: 1px 4px; border-radius: 3px; }
.stats { display: flex; gap: 16px; flex-wrap: wrap; }
.stat { border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 20px; min-width: 220px; background: var(--tl-color-panel); }
.stat[data-good] { border-color: var(--tl-color-success, #2a9d3c); }
.stat__n { font-size: 28px; font-weight: 700; font-family: ui-monospace, monospace; }
.stat[data-good] .stat__n { color: var(--tl-color-success, #2a9d3c); }
.stat__label { font-size: 12px; color: var(--tl-color-text-1); margin-top: 4px; }
.dialogMock { max-width: 360px; border: 1px solid var(--tl-color-divider); border-radius: var(--tl-radius-3); overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,0.12); background: var(--tl-color-panel); }
.dialogMock__header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--tl-color-divider); font-weight: 600; font-size: 13px; }
.dialogMock__x { color: var(--tl-color-text-3); }
.dialogMock__body { padding: 16px 14px; font-size: 13px; color: var(--tl-color-text-1); }
.dialogMock__footer { padding: 12px 14px; border-top: 1px solid var(--tl-color-divider); font-size: 12px; color: var(--tl-color-text-3); text-align: right; }
.miniDialog { width: 96px; border: 1px solid var(--tl-color-divider); border-radius: 5px; overflow: hidden; background: var(--tl-color-panel); box-shadow: 0 3px 10px rgba(0,0,0,0.1); }
.miniDialog__h { height: 14px; border-bottom: 1px solid var(--tl-color-divider); background: var(--tl-color-low); }
.miniDialog__b { height: 30px; }
.miniDialog[data-bespoke] { border-color: var(--tl-color-warning, #cb4b16); }
.miniDialog[data-bespoke] .miniDialog__h { background: var(--tl-color-warning, #cb4b16); opacity: 0.25; }
.section__api { font-size: 11px; font-family: ui-monospace, monospace; line-height: 1.6; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 6px; padding: 10px 12px; max-width: 860px; }
.section__api > div { display: flex; gap: 8px; }
.section__api > div + div { margin-top: 4px; }
.section__api .k { color: var(--tl-color-text-3); flex: 0 0 56px; }
.matrix { border-collapse: collapse; font-size: 12px; font-family: ui-monospace, monospace; }
.matrix th, .matrix td { text-align: left; padding: 6px 18px 6px 0; border-bottom: 1px solid var(--tl-color-divider); vertical-align: top; }
.matrix th { color: var(--tl-color-text-3); font-weight: 500; }
.matrix tr[data-off] td:first-child { font-weight: 700; color: var(--tl-color-warning, #cb4b16); }
.callout { font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 18px; max-width: 840px; }
.callout strong { color: var(--tl-color-text-0); font-weight: 600; }
.page__footer { max-width: 760px; font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); border-top: 1px solid var(--tl-color-divider); padding-top: 20px; }
`
