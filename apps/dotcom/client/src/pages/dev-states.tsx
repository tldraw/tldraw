/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import 'tldraw/tldraw.css'
import { TlaButton } from '../tla/components/TlaButton/TlaButton'
import { TlaIcon } from '../tla/components/TlaIcon/TlaIcon'
import '../tla/styles/tla.css'
import { Specimen, SPECIMEN_CSS } from './dev-components-kit'
import { DevComponentsNav } from './dev-components-nav'

/**
 * Dev-only inventory of the dotcom app's non-happy-path states: error UIs,
 * loading states, and the spinner. Not a reusable-component family, but exactly
 * the kind of cross-cutting concern that should be understood when redesigning
 * the design system — it's where consistency quietly breaks.
 *
 * Route: /dev/components/states.
 */

export function Component() {
	return (
		<div
			className="tla tl-container tla-theme-container tla-theme__light tl-theme__light"
			style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'auto' }}
		>
			<Helmet>
				<title>Error & loading states — dev</title>
			</Helmet>
			<style>{PAGE_CSS + SPECIMEN_CSS}</style>

			<div className="page">
				<DevComponentsNav />
				<header className="page__header">
					<h1 className="page__title">Error &amp; loading states</h1>
					<p className="page__lede">
						The non-happy-path UI — error screens, loading, the spinner. Not a single component, but
						a cross-cutting concern worth understanding for a redesign: there&rsquo;s no shared
						error-state primitive, loading is inline-only, and the spin animation is duplicated.
					</p>
				</header>

				<section className="section">
					<h2 className="section__title">Error UIs — {ERRORS.length} bespoke screens</h2>
					<p className="section__note">
						Four error screens, no shared error-state component, split across two styling systems
						(<code>ErrorPage</code> is BEM; <code>TlaFileError</code> is CSS-modules). Mocked.
					</p>
					<div className="grid">
						{ERRORS.map((e) => (
							<Specimen key={e.source} label={e.label} code={e.styling} meta={e.trigger} source={e.source}>
								<div className="errMock">
									<div className="errMock__face">{e.face}</div>
									<div className="errMock__msg">{e.msg}</div>
								</div>
							</Specimen>
						))}
					</div>
					<div className="callout">
						The gap for a redesign: there is <strong>no shared <code>&lt;ErrorState&gt;</code></strong>.{' '}
						<code>StoreErrorScreen</code> reuses <code>ErrorPage</code>, but{' '}
						<code>TlaFileError</code> and <code>TlaEditorErrorFallback</code> each roll their own
						layout — and <code>ErrorPage</code> is deliberately on BEM CSS with its own{' '}
						<code>IntlProvider</code> and an inline SVG (so it works offline / outside providers).
						That low-dependency constraint is real, but it means &ldquo;an error screen&rdquo; has no
						single owner.
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">Loading states — inline only</h2>
					<p className="section__note">
						No skeletons, no loading screens — loading is shown inline, mostly via{' '}
						<code>TlaButton isLoading</code> (live below). <code>isLoading</code> appears in{' '}
						{LOADERS.length} files, each ad-hoc; there&rsquo;s no shared &ldquo;loading view.&rdquo;
					</p>
					<div className="grid">
						<Specimen
							label="TlaButton isLoading"
							code={`<TlaButton isLoading>`}
							meta="spinner swaps in; onClick suppressed"
							source="TlaButton.tsx:52"
						>
							<TlaButton variant="primary" isLoading>
								Saving
							</TlaButton>
						</Specimen>
						<Specimen
							label="isLoading consumers"
							code={`isLoading={…}`}
							meta={`${LOADERS.length} files, ad-hoc flags`}
							source="(distributed)"
						>
							<div className="listMock">
								{LOADERS.map((l) => (
									<div key={l}>{l}</div>
								))}
							</div>
						</Specimen>
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">Spinner</h2>
					<p className="section__note">
						The spinner is the <code>spinner</code> sprite icon spun by a CSS keyframe. Live below.
					</p>
					<div className="grid">
						<Specimen
							label="spinner (live)"
							code={`<TlaIcon icon="spinner" /> + tla-spin`}
							meta="sprite icon + CSS rotation"
							source="TlaButton.tsx:54"
						>
							<span className="spinStage">
								<TlaIcon icon="spinner" />
							</span>
						</Specimen>
						<Specimen
							label="⚠ duplicated keyframe"
							code={`@keyframes tla-spin (×2)`}
							meta="defined twice, used at 1.5s AND 1.2s"
							source="button.module.css:55, :98"
						>
							<div className="errMock errMock--warn">
								<div className="errMock__msg">tla-spin lives in button CSS, defined 2×</div>
							</div>
						</Specimen>
					</div>
					<div className="callout">
						The redesign finding: the spin animation (<code>@keyframes tla-spin</code>) is{' '}
						<strong>defined twice in one file</strong> (<code>button.module.css</code>) and applied at
						two different speeds (1.5s and 1.2s). The spinner isn&rsquo;t a component at all — it&rsquo;s
						a sprite icon plus an animation that happens to live in the button&rsquo;s stylesheet. A
						design system would want one <code>&lt;Spinner&gt;</code> (or one shared keyframe + token
						for speed), not an animation coupled to a button.
					</div>
				</section>

				<footer className="page__footer">
					Three redesign takeaways: (1) a shared <code>&lt;ErrorState&gt;</code> so the four error
					screens stop diverging (respecting ErrorPage&rsquo;s offline constraint); (2) a loading
					convention (even if it stays inline-only — that&rsquo;s a deliberate choice worth stating);
					(3) a single spinner + one keyframe. None are reusable-component gaps in the usual sense —
					they&rsquo;re the cross-cutting state UX that a design system has to own too.
				</footer>
			</div>
		</div>
	)
}

