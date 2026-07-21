/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import 'tldraw/tldraw.css'
import '../tla/styles/tla.css'
import { DevComponentsNav } from './dev-components-nav'

/**
 * Dev-only inventory of the dotcom app's type sizes. Typography diverges by a
 * MISSING, UNREACHABLE scale: the only ramp is five global CSS utility classes
 * (.tla-text_ui__*) — and three of them are the same 12px — with no token and no
 * component, so CSS Modules can't reach it and hardcode font-size instead. Every
 * hardcoded and inline size is rendered below at its real value; nothing
 * filtered. The hardcoded 11/12px aren't even new sizes — they retype what the
 * classes already define.
 *
 * Serves tldraw/tldraw#9196 (establish a typography system). Route:
 * /dev/components/typography.
 */

const SAMPLE = 'The quick brown fox'

const TypeSample = ({
	px,
	selector,
	source,
	inline,
}: {
	px: number
	selector: string
	source: string
	inline?: boolean
}): ReactNode => (
	<div className="ts">
		<div className="ts__render" style={{ fontSize: px }}>
			{SAMPLE}
		</div>
		<div className="ts__meta">
			<span className="ts__px">{px}px</span>
			<span className="ts__sel">{selector}</span>
			{inline && <span className="ts__tag">inline style</span>}
		</div>
		<div className="ts__src">{source}</div>
	</div>
)

export function Component() {
	const total = HARDCODED.length + CLASSES.length
	return (
		<div
			className="tla tl-container tla-theme-container tla-theme__light tl-theme__light"
			style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'auto' }}
		>
			<Helmet>
				<title>Typography inventory — dev</title>
			</Helmet>
			<style>{PAGE_CSS}</style>

			<div className="page">
				<DevComponentsNav />
				<header className="page__header">
					<h1 className="page__title">Typography inventory</h1>
					<p className="page__lede">
						Every type size in the dotcom app, rendered at its real value. There is no type scale:{' '}
						{total} size declarations collapse to just {ALL_SIZES.length} distinct sizes, and{' '}
						<strong>12px is hardcoded {COUNT_12}× outside the classes</strong>. The five{' '}
						<code>.tla-text_ui__*</code> classes are the only ramp — but three of them are the same
						12px, so they offer no reason to be reached for, and CSS Modules can&rsquo;t reach them
						anyway.
					</p>
				</header>

				<section className="section">
					<div className="stats">
						<Stat n={String(total)} label="size declarations" />
						<Stat n={String(ALL_SIZES.length)} label="distinct sizes" />
						<Stat n={`${COUNT_12}×`} label="12px hardcoded (non-class)" accent />
						<Stat n="5→3" label=".tla-text_ui__ names → sizes" accent />
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">The class scale — .tla-text_ui__* (the intended ramp)</h2>
					<p className="section__note">
						Rendered with the real classes. Note <code>medium</code>, <code>regular</code> and{' '}
						<code>title</code> are all 12px — five names, three sizes.
					</p>
					<div className="grid">
						{CLASSES.map((c) => (
							<div className="ts" key={c.cls}>
								<div className={`ts__render ${c.cls}`}>{SAMPLE}</div>
								<div className="ts__meta">
									<span className="ts__px">{c.px}px</span>
									<span className="ts__sel">.{c.cls}</span>
								</div>
								<div className="ts__src">tla.css:{c.line}</div>
							</div>
						))}
					</div>
				</section>

				{DISTINCT.map((px) => {
					const group = HARDCODED.filter((h) => h.px === px)
					return (
						<section className="section" key={px}>
							<h2 className="section__title">
								{px}px — hardcoded {group.length}× {px === 12 && '(the same size as three classes)'}
							</h2>
							<div className="grid">
								{group.map((h) => (
									<TypeSample
										key={h.source}
										px={h.px}
										selector={h.selector}
										source={h.source}
										inline={h.inline}
									/>
								))}
							</div>
						</section>
					)
				})}

				<section className="section">
					<h2 className="section__title">What it tells a redesign</h2>
					<div className="callout">
						The hardcoded sizes aren&rsquo;t a wild spread — they cluster on{' '}
						<strong>11px and 12px</strong>, the exact sizes <code>.tla-text_ui__small</code> and{' '}
						<code>.tla-text_ui__regular</code> already define. So this isn&rsquo;t a scale that
						doesn&rsquo;t exist; it&rsquo;s a scale that&rsquo;s{' '}
						<strong>retyped by hand 40+ times</strong> because it has no token (a{' '}
						<code>--tla-font-size-*</code> a CSS Module could reference) and no semantic names worth
						reaching for. A real scale needs both: tokens CSS Modules can consume, and names that{' '}
						<em>mean</em> something (<code>body</code>, <code>caption</code>, <code>heading</code>)
						rather than three aliases for 12px.
					</div>
				</section>
			</div>
		</div>
	)
}

