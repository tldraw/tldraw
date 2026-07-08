/* eslint-disable tldraw/jsx-no-literals, react/no-unescaped-entities */
import { Helmet } from 'react-helmet-async'
import 'tldraw/tldraw.css'
import '../tla/styles/tla.css'
import { SPECIMEN_CSS } from './dev-components-kit'
import { DevComponentsNav } from './dev-components-nav'

/**
 * Dev-only audit of z-index / stacking order. Unlike the dates and identity
 * findings (a missing primitive), here the primitive EXISTS and is ignored: the
 * SDK ships a full --tl-layer-* token scale (~30 named layers across two ladders,
 * canvas + UI), but dotcom mostly uses magic numbers — 51 literal z-index
 * declarations, only 4 referencing the tokens. The magic numbers land on named
 * rungs (250 = menu-click-capture = canvas-in-front; 10000 = canvas-blocker), so
 * a bare integer can't express intent and any SDK renumber silently reorders the
 * app. Route: /dev/components/z-index.
 */

/** One rung of the stacking order: a z-index value and who sits there. */
interface Rung {
	z: number
	sdk?: string[] // SDK --tl-layer-* names at this value
	dotcom?: string[] // dotcom magic-number sites at this value
}

// Sorted high → low (top of the stack first), curated to the rungs dotcom competes with.
const LADDER: Rung[] = [
	{ z: 10000, sdk: ['canvas-blocker'], dotcom: ['MaybeForceUserRefresh'] },
	{ z: 999, sdk: ['header-footer'] },
	{ z: 700, sdk: ['cursor'] },
	{ z: 650, sdk: ['toasts'] },
	{ z: 500, sdk: ['canvas-overlays'] },
	{ z: 400, sdk: ['menus'] },
	{ z: 300, sdk: ['panels', 'canvas-shapes'] },
	{ z: 250, sdk: ['menu-click-capture', 'canvas-in-front'], dotcom: ['TlaSidebarLayout'] },
	{ z: 200, sdk: ['watermark'] },
	{ z: 150, sdk: ['canvas-grid'] },
	{ z: 100, sdk: ['canvas-background', 'overlays-selection-fg'], dotcom: ['TlaSidebar ×2'] },
	{ z: 99, dotcom: ['TlaSidebar'] },
	{ z: 10, sdk: ['focused-input', 'overlays-collaborator-scribble'] },
	{ z: 1, sdk: ['above', 'text-container', 'error-overlay'] },
]

const isCollision = (r: Rung) => !!r.dotcom && !!r.sdk