const ERRORS: ReadonlyArray<{
	label: string
	styling: string
	trigger: string
	source: string
	face: string
	msg: string
}> = [
	{ label: 'ErrorPage', styling: 'BEM (.error-page__*)', trigger: 'top-level error boundary · offline-safe', source: 'components/ErrorPage', face: ':(', msg: 'Something went wrong' },
	{ label: 'StoreErrorScreen', styling: 'reuses ErrorPage', trigger: 'store / sync failure', source: 'components/StoreErrorScreen.tsx', face: ':(', msg: 'Could not load · Reload' },
	{ label: 'TlaFileError', styling: 'CSS modules', trigger: 'file not-found / forbidden (TLRemoteSyncError)', source: 'tla/components/TlaFileError', face: '∅', msg: 'File not available' },
	{ label: 'TlaEditorErrorFallback', styling: 'own layout', trigger: 'editor render crash', source: 'TlaEditor/editor-components', face: '!', msg: 'The editor crashed' },
]

const LOADERS = [
	'TlaButton.tsx',
	'BoardHistoryLog.tsx',
	'file-share-menu-primitives.tsx',
	'TlaPublishTab.tsx',
	'admin.tsx',
	'file-history.tsx',
	'file-pierre-history.tsx',
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
.page__lede code, .section__note code, .callout code, .page__footer code { font-family: ui-monospace, monospace; font-size: 0.92em; background: var(--tl-color-low); padding: 1px 4px; border-radius: 3px; }
.section { margin-bottom: 48px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 760px; }
.errMock { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
.errMock__face { font-size: 22px; font-family: ui-monospace, monospace; color: var(--tl-color-text-3); }
.errMock__msg { font-size: 12px; color: var(--tl-color-text-1); }
.errMock--warn .errMock__msg { color: var(--tl-color-warning, #cb4b16); font-family: ui-monospace, monospace; font-size: 11px; }
.listMock { font-size: 10px; font-family: ui-monospace, monospace; color: var(--tl-color-text-3); line-height: 1.6; text-align: left; }
.spinStage { display: inline-flex; color: var(--tl-color-primary); animation: devspin 1.2s linear infinite; }
.spinStage > span { width: 22px; height: 22px; }
@keyframes devspin { to { transform: rotate(360deg); } }
.callout { font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 18px; max-width: 840px; margin-top: 4px; }
.callout strong { color: var(--tl-color-text-0); font-weight: 600; }
.page__footer { max-width: 760px; font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); border-top: 1px solid var(--tl-color-divider); padding-top: 20px; }
`
