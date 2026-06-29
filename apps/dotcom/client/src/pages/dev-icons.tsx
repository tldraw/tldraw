/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import { TldrawUiContextProvider, TldrawUiIcon } from 'tldraw'
import 'tldraw/tldraw.css'
import { TlaIcon } from '../tla/components/TlaIcon/TlaIcon'
import '../tla/styles/tla.css'
import { Specimen, SPECIMEN_CSS } from './dev-components-kit'
import { DevComponentsNav } from './dev-components-nav'

/**
 * Dev-only inventory of the dotcom app's icon mechanisms. Three ways to render
 * an icon — TlaIcon (sprite-mask), the SDK TldrawUiIcon (per-icon assets), and
 * inline <svg> — i.e. competing implementations, the same divergence mode as
 * buttons but smaller. TlaIcon and TldrawUiIcon are both CSS-mask icons yet
 * can't share icons: different sprite sources and different contexts.
 *
 * Serves tldraw/tldraw#9199 / #9190 (icon items). Route: /dev/components/icons.
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
				<title>Icon inventory — dev</title>
			</Helmet>
			<style>{PAGE_CSS + SPECIMEN_CSS}</style>

			<TldrawUiContextProvider forceMobile={false}>
			<div className="page">
				<DevComponentsNav />
				<header className="page__header">
					<h1 className="page__title">Icon inventory</h1>
					<p className="page__lede">
						Three ways to render an icon — competing implementations, the same divergence mode as
						buttons. <code>TlaIcon</code> and <code>TldrawUiIcon</code> are both CSS-mask icons, yet
						they can&rsquo;t share icons: different sprite sources, different contexts.
					</p>
				</header>

				<section className="section">
					<h2 className="section__title">Usage</h2>
					<div className="stats">
						<Stat n="28" label="TlaIcon (dotcom sprite)" />
						<Stat n="6" label="TldrawUiIcon (SDK)" />
						<Stat n="1" label="inline <svg>" />
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">
						Sprite coverage — {USED.size} of {ALL_ICONS.length} used
					</h2>
					<p className="section__note">
						The merged sprite ships all {ALL_ICONS.length} icons; only {USED.size} are referenced.
						The rest still download (the {`:target`} stack can't tree-shake). Every icon below is
						rendered live from the sprite; unused ones are dimmed. (Static snapshot — names flowing
						through data may bump the used count a little.)
					</p>
					<div className="stats" style={{ marginBottom: 20 }}>
						<Stat n={String(ALL_ICONS.length)} label="icons in 0_merged_tla.svg" />
						<Stat n={String(USED.size)} label="referenced in code" />
						<Stat n={String(ALL_ICONS.length - USED.size)} label="apparently unused" />
					</div>
					<div className="spriteGrid">
						{ALL_ICONS.map((name) => (
							<div key={name} className="spriteCell" data-unused={!USED.has(name) || undefined}>
								<span className="spriteCell__icon">
									<TlaIcon icon={name} />
								</span>
								<span className="spriteCell__name">{name}</span>
							</div>
						))}
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">Overview</h2>
					<p className="section__note">
						<code>TlaIcon</code> shown live (its sprite is bundled). The SDK icon needs the editor
						asset context, so it&rsquo;s a mock.
					</p>
					<div className="grid">
						<Specimen
							label="TlaIcon"
							code={`<TlaIcon icon="search" />`}
							meta="15px · currentColor mask · 0_merged_tla.svg"
							source="tla/components/TlaIcon"
						>
							<span className="iconStage">
								<TlaIcon icon="search" />
							</span>
						</Specimen>
						<Specimen
							label="TlaIcon"
							code={`<TlaIcon icon="close" />`}
							meta="same sprite, by name"
							source="tla/components/TlaIcon"
						>
							<span className="iconStage">
								<TlaIcon icon="close" />
							</span>
						</Specimen>
						<Specimen
							label="TlaIcon"
							code={`<TlaIcon icon="avatar" />`}
							meta="masked currentColor shape"
							source="tla/components/TlaIcon"
						>
							<span className="iconStage">
								<TlaIcon icon="avatar" />
							</span>
						</Specimen>
						<Specimen
							label="TlaIcon invertIcon"
							code={`<TlaIcon icon="chevron-right" invertIcon />`}
							meta="transform: scale(-1, 1)"
							source="tla/components/TlaIcon"
						>
							<span className="iconStage">
								<TlaIcon icon="chevron-right" invertIcon />
							</span>
						</Specimen>
						<Specimen
							label="TlaIcon icon='none'"
							code={`<TlaIcon icon="none" />`}
							meta="empty spacer — keeps the 15px box, paints nothing"
							source="tla/components/TlaIcon"
						>
							<span className="iconStage iconStage--ghost">
								<TlaIcon icon="none" />
							</span>
						</Specimen>
						<Specimen
							label="TldrawUiIcon (SDK)"
							code={`<TldrawUiIcon icon="chevron-right" />`}
							meta="per-icon asset · resolves via AssetUrlsProvider"
							source="tldraw (packages/tldraw)"
						>
							<span className="iconStage">
								<TldrawUiIcon icon="chevron-right" label="chevron-right" />
							</span>
						</Specimen>
						<Specimen
							label="inline <svg>"
							code={`<svg viewBox="0 0 16 16">…</svg>`}
							meta="two-colour, can't be a monochrome mask; offline-safe"
							source="components/ErrorPage"
						>
							<svg viewBox="0 0 16 16" width="22" height="22" aria-hidden>
								<circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
								<circle cx="5.5" cy="6.5" r="1" fill="currentColor" />
								<circle cx="10.5" cy="6.5" r="1" fill="currentColor" />
								<path d="M5 11 q3 -2 6 0" fill="none" stroke="currentColor" strokeWidth="1.4" />
							</svg>
						</Specimen>
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">Three mechanisms, compared</h2>
					<table className="matrix matrix--wide">
						<thead>
							<tr>
								<th></th>
								<th>TlaIcon</th>
								<th>TldrawUiIcon (SDK)</th>
								<th>inline &lt;svg&gt;</th>
							</tr>
						</thead>
						<tbody>
							{ROWS.map((r) => (
								<tr key={r[0]}>
									<td className="rowhead">{r[0]}</td>
									<td>{r[1]}</td>
									<td>{r[2]}</td>
									<td>{r[3]}</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>

				<section className="section">
					<h2 className="section__title">Why two mask-icon components</h2>
					<div className="callout">
						<code>TlaIcon</code> and <code>TldrawUiIcon</code> both paint an icon by{' '}
						<code>mask</code>-ing a coloured box — but <code>TlaIcon</code> reads one bundled merged
						sprite (<code>0_merged_tla.svg</code>) with no context, while <code>TldrawUiIcon</code>{' '}
						resolves <em>per-icon</em> asset URLs through the editor&rsquo;s{' '}
						<code>AssetUrlsProvider</code>. So the dotcom app, which renders chrome <em>outside</em>{' '}
						the editor, needs its own icon component and its own sprite —{' '}
						<strong>partly justified</strong>. But the two can&rsquo;t share an icon set, and a
						design-system icon would have to bridge both. The lone inline <code>&lt;svg&gt;</code>{' '}
						(ErrorPage&rsquo;s two-colour face) is a genuine exception: a monochrome mask
						can&rsquo;t render it, and it must work offline.
					</div>
				</section>

			</div>
			</TldrawUiContextProvider>
		</div>
	)
}

// Every icon id in 0_merged_tla.svg (the merged sprite).
const ALL_ICONS = [
	'avatar',
	'bookmark',
	'check',
	'chevron-down',
	'chevron-down-strong',
	'chevron-right',
	'chevron-right-strong',
	'chevron-up',
	'chevron-up-down',
	'chevron-up-strong',
	'close',
	'close-strong',
	'comment',
	'copy',
	'copy-strong',
	'doc',
	'doc-strong',
	'dots-horizontal',
	'dots-horizontal-strong',
	'dots-vertical',
	'dots-vertical-strong',
	'draw',
	'edit',
	'edit-strong',
	'export',
	'external',
	'feedback',
	'folder',
	'folder-new',
	'folder-open',
	'group',
	'group-strong',
	'help-circle',
	'home',
	'home-strong',
	'import',
	'info',
	'invite',
	'link',
	'link-strong',
	'manual',
	'more',
	'pin',
	'pin-strong',
	'plus',
	'plus-strong',
	'qr',
	'question',
	'question-circle',
	'refresh',
	'search',
	'settings',
	'share',
	'shared',
	'sidebar',
	'sidebar-strong',
	'sign-in',
	'spinner',
	'star',
	'star-fill',
	'star-strong',
	'star-strong-fill',
	'tick',
	'tldraw',
	'untick',
	'update',
] as const

// Icons referenced in code — static snapshot from icon= / iconLeft= / iconRight= literals
// intersected with the sprite. Regenerate by grepping those attributes; a few data-driven
// names may not be captured, so treat this as a floor.
const USED = new Set<string>([
	'avatar',
	'check',
	'chevron-down',
	'chevron-up-down',
	'close',
	'comment',
	'copy',
	'dots-vertical-strong',
	'edit',
	'edit-strong',
	'export',
	'external',
	'feedback',
	'group',
	'help-circle',
	'pin',
	'plus',
	'search',
	'settings',
	'share',
	'sidebar-strong',
	'sign-in',
	'spinner',
])

const ROWS: ReadonlyArray<readonly [string, string, string, string]> = [
	[
		'mechanism',
		'CSS mask of a merged sprite',
		'CSS mask of a per-icon asset',
		'the SVG markup itself',
	],
	[
		'source',
		'0_merged_tla.svg (bundled)',
		'AssetUrlsProvider (per icon)',
		'inline in the component',
	],
	['sizing', '15px default · free via CSS/style', 'small / tiny booleans', 'whatever the svg sets'],
	['colour', 'currentColor', 'color prop / currentColor', 'fill in the markup'],
	['a11y', 'aria-hidden + optional ariaLabel', 'label required', 'manual'],
	['context', 'none — sprite imported', 'needs the editor asset context', 'none'],
	['where', 'dotcom UI (28)', 'SDK-derived UI (6)', 'ErrorPage two-colour (1)'],
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
.page__lede code, .section code, .callout code, .page__footer code, .section__note code { font-family: ui-monospace, monospace; font-size: 0.92em; background: var(--tl-color-low); padding: 1px 4px; border-radius: 3px; }
.section { margin-bottom: 48px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 760px; }
.stats { display: flex; gap: 16px; flex-wrap: wrap; }
.stat { border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 20px; min-width: 200px; background: var(--tl-color-panel); }
.stat__n { font-size: 28px; font-weight: 700; font-family: ui-monospace, monospace; }
.stat__label { font-size: 12px; color: var(--tl-color-text-1); margin-top: 4px; }
.iconStage { display: inline-flex; align-items: center; justify-content: center; color: var(--tl-color-text); }
.iconStage > span { width: 22px; height: 22px; }
.spriteGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; }
.spriteCell { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 6px 10px; border: 1px solid var(--tl-color-divider); border-radius: 6px; background: var(--tl-color-panel); font-size: 10px; font-family: ui-monospace, monospace; color: var(--tl-color-text-3); }
.spriteCell__icon { color: var(--tl-color-text); display: inline-flex; }
.spriteCell__icon > span { width: 20px; height: 20px; }
.spriteCell__name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.spriteCell[data-unused] { opacity: 0.5; background: transparent; border-style: dashed; }
.spriteCell[data-unused] .spriteCell__icon { color: var(--tl-color-text-3); }
.spriteCell[data-unused] .spriteCell__name { text-decoration: line-through; }
.iconStage--ghost { outline: 1px dashed var(--tl-color-divider); border-radius: 4px; }
.iconStage--mock { font-family: ui-monospace, monospace; font-size: 10px; color: var(--tl-color-text-3); border: 1px dashed var(--tl-color-divider); border-radius: 4px; padding: 6px 8px; }
.matrix { border-collapse: collapse; font-size: 12px; font-family: ui-monospace, monospace; }
.matrix th, .matrix td { text-align: left; padding: 6px 18px 6px 0; border-bottom: 1px solid var(--tl-color-divider); vertical-align: top; }
.matrix th { color: var(--tl-color-text-3); font-weight: 500; }
.matrix--wide td, .matrix--wide th { padding-right: 24px; max-width: 280px; }
.matrix .rowhead { color: var(--tl-color-text-3); }
.callout { font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 18px; max-width: 840px; }
.callout strong { color: var(--tl-color-text-0); font-weight: 600; }
.page__footer { max-width: 760px; font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); border-top: 1px solid var(--tl-color-divider); padding-top: 20px; }
`