export function Component() {
	return (
		<div
			className="tla tl-container tla-theme-container tla-theme__light tl-theme__light"
			style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'auto' }}
		>
			<Helmet>
				<title>Z-index audit — dev</title>
			</Helmet>
			<style>{PAGE_CSS + SPECIMEN_CSS}</style>

			<div className="page">
				<DevComponentsNav />
				<header className="page__header">
					<h1 className="page__title">Z-index &amp; stacking order</h1>
					<p className="page__lede">
						The opposite of the <a href="/dev/components/timestamps">dates</a> /{' '}
						<a href="/dev/components/identity">identity</a> findings: here the primitive{' '}
						<strong>exists and is ignored</strong>. The SDK ships a full <code>--tl-layer-*</code>{' '}
						token scale (~30 named layers), but dotcom mostly uses <strong>magic numbers</strong> —
						51 literal <code>z-index</code> declarations, only <strong>4</strong> reference the
						tokens. And the magic numbers land on named rungs, so a bare integer can't say what it
						means.
					</p>
				</header>

				<section className="section">
					<div className="stats">
						<Stat n="~30" label="SDK --tl-layer-* tokens" />
						<Stat n="51" label="dotcom literal z-index" accent />
						<Stat n="4" label="dotcom uses the tokens" />
						<Stat n="10000" label="highest magic number" accent />
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">The stacking order</h2>
					<p className="section__note">
						The SDK ladder (green) with dotcom's magic numbers (orange) placed on the same number
						line. Rows where an <strong>orange lands on a green</strong> are collisions — a bare
						number that happens to equal a named layer, with no way to tell if that was intended.
					</p>
					<div className="ladder">
						{LADDER.map((r) => (
							<div key={r.z} className="rung" data-collision={isCollision(r) || undefined}>
								<div className="rung__z">{r.z}</div>
								<div className="rung__bars">
									{r.sdk?.map((n) => (
										<span key={n} className="chip chip--sdk">
											--tl-layer-{n}
										</span>
									))}
									{r.dotcom?.map((n) => (
										<span key={n} className="chip chip--dotcom">
											{n}
										</span>
									))}
								</div>
								{isCollision(r) && <div className="rung__flag">collision</div>}
							</div>
						))}
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">The collisions</h2>
					<div className="callout callout--bug">
						A magic number can't express intent, and it silently hitches to whatever the SDK numbers
						happen to be:
						<ul className="clist">
							<li>
								<code>250</code> (<code>TlaSidebarLayout</code>) equals <strong>three</strong>{' '}
								things: <code>--tl-layer-menu-click-capture</code>,{' '}
								<code>--tl-layer-canvas-in-front</code>, and itself. Is the sidebar meant to sit at
								the menu-capture layer, or did it just pick 250? Unknowable.
							</li>
							<li>
								<code>10000</code> (<code>MaybeForceUserRefresh</code>) equals{' '}
								<code>--tl-layer-canvas-blocker</code> — plausibly intentional (both are
								block-everything overlays), but written as a bare number it doesn't say so.
							</li>
							<li>
								<code>100</code> (<code>TlaSidebar</code>) equals{' '}
								<code>--tl-layer-canvas-background</code> /{' '}
								<code>--tl-layer-overlays-selection-fg</code>.
							</li>
						</ul>
						If the SDK ever renumbers the scale, these app surfaces reorder with no code change and
						no warning.
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">Two ladders share one number line</h2>
					<div className="callout">
						Even within the SDK the scale is doubled: a <strong>canvas</strong> ladder (
						<code>
							canvas-background 100 → watermark 200 → canvas-in-front 250 → canvas-shapes 300 →
							canvas-overlays 500 → canvas-blocker 10000
						</code>
						) and a <strong>UI</strong> ladder (
						<code>
							above 1 → menu-click-capture 250 → panels 300 → menus 400 → toasts 650 → cursor 700 →
							header-footer 999
						</code>
						) reuse the same integers for different jobs (<code>250</code>, <code>300</code> each
						mean two things). That's fine <em>because</em> the canvas and UI stacking contexts don't
						overlap — but it means "just pick a bigger number" is never safe reasoning, since 250
						isn't one layer, it's two.
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">dotcom's literal z-indexes</h2>
					<table className="matrix">
						<thead>
							<tr>
								<th>site</th>
								<th>z-index</th>
								<th>lands on</th>
							</tr>
						</thead>
						<tbody>
							{OFFENDERS.map((r) => (
								<tr key={r[0]} data-bug={r[3] || undefined}>
									<td>{r[0]}</td>
									<td>{r[1]}</td>
									<td>{r[2]}</td>
								</tr>
							))}
						</tbody>
					</table>
					<p className="section__note" style={{ marginTop: 14 }}>
						Plus a swarm of local <code>z-index: 0/1/2/3</code> across ~10 files — mostly benign
						within-component stacking, but each still a literal rather than a token.
					</p>
				</section>

				<section className="section">
					<h2 className="section__title">The gap</h2>
					<div className="callout">
						The fix here is nearly free: the scale already exists. Every app <code>z-index</code>{' '}
						should reference <code>var(--tl-layer-*)</code> — or, where the app needs its own rungs,
						define <code>--tla-layer-*</code> tokens that <em>slot into</em> the SDK scale in one
						place — so intent is explicit and a renumber is a one-file change. A bare{' '}
						<code>250</code> should never be how the sidebar says where it lives.
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