const Stat = ({ n, label, accent }: { n: string; label: string; accent?: boolean }): ReactNode => (
	<div className="stat" data-accent={accent || undefined}>
		<div className="stat__n">{n}</div>
		<div className="stat__label">{label}</div>
	</div>
)

const CLASSES: ReadonlyArray<{ cls: string; px: number; line: number }> = [
	{ cls: 'tla-text_ui__small', px: 11, line: 106 },
	{ cls: 'tla-text_ui__medium', px: 12, line: 114 },
	{ cls: 'tla-text_ui__regular', px: 12, line: 121 },
	{ cls: 'tla-text_ui__title', px: 12, line: 95 },
	{ cls: 'tla-text_ui__big', px: 24, line: 128 },
]

const HARDCODED: ReadonlyArray<{ px: number; selector: string; source: string; inline?: boolean }> =
	[
		{ px: 11, selector: '.adminReleaseValue', source: 'admin.module.css:32' },
		{ px: 11, selector: '.dataDisplay', source: 'admin.module.css:121' },
		{ px: 11, selector: '.fieldLabel', source: 'admin.module.css:249' },
		{ px: 11, selector: '.logContainer', source: 'admin.module.css:193' },
		{ px: 11, selector: '.statLabel', source: 'admin.module.css:290' },
		{ px: 12, selector: '.adminReleaseMeta', source: 'admin.module.css:20' },
		{ px: 12, selector: '.anonDotDevLink > div', source: 'TlaAnonDotDevLink.module.css:11' },
		{ px: 12, selector: '.authCheckboxLabel', source: 'auth.module.css:160' },
		{ px: 12, selector: '.authCtaButton', source: 'auth.module.css:53' },
		{ px: 12, selector: '.authDescription', source: 'auth.module.css:42' },
		{ px: 12, selector: '.authDivider', source: 'auth.module.css:73' },
		{ px: 12, selector: '.authError', source: 'auth.module.css:125' },
		{ px: 12, selector: '.authInput', source: 'auth.module.css:108' },
		{ px: 12, selector: '.authInput::placeholder', source: 'auth.module.css:294' },
		{ px: 12, selector: '.authLabel', source: 'auth.module.css:97' },
		{ px: 12, selector: '.authResendButton', source: 'auth.module.css:256' },
		{ px: 12, selector: '.authResendWrapper', source: 'auth.module.css:242' },
		{ px: 12, selector: '.authTermsOfUse a', source: 'auth.module.css:144' },
		{ px: 12, selector: '.cookieButton', source: 'dialogs.module.css:104' },
		{ px: 12, selector: '.cookieText', source: 'dialogs.module.css:75' },
		{ px: 12, selector: '.countDisplay', source: 'admin.module.css:310' },
		{ px: 12, selector: '.ctaButton', source: 'cta-button.module.css:15' },
		{ px: 12, selector: '.errorMessage', source: 'admin.module.css:83' },
		{ px: 12, selector: '.fieldValue', source: 'admin.module.css:257' },
		{ px: 12, selector: '.inlineButton', source: 'dialogs.module.css:320' },
		{ px: 12, selector: '.memberRole', source: 'dialogs.module.css:266' },
		{ px: 12, selector: '.message', source: 'TlaInviteDialog.module.css:21' },
		{ px: 12, selector: '.message', source: 'TlaInviteExpiredDialog.module.css:27' },
		{ px: 12, selector: '.progressLog h5', source: 'admin.module.css:182' },
		{ px: 12, selector: '.searchInput', source: 'admin.module.css:67' },
		{ px: 12, selector: '.successMessage', source: 'admin.module.css:93' },
		{ px: 12, selector: '.tla .tl-container', source: 'tla.css:88' },
		{ px: 12, selector: '.tlaButton', source: 'button.module.css:19' },
		{ px: 14, selector: '.modalContent', source: 'MaybeForceUserRefresh.module.css:18' },
		{
			px: 14,
			selector: '<div style={{ fontSize: 14 }}>',
			source: 'SlurpFailure.tsx:27',
			inline: true,
		},
		{ px: 16, selector: '.authInput', source: 'auth.module.css:290' },
		{ px: 16, selector: '.dialogBody .header', source: 'TlaInviteExpiredDialog.module.css:20' },
		{ px: 16, selector: '.feedbackDialogTextArea', source: 'dialogs.module.css:31' },
		{ px: 16, selector: '.modalTitle', source: 'MaybeForceUserRefresh.module.css:29' },
		{ px: 16, selector: '.statValue', source: 'admin.module.css:297' },
		{ px: 16, selector: '.tla select', source: 'tla.css:16' },
		{ px: 20, selector: '.authOtpBox', source: 'auth.module.css:201' },
	]

