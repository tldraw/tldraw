/* eslint-disable tldraw/jsx-no-literals */
import { Helmet } from 'react-helmet-async'
import 'tldraw/tldraw.css'
import { TlaLogo } from '../tla/components/TlaLogo/TlaLogo'
import '../tla/styles/tla.css'
import { Specimen, SPECIMEN_CSS } from './dev-components-kit'
import { DevComponentsNav } from './dev-components-nav'

/**
 * Dev-only inventory of the dotcom logo. One component, TlaLogo — a <span>
 * masking /tldraw_sidebar_logo.svg with currentColor (the same mask-tint
 * technique as TlaIcon, but for the wordmark). Used in 5 places. Shown live.
 *
 * Route: /dev/components/logo.
 */

export function Component() {
	return (
		<div
			className="tla tl-container tla-theme-container tla-theme__light tl-theme__light"
			style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'auto' }}
		>
			<Helmet>
				<title>Logo inventory — dev</title>
			</Helmet>
			<style>{PAGE_CSS + SPECIMEN_CSS}</style>

			<div className="page">
				<DevComponentsNav />
				<header className="page__header">
					<h1 className="page__title">Logo inventory</h1>
					<p className="page__lede">
						One component — <code>TlaLogo</code> — a <code>&lt;span&gt;</code> that masks{' '}
						<code>/tldraw_sidebar_logo.svg</code> with <code>currentColor</code>. The same
						mask-tint trick as <code>TlaIcon</code>, so the wordmark inherits text colour and
						adapts to light/dark for free.
					</p>
				</header>

				<section className="section">
					<h2 className="section__title">All {USES.length} call sites</h2>
					<p className="section__note">
						Rendered live at its natural and a few scaled sizes (the mask is{' '}
						<code>100% / 100%</code>, so size comes from the element box).
					</p>
					<div className="grid">
						{USES.map((u) => (
							<Specimen key={u.source} label={u.label} code={u.code} meta={u.meta} source={u.source}>
								<span className="logoStage" style={{ color: u.color }}>
									<TlaLogo style={{ width: u.w, height: u.h }} />
								</span>
							</Specimen>
						))}
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">How it works</h2>
					<div className="callout">
						<code>TlaLogo</code> sets <code>mask: url(/tldraw_sidebar_logo.svg) center / 100%</code>{' '}
						on a <code>&lt;span&gt;</code> whose <code>background-color</code> is{' '}
						<code>currentColor</code> — so the wordmark is a stencil painted in the inherited text
						colour. Identical in spirit to <code>TlaIcon</code> (single asset, masked, tinted), and
						it carries the same <code>webkitMask</code>-in-<code>useLayoutEffect</code> hack to
						avoid React re-requesting the asset. Because it&rsquo;s a mask it is{' '}
						<strong>monochrome</strong>; the colour is whatever <code>color</code> resolves to at
						the call site.
					</div>
				</section>

				<footer className="page__footer">
					The single cleanest component in the gallery: one file, one asset, five call sites, no
					variants. Branding is the one place where having exactly one implementation is obviously
					correct — there is only one logo.
				</footer>
			</div>
		</div>
	)
}

const USES: ReadonlyArray<{
	label: string
	code: string
	meta: string
	source: string
	w: number
	h: number
	color?: string
}> = [
	{ label: 'sidebar workspace', code: '<TlaLogo />', meta: 'default · inherits text colour', source: 'TlaSidebarWorkspaceLink.tsx', w: 76, h: 16 },
	{ label: 'editor top-left', code: '<TlaLogo /> (in ExternalLink)', meta: 'links to tldraw.dev', source: 'TlaEditorTopLeftPanel.tsx', w: 76, h: 16 },
	{ label: 'sign-in dialog', code: '<TlaLogo />', meta: 'auth header', source: 'TlaSignInDialog.tsx', w: 100, h: 21 },
	{ label: 'legal acceptance', code: '<TlaLogo />', meta: 'legal dialog', source: 'TlaLegalAcceptance.tsx', w: 100, h: 21 },
	{ label: 'tinted (primary)', code: '<TlaLogo style={{ color }} />', meta: 'mask tints with currentColor', source: 'any call site', w: 100, h: 21, color: 'var(--tl-color-primary)' },
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
.logoStage { display: inline-flex; align-items: center; justify-content: center; color: var(--tl-color-text); }
.callout { font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 18px; max-width: 840px; }
.callout strong { color: var(--tl-color-text-0); font-weight: 600; }
.page__footer { max-width: 760px; font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); border-top: 1px solid var(--tl-color-divider); padding-top: 20px; }
`
