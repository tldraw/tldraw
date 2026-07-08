/* eslint-disable tldraw/jsx-no-literals, react/no-unescaped-entities */
import { Helmet } from 'react-helmet-async'
import 'tldraw/tldraw.css'
import '../tla/styles/tla.css'
import { SPECIMEN_CSS } from './dev-components-kit'
import { DevComponentsNav } from './dev-components-nav'

/**
 * Dev-only audit of box-shadow / elevation. A fourth divergence flavour: the
 * DUPLICATED primitive. Shadows are properly tokenised (--tl-shadow-1..4 in the
 * SDK) AND used — but the app maintains a near-verbatim copy (--tla-shadow-1..4)
 * with the same drop-shadow geometry, because the token bundles geometry + an
 * inset border colour, so overriding the colour forces copying the geometry. The
 * copy has already drifted: --tla-shadow-2 in dark mode is maroon-tinted. Both
 * scales are rendered live so the duplication (and the red) are visible.
 * Route: /dev/components/shadows.
 */

const LEVELS = [1, 2, 3, 4] as const

export function Component() {
	return (
		<div
			className="tla tl-container tla-theme-container tla-theme__light tl-theme__light"
			style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'auto' }}
		>
			<Helmet>
				<title>Box-shadow audit — dev</title>
			</Helmet>
			<style>{PAGE_CSS + SPECIMEN_CSS}</style>

			<div className="page">
				<DevComponentsNav />
				<header className="page__header">
					<h1 className="page__title">Box-shadow &amp; elevation</h1>
					<p className="page__lede">
						A fourth divergence flavour: the <strong>duplicated</strong> primitive. Unlike{' '}
						<a href="/dev/components/z-index">z-index</a> (an ignored scale), shadows are properly
						tokenised <em>and</em> used — but the app keeps a <strong>near-verbatim copy</strong> of
						the SDK scale (<code>--tla-shadow-1..4</code> mirrors <code>--tl-shadow-1..4</code>),
						because the token bundles drop-shadow geometry with an inset border colour. Both scales
						are rendered live below — they look identical, because they are.
					</p>
				</header>

				<section className="section">
					<div className="stats">
						<Stat n="2" label="parallel shadow scales" accent />
						<Stat n="4" label="rungs each (1–4)" />
						<Stat n="1" label="hidden dark-mode divergence" accent />
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">The two scales, side by side (live)</h2>
					<p className="section__note">
						The SDK scale (<code>--tl-shadow-N</code>) and the app scale (
						<code>--tla-shadow-N</code>), same rung, same page. Same geometry — the app copy just
						swaps the inset border colour var and rewrites the alphas in <code>hsl</code> instead of
						hex.
					</p>
					<div className="shadowGrid">
						<div className="shadowGrid__label">--tl-shadow-N (SDK)</div>
						{LEVELS.map((n) => (
							<div
								key={`tl${n}`}
								className="chip-box"
								style={{ boxShadow: `var(--tl-shadow-${n})` }}
							>
								{n}
							</div>
						))}
						<div className="shadowGrid__label">--tla-shadow-N (app)</div>
						{LEVELS.map((n) => (
							<div
								key={`tla${n}`}
								className="chip-box"
								style={{ boxShadow: `var(--tla-shadow-${n})` }}
							>
								{n}
							</div>
						))}
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">The bundling problem</h2>
					<div className="callout">
						Why does the app copy exist at all? The token isn't just a drop shadow — each rung ends
						with <code>inset 0px 0px 0px 1px var(--tl-color-…-contrast)</code>, a 1px inner border.
						The app wanted a <em>different</em> inset colour (
						<code>--tl-color-selected-contrast</code> instead of{' '}
						<code>--tl-color-panel-contrast</code>), and because geometry and border live in one
						value, changing the colour meant <strong>re-typing all four rungs of geometry</strong>.
						A token that does two jobs forces duplication to override one.
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">The copy already drifted (live)</h2>
					<p className="section__note">
						In <strong>dark mode</strong>, <code>--tla-shadow-2</code> is{' '}
						<code>hsla(0, 44%, 27%, 0.666)</code> — a <strong>maroon-tinted</strong> shadow — while
						the SDK's <code>--tl-shadow-2</code> is neutral black. Rendered on dark panels below:
						the app shadow has a red cast. Almost certainly an accident a review of a copied token
						wouldn't catch.
					</p>
					<div className="darkRow tla-theme__dark tl-theme__dark">
						<div className="dark-box" style={{ boxShadow: 'var(--tl-shadow-2)' }}>
							--tl-shadow-2<span className="dark-box__sub">SDK · neutral</span>
						</div>
						<div className="dark-box" style={{ boxShadow: 'var(--tla-shadow-2)' }}>
							--tla-shadow-2<span className="dark-box__sub">app · maroon-tinted</span>
						</div>
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">Rung-by-rung</h2>
					<table className="matrix">
						<thead>
							<tr>
								<th>rung</th>
								<th>drop-shadow geometry</th>
								<th>inset border colour</th>
								<th>notation</th>
							</tr>
						</thead>
						<tbody>
							{ROWS.map((r) => (
								<tr key={r[0]}>
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
					<h2 className="section__title">Loose ends</h2>
					<div className="callout">
						<ul className="clist">
							<li>
								<strong>Scale mixing.</strong> dotcom's own CSS uses both:{' '}
								<code>menu.module.css:137</code> reaches for <code>--tl-shadow-3</code> (SDK) while{' '}
								<code>dialogs.module.css:50</code> and <code>MaybeForceUserRefresh:20</code> use{' '}
								<code>--tla-shadow-3</code> (app) — for the same "elevation 3" intent.
							</li>
							<li>
								<strong>One magic shadow.</strong> <code>dev-reset-local-state.tsx:136</code>{' '}
								hardcodes <code>0 8px 28px rgb(0 0 0 / 8%)</code> — an off-scale shadow matching no
								token.
							</li>
							<li>
								<strong>Canvas-shape shadows are fine.</strong> <code>NoteShapeUtil</code>,{' '}
								<code>EmbedShapeUtil</code>, <code>BookmarkShapeUtil</code> compute rotation-aware
								shadows (<code>getRotatedBoxShadow</code>) — functional, not chrome, correctly not
								tokenised.
							</li>
						</ul>
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">The gap</h2>
					<div className="callout">
						Split the token's two jobs: a shared <strong>drop-shadow geometry</strong> token the app
						references (never copies), plus a separate <strong>inset-border</strong> token the app
						can re-colour on its own. Then there's one elevation scale, the app themes only the
						border, and a maroon shadow can't sneak in through a hand-retyped copy.
					</div>
				</section>
			</div>
		</div>
	)
}

const Stat = ({ n, label, accent }: { n: string; label: string; accent?: boolean }) => (
	<div className="stat" data-accent={accent || undefined}>
		<div className="stat__n">{n}</div>
		<div className="stat__label">{label}</div>
	</div>
)

const ROWS: ReadonlyArray<readonly [string, string, string, string]> = [
	['1', 'identical (2 layers, 25% / 9%)', '— (no inset)', 'hsl == hsl'],
	[
		'2',
		'identical geometry',
		'panel-contrast → selected-contrast',
		'hex vs hsl · dark drifts to maroon',
	],
	['3', 'identical (28% / 14%)', 'panel-contrast → selected-contrast', 'hex (#…47/#…24) vs hsl'],
	['4', 'identical (3 layers)', 'panel-contrast → selected-contrast', 'hex vs hsl'],
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
.page__lede code, .section__note code, .callout code { font-family: ui-monospace, monospace; font-size: 0.9em; background: var(--tl-color-low); padding: 1px 4px; border-radius: 3px; }
.section { margin-bottom: 44px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 820px; }
.section__note strong { color: var(--tl-color-text-0); }
.stats { display: flex; gap: 16px; flex-wrap: wrap; }
.stat { border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 20px; min-width: 170px; background: var(--tl-color-panel); }
.stat[data-accent] { border-color: var(--tl-color-warning, #cb4b16); }
.stat__n { font-size: 24px; font-weight: 700; font-family: ui-monospace, monospace; }
.stat[data-accent] .stat__n { color: var(--tl-color-warning, #cb4b16); }
.stat__label { font-size: 12px; color: var(--tl-color-text-1); margin-top: 4px; }
.shadowGrid { display: grid; grid-template-columns: 180px repeat(4, 1fr); gap: 20px 24px; align-items: center; max-width: 760px; }
.shadowGrid__label { font-family: ui-monospace, monospace; font-size: 12px; color: var(--tl-color-text-1); }
.chip-box { height: 64px; border-radius: 8px; background: var(--tl-color-panel); display: flex; align-items: center; justify-content: center; font-family: ui-monospace, monospace; font-size: 13px; color: var(--tl-color-text-3); }
.callout { font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 18px; max-width: 900px; }
.callout strong { color: var(--tl-color-text-0); font-weight: 600; }
.clist { margin: 0; padding-left: 20px; }
.clist li { margin-bottom: 8px; }
.darkRow { display: flex; gap: 40px; background: #1a1a1a; border-radius: 12px; padding: 40px; max-width: 620px; }
.dark-box { flex: 1; height: 84px; border-radius: 8px; background: #2a2a2a; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: ui-monospace, monospace; font-size: 12px; color: #ddd; gap: 3px; }
.dark-box__sub { font-size: 10px; color: #888; }
.matrix { border-collapse: collapse; font-size: 12px; font-family: ui-monospace, monospace; width: 100%; max-width: 900px; }
.matrix th, .matrix td { text-align: left; padding: 6px 18px 6px 0; border-bottom: 1px solid var(--tl-color-divider); vertical-align: top; }
.matrix th { color: var(--tl-color-text-3); font-weight: 500; }
`
