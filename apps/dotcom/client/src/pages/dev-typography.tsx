/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import 'tldraw/tldraw.css'
import '../tla/styles/tla.css'
import { DevComponentsNav } from './dev-components-nav'
import { Specimen, SPECIMEN_CSS } from './dev-components-kit'

/**
 * Dev-only inventory of the dotcom app's type scale, and how it sits next to the
 * SDK's separate text system. Typography diverges by a MISSING, UNREACHABLE
 * scale: the dotcom ramp exists only as global CSS utility classes
 * (.tla-text_ui__*) with no token and no component, so CSS Modules can't use it
 * and hardcode font-size/weight — most text bypasses the scale entirely. The SDK
 * (tl layer) is a wholly separate system that doesn't use tla-text_ui at all.
 *
 * Serves tldraw/tldraw#9196 (establish a typography system). Route:
 * /dev/components/typography.
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
				<title>Typography inventory — dev</title>
			</Helmet>
			<style>{PAGE_CSS + SPECIMEN_CSS}</style>

			<div className="page">
				<DevComponentsNav />
				<header className="page__header">
					<h1 className="page__title">Typography inventory</h1>
					<p className="page__lede">
						Every text-styling mechanism in the dotcom app, and the boundary with the SDK. The short
						answer to &ldquo;does everything use <code>.tla-text_ui__*</code>?&rdquo; is no: the
						scale is the minority, most text hardcodes its size, and the SDK is a separate system
						entirely.
					</p>
				</header>

				{/* Punchline 1: the scale is the minority. */}
				<section className="section">
					<h2 className="section__title">Coverage reality (dotcom text styling)</h2>
					<p className="section__note">
						How dotcom elements get their text size. More text hardcodes a font-size than reaches
						the scale.
					</p>
					<div className="stats">
						<Stat n="34" label="use a .tla-text_ui__* class" />
						<Stat n="39" label="hardcode font-size in *.module.css" accent />
						<Stat n="2" label="inline style fontSize" accent />
					</div>
				</section>

				{/* Punchline 2: two separate systems. */}
				<section className="section">
					<h2 className="section__title">Two separate text systems</h2>
					<p className="section__note">
						<code>.tla-text_ui__*</code> is dotcom-only — zero uses in <code>packages/</code>. The
						SDK has its own font system that the app layer doesn&rsquo;t touch. Neither has a
						font-size token.
					</p>
					<table className="matrix matrix--wide">
						<thead>
							<tr>
								<th></th>
								<th>dotcom (tla layer)</th>
								<th>SDK (tl layer)</th>
							</tr>
						</thead>
						<tbody>
							{SYSTEMS.map((r) => (
								<tr key={r[0]}>
									<td className="rowhead">{r[0]}</td>
									<td>{r[1]}</td>
									<td>{r[2]}</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>

				<section className="section">
					<h2 className="section__title">The dotcom scale, as it exists</h2>
					<p className="section__note">
						Five global classes in <code>tla/styles/tla.css</code> — only three distinct sizes (11 /
						12 / 24px), a 12→24 gap, and a byte-identical pair.
					</p>
					<div className="grid">
						<Specimen
							label="big"
							code={`className="tla-text_ui__big"`}
							meta="24px · 400 · text-0 · 1 use"
							source="tla.css"
						>
							<span className="tla-text_ui__big">Heading</span>
						</Specimen>
						<Specimen
							label="title"
							code={`className="tla-text_ui__title"`}
							meta="12px · 700 · +0.2px letter-spacing · 7 uses"
							source="tla.css"
						>
							<span className="tla-text_ui__title">Section title</span>
						</Specimen>
						<Specimen
							label="medium ⚠ ≡ regular"
							code={`className="tla-text_ui__medium"`}
							meta="12px · 500 · 4 uses — identical to regular"
							source="tla.css"
						>
							<span className="tla-text_ui__medium">Medium body</span>
						</Specimen>
						<Specimen
							label="regular ⚠ ≡ medium"
							code={`className="tla-text_ui__regular"`}
							meta="12px · 500 · 12 uses — identical to medium"
							source="tla.css"
						>
							<span className="tla-text_ui__regular">Regular body</span>
						</Specimen>
						<Specimen
							label="small"
							code={`className="tla-text_ui__small"`}
							meta="11px · 500 · text-3 · 10 uses"
							source="tla.css"
						>
							<span className="tla-text_ui__small">Small caption</span>
						</Specimen>
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">The structural gap</h2>
					<div className="callout">
						The scale exists <strong>only as global CSS utility classes</strong> (
						<code>.tla-text_ui__*</code>). There is <strong>no token layer</strong> (no{' '}
						<code>--tla-font-size-*</code> / <code>--tla-font-weight-*</code>) and{' '}
						<strong>
							no <code>&lt;TlaText&gt;</code> component
						</strong>
						. CSS Modules are locally scoped and can&rsquo;t reference the global classes, so every
						module that wants &ldquo;12px / 500 text&rdquo; re-types it by hand — which is why the
						39 hardcoded font-sizes above outnumber the 34 that reach the scale. The scale is
						unreachable from where text is actually styled.
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">Where the hardcoding lives (*.module.css)</h2>
					<p className="section__note">
						Per-file count of hardcoded <code>font-size</code> declarations — the auth and admin
						forms dominate.
					</p>
					<table className="matrix">
						<thead>
							<tr>
								<th>file</th>
								<th>font-size decls</th>
							</tr>
						</thead>
						<tbody>
							{BY_FILE.map((r) => (
								<tr key={r[0]}>
									<td>{r[0]}</td>
									<td>{r[1]}</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>

				<section className="section">
					<h2 className="section__title">Drift & off-scale (the hardcoded values)</h2>
					<p className="section__note">
						Matches-a-rung values are drift (should reference the scale); the rest reveal missing
						rungs.
					</p>
					<div className="tables">
						<table className="matrix">
							<thead>
								<tr>
									<th>font-size</th>
									<th>count</th>
									<th>status</th>
								</tr>
							</thead>
							<tbody>
								{SIZES.map((r) => (
									<tr key={r[0]} data-off={r[2].startsWith('off') || undefined}>
										<td>{r[0]}</td>
										<td>{r[1]}</td>
										<td>{r[2]}</td>
									</tr>
								))}
							</tbody>
						</table>
						<table className="matrix">
							<thead>
								<tr>
									<th>font-weight</th>
									<th>count</th>
									<th>status</th>
								</tr>
							</thead>
							<tbody>
								{WEIGHTS.map((r) => (
									<tr key={r[0]} data-off={r[2].startsWith('off') || undefined}>
										<td>{r[0]}</td>
										<td>{r[1]}</td>
										<td>{r[2]}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>

				<footer className="page__footer">
					Three decisions for #9196, none of them a sweep: (1) the canonical rungs — keep 11 / 12 /
					24, or add the off-scale 14 / 16 / 20 and a 600 weight the app keeps reaching for? (2) how
					to expose them — design tokens, a <code>&lt;TlaText&gt;</code> component, or both — so CSS
					Modules and JSX can reference the scale instead of hardcoding it; (3) collapse the medium
					≡ regular duplicate. (Whether to unify with the SDK&rsquo;s <code>tl</code> text layer at
					all is a separate, larger question.) See tldraw/tldraw#9196.
				</footer>
			</div>
		</div>
	)
}

const SYSTEMS: ReadonlyArray<readonly [string, string, string]> = [
	[
		'font family',
		'--tla-font-ui (Inter + system)',
		'--tl-font-draw / sans / serif / mono (custom) + system for UI',
	],
	[
		'size scale',
		'.tla-text_ui__* — 5 global classes',
		'none — base .tl-container 12px, ad-hoc per rule',
	],
	['size token', 'none', 'none'],
	['uses .tla-text_ui__*?', 'partially — 34 sites', 'no — dotcom-only'],
	['hardcoded sizes', '39 in *.module.css + 2 inline', '~18 font-size decls in ui.css'],
]

const BY_FILE: ReadonlyArray<readonly [string, string]> = [
	['dialogs/auth.module.css', '13'],
	['pages/admin.module.css', '13'],
	['dialogs/dialogs.module.css', '5'],
	['MaybeForceUserRefresh.module.css', '2'],
	['dialogs/TlaInviteExpiredDialog.module.css', '2'],
	['+ 4 files (button / cta / invite / anon-link)', '1 each'],
]

const SIZES: ReadonlyArray<readonly [string, string, string]> = [
	['12px', '27', 'drift → matches medium / regular'],
	['11px', '5', 'drift → matches small'],
	['16px', '5', 'off-scale — no rung (12→24 gap)'],
	['20px', '1', 'off-scale'],
	['14px', '1', 'off-scale'],
]

const WEIGHTS: ReadonlyArray<readonly [string, string, string]> = [
	['500', '16', 'on scale (small / medium / regular)'],
	['700', '2', 'on scale (title)'],
	['bold', '1', 'on scale — keyword spelling of 700'],
	['600', '9', 'off-scale — not in {400, 500, 700}'],
	['800', '3', 'off-scale'],
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
.stat { border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 20px; min-width: 200px; background: var(--tl-color-panel); }
.stat[data-accent] { border-color: var(--tl-color-warning, #cb4b16); }
.stat__n { font-size: 28px; font-weight: 700; font-family: ui-monospace, monospace; }
.stat[data-accent] .stat__n { color: var(--tl-color-warning, #cb4b16); }
.stat__label { font-size: 12px; color: var(--tl-color-text-1); margin-top: 4px; }
.ladder { border: 1px solid var(--tl-color-divider); border-radius: 8px; overflow: hidden; max-width: 880px; }
.rung { display: flex; align-items: baseline; justify-content: space-between; gap: 32px; padding: 16px 18px; border-bottom: 1px solid var(--tl-color-divider); }
.rung:last-child { border-bottom: none; }
.rung__sample { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rung__meta { flex: 0 0 auto; display: flex; align-items: baseline; gap: 12px; font-size: 11px; font-family: ui-monospace, monospace; color: var(--tl-color-text-3); }
.rung__meta code { color: var(--tl-color-text-1); }
.rung__flag { color: var(--tl-color-warning, #cb4b16); }
.callout { font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 18px; max-width: 840px; }
.callout strong { color: var(--tl-color-text-0); font-weight: 600; }
.tables { display: flex; gap: 48px; flex-wrap: wrap; }
.matrix { border-collapse: collapse; font-size: 12px; font-family: ui-monospace, monospace; }
.matrix th, .matrix td { text-align: left; padding: 6px 18px 6px 0; border-bottom: 1px solid var(--tl-color-divider); vertical-align: top; }
.matrix th { color: var(--tl-color-text-3); font-weight: 500; }
.matrix--wide td, .matrix--wide th { padding-right: 28px; max-width: 360px; }
.matrix .rowhead { color: var(--tl-color-text-3); }
.matrix tr[data-off] td:last-child { color: var(--tl-color-warning, #cb4b16); }
.matrix tr[data-off] td:first-child { font-weight: 700; }
.page__footer { max-width: 760px; font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); border-top: 1px solid var(--tl-color-divider); padding-top: 20px; }
`