const OFFENDERS: ReadonlyArray<readonly [string, string, string, boolean]> = [
	['MaybeForceUserRefresh.module.css:12', '10000', '--tl-layer-canvas-blocker', true],
	[
		'TlaSidebarLayout/sidebar-layout.module.css:44',
		'250',
		'menu-click-capture / canvas-in-front',
		true,
	],
	['TlaSidebar/sidebar.module.css:8,173', '100', 'canvas-background / selection-fg', true],
	['TlaSidebar/sidebar.module.css:32', '99', '(just below 100)', false],
	['sidebar.module.css:548', 'var(--tl-layer-menus)', '✓ uses the token', false],
	['tla-menu/menu.module.css:134', 'var(--tl-layer-canvas-overlays)', '✓ uses the token', false],
	['dialogs.module.css:166', 'var(--tl-layer-toasts)', '✓ uses the token', false],
	[
		'TlaAnonDotDevLink.module.css:5',
		'calc(var(--tl-layer-watermark) + 1)',
		'✓ uses the token',
		false,
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
.page__lede code, .section__note code, .callout code { font-family: ui-monospace, monospace; font-size: 0.9em; background: var(--tl-color-low); padding: 1px 4px; border-radius: 3px; }
.section { margin-bottom: 44px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 820px; }
.section__note strong { color: var(--tl-color-text-0); }
.stats { display: flex; gap: 16px; flex-wrap: wrap; }
.stat { border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 20px; min-width: 160px; background: var(--tl-color-panel); }
.stat[data-accent] { border-color: var(--tl-color-warning, #cb4b16); }
.stat__n { font-size: 24px; font-weight: 700; font-family: ui-monospace, monospace; }
.stat[data-accent] .stat__n { color: var(--tl-color-warning, #cb4b16); }
.stat__label { font-size: 12px; color: var(--tl-color-text-1); margin-top: 4px; }
.ladder { display: flex; flex-direction: column; gap: 2px; max-width: 860px; border-left: 2px solid var(--tl-color-divider); padding-left: 4px; }
.rung { display: flex; align-items: center; gap: 12px; padding: 5px 8px; border-radius: 6px; }
.rung[data-collision] { background: color-mix(in srgb, var(--tl-color-warning, #cb4b16) 10%, transparent); }
.rung__z { width: 54px; text-align: right; font-family: ui-monospace, monospace; font-size: 13px; font-weight: 600; color: var(--tl-color-text-3); }
.rung__bars { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
.chip { font-family: ui-monospace, monospace; font-size: 11px; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
.chip--sdk { background: color-mix(in srgb, var(--tl-color-success, #2a9d3c) 16%, transparent); color: var(--tl-color-success, #2a9d3c); }
.chip--dotcom { background: color-mix(in srgb, var(--tl-color-warning, #cb4b16) 18%, transparent); color: var(--tl-color-warning, #cb4b16); font-weight: 600; }
.rung__flag { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--tl-color-warning, #cb4b16); font-weight: 600; }
.callout { font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 18px; max-width: 900px; }
.callout strong { color: var(--tl-color-text-0); font-weight: 600; }
.callout--bug { border-color: var(--tl-color-warning, #cb4b16); }
.clist { margin: 10px 0 0; padding-left: 20px; }
.clist li { margin-bottom: 8px; }
.matrix { border-collapse: collapse; font-size: 12px; font-family: ui-monospace, monospace; width: 100%; max-width: 900px; }
.matrix th, .matrix td { text-align: left; padding: 6px 18px 6px 0; border-bottom: 1px solid var(--tl-color-divider); vertical-align: top; }
.matrix th { color: var(--tl-color-text-3); font-weight: 500; }
.matrix tr[data-bug] td:nth-child(3) { color: var(--tl-color-warning, #cb4b16); font-weight: 600; }
`