const DISTINCT = [11, 12, 14, 16, 20]
const ALL_SIZES = [11, 12, 14, 16, 20, 24]
const COUNT_12 = HARDCODED.filter((h) => h.px === 12).length

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
.page__lede strong { color: var(--tl-color-text-0); font-weight: 600; }
.page__lede code, .section__note code, .callout code { font-family: ui-monospace, monospace; font-size: 0.92em; background: var(--tl-color-low); padding: 1px 4px; border-radius: 3px; }
.section { margin-bottom: 40px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 800px; }
.stats { display: flex; gap: 16px; flex-wrap: wrap; }
.stat { border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 20px; min-width: 150px; background: var(--tl-color-panel); }
.stat[data-accent] { border-color: var(--tl-color-warning, #cb4b16); }
.stat__n { font-size: 26px; font-weight: 700; font-family: ui-monospace, monospace; }
.stat[data-accent] .stat__n { color: var(--tl-color-warning, #cb4b16); }
.stat__label { font-size: 12px; color: var(--tl-color-text-1); margin-top: 4px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.ts { border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 14px 16px; background: var(--tl-color-panel); display: flex; flex-direction: column; gap: 8px; overflow: hidden; }
.ts__render { color: var(--tl-color-text); line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ts__meta { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.ts__px { font-size: 12px; font-weight: 700; font-family: ui-monospace, monospace; color: var(--tl-color-text-0); }
.ts__sel { font-size: 11px; font-family: ui-monospace, monospace; color: var(--tl-color-text-1); }
.ts__tag { font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; font-family: ui-monospace, monospace; padding: 1px 6px; border-radius: 999px; background: color-mix(in srgb, var(--tl-color-warning, #cb4b16) 16%, transparent); color: var(--tl-color-warning, #cb4b16); }
.ts__src { font-size: 10px; font-family: ui-monospace, monospace; color: var(--tl-color-text-3); border-top: 1px dashed var(--tl-color-divider); padding-top: 6px; }
.callout { font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 18px; max-width: 860px; }
.callout strong { color: var(--tl-color-text-0); font-weight: 600; }
.callout em { font-style: italic; }
`
