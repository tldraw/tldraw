/* eslint-disable tldraw/jsx-no-literals, react/no-unescaped-entities */
import { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import 'tldraw/tldraw.css'
import { ExternalLink } from '../tla/components/ExternalLink/ExternalLink'
import '../tla/styles/tla.css'
import { Specimen, SPECIMEN_CSS } from './dev-components-kit'
import { DevComponentsNav } from './dev-components-nav'

/**
 * Dev-only inventory of the dotcom app's links. The cleanest adoption story in
 * the gallery: a #9198 sweep moved raw anchors to ExternalLink, leaving exactly
 * one raw <a> — a justified exception (outside the router context). This is what
 * "done" looks like: near-total adoption plus one documented holdout.
 *
 * Serves tldraw/tldraw#9198 (use ExternalLink consistently). Route:
 * /dev/components/links.
 */

const Stat = ({ n, label, good }: { n: string; label: string; good?: boolean }): ReactNode => (
	<div className="stat" data-good={good || undefined}>
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
				<title>Link inventory — dev</title>
			</Helmet>
			<style>{PAGE_CSS + SPECIMEN_CSS}</style>

			<div className="page">
				<DevComponentsNav />
				<header className="page__header">
					<h1 className="page__title">Link inventory</h1>
					<p className="page__lede">
						The healthiest adoption in the gallery. <code>ExternalLink</code> is used everywhere; a
						#9198 sweep retired the raw anchors, leaving exactly one — and that one is a justified
						exception. This page is what &ldquo;done&rdquo; looks like.
					</p>
				</header>

				<section className="section">
					<h2 className="section__title">Adoption</h2>
					<div className="stats">
						<Stat n="17" label="ExternalLink" good />
						<Stat n="1" label="raw <a> (justified)" />
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">All {LINKS.length} links</h2>
					<p className="section__note">
						Every <code>ExternalLink</code> call site in the app, plus the one raw{' '}
						<code>&lt;a&gt;</code> — nothing filtered. Each rendered live; <code>code</code> is the
						literal <code>to</code>, <code>source</code> the file:line.
					</p>
					<div className="grid">
						{LINKS.map((l) => (
							<Specimen key={l.source} label={l.kind} code={l.code} meta={l.meta} source={l.source}>
								<span className="linkStage">
									{l.raw ? (
										// eslint-disable-next-line react/jsx-no-target-blank
										<a href={l.render} target="_blank" rel="noopener noreferrer">
											{l.text}
										</a>
									) : (
										<ExternalLink to={l.render} eventName={l.event}>
											{l.text}
										</ExternalLink>
									)}
								</span>
							</Specimen>
						))}
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">Props in use</h2>
					<div className="section__api">
						<div>
							<span className="k">api</span>
							to (a react-router target, not href), eventName? (analytics), + all <code>
								Link
							</code>{' '}
							props (children, onClick, className…)
						</div>
						<div>
							<span className="k">baked</span>
							always target="_blank" + rel="noopener noreferrer"; eventName fires trackEvent on
							click
						</div>
						<div>
							<span className="k">handles</span>
							root-relative static files (/tos.html), absolute external URLs, and in-app routes —
							all open in a new tab
						</div>
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">The one raw &lt;a&gt; — justified</h2>
					<div className="callout">
						<code>IFrameProtector</code> renders a raw <code>&lt;a href&gt;</code> because it sits{' '}
						<strong>outside the tla subsystem and the router context</strong> — a low-dependency
						guard shown when the app is framed, where react-router&rsquo;s <code>Link</code> (and
						its context) may not be available. It keeps the same <code>target</code>/
						<code>rel</code> hardening by hand. A justified exception, not drift — the same
						&ldquo;leave it alone&rdquo; verdict the menus and icons pages reached.
					</div>
				</section>
			</div>
		</div>
	)
}

// Every ExternalLink call site in the app, plus the one raw <a>. `render` is a
// real URL used for the live link; `code` is the literal `to` as written.
const LINKS: ReadonlyArray<{
	kind: string
	code: string
	render: string
	text: string
	meta?: string
	source: string
	event?: string
	raw?: boolean
}> = [
	{
		kind: 'sidebar dotdev',
		code: 'to="https://tldraw.dev?…sidebar-link"',
		render: 'https://tldraw.dev',
		text: 'tldraw.dev',
		meta: 'external · utm sidebar-link',
		source: 'TlaSidebarDotDevLink:14',
	},
	{
		kind: 'slurp file link',
		code: 'to={routes.tlaLocalFile(key)}',
		render: '/f/abc123',
		text: 'Go here to see the content',
		meta: 'in-app route → new tab',
		source: 'SlurpFailure:49',
	},
	{
		kind: 'slurp discord',
		code: 'to="https://discord.tldraw.com/?…slurp-failure"',
		render: 'https://discord.tldraw.com/',
		text: 'Get help on Discord',
		meta: 'external',
		source: 'SlurpFailure:65',
	},
	{
		kind: 'anon dotdev',
		code: 'to="https://tldraw.dev?…anon-overlay-link"',
		render: 'https://tldraw.dev',
		text: 'tldraw.dev',
		meta: 'eventName',
		source: 'TlaAnonDotDevLink:37',
		event: 'anon-dotdev-link-clicked',
	},
	{
		kind: 'feedback discord',
		code: 'to="https://discord.tldraw.com/?…dotcom-feedback"',
		render: 'https://discord.tldraw.com/',
		text: 'Discord',
		meta: 'eventName',
		source: 'SubmitFeedbackDialog:54',
		event: 'menu-feedback-discord-link-clicked',
	},
	{
		kind: 'feedback github',
		code: 'to="https://github.com/tldraw/tldraw/issues"',
		render: 'https://github.com/tldraw/tldraw/issues',
		text: 'GitHub issues',
		meta: 'eventName',
		source: 'SubmitFeedbackDialog:62',
		event: 'menu-feedback-github-link-clicked',
	},
	{
		kind: 'feedback discord (2)',
		code: 'to="https://discord.tldraw.com/?…dotcom-feedback"',
		render: 'https://discord.tldraw.com/',
		text: 'Discord',
		meta: 'eventName · 2nd render path',
		source: 'SubmitFeedbackDialog:138',
		event: 'menu-feedback-discord-link-clicked',
	},
	{
		kind: 'feedback github (2)',
		code: 'to="https://github.com/tldraw/tldraw/issues"',
		render: 'https://github.com/tldraw/tldraw/issues',
		text: 'GitHub issues',
		meta: 'eventName · 2nd render path',
		source: 'SubmitFeedbackDialog:148',
		event: 'menu-feedback-github-link-clicked',
	},
	{
		kind: 'sign-in tos',
		code: 'to="/tos.html"',
		render: '/tos.html',
		text: 'Terms of Use',
		meta: 'static file',
		source: 'TlaSignInDialog:270',
	},
	{
		kind: 'sign-in privacy',
		code: 'to="/privacy.html"',
		render: '/privacy.html',
		text: 'Privacy Policy',
		meta: 'static file',
		source: 'TlaSignInDialog:275',
	},
	{
		kind: 'legal tos',
		code: 'to="/tos.html"',
		render: '/tos.html',
		text: 'Terms',
		meta: 'static file · i18n <F> chunk',
		source: 'TlaLegalAcceptance:78',
	},
	{
		kind: 'legal privacy',
		code: 'to="/privacy.html"',
		render: '/privacy.html',
		text: 'Privacy',
		meta: 'static file · i18n <F> chunk',
		source: 'TlaLegalAcceptance:79',
	},
	{
		kind: 'legal cookies',
		code: 'to="/cookies.html"',
		render: '/cookies.html',
		text: 'Cookies',
		meta: 'static file · i18n <F> chunk',
		source: 'TlaLegalAcceptance:90',
	},
	{
		kind: 'cookies dialog',
		code: 'to={COOKIE_POLICY_URL}',
		render: '/cookies.html',
		text: 'Cookie policy',
		meta: 'COOKIE_POLICY_URL = /cookies.html',
		source: 'TlaManageCookiesDialog:39',
	},
	{
		kind: 'cookies dialog (2)',
		code: 'to={COOKIE_POLICY_URL}',
		render: '/cookies.html',
		text: 'Cookie policy',
		meta: '2nd render path',
		source: 'TlaManageCookiesDialog:71',
	},
	{
		kind: 'editor logo',
		code: 'to="https://tldraw.dev?…top-left-logo"',
		render: 'https://tldraw.dev',
		text: 'tldraw.dev (logo)',
		meta: 'eventName · aria-label',
		source: 'TlaEditorTopLeftPanel:110',
		event: 'top-left-logo-clicked',
	},
	{
		kind: 'debug help',
		code: 'to={issue.helpUrl}',
		render: 'https://tldraw.dev',
		text: 'More info',
		meta: 'dynamic · issue.helpUrl',
		source: 'TlaDebug:78',
	},
	{
		kind: 'raw <a> (exception)',
		code: '<a href={url} target="_blank" rel="…">',
		render: 'https://tldraw.com',
		text: 'Visit this page on tldraw.com',
		meta: 'outside router ctx · uses href, not to',
		source: 'IFrameProtector:66',
		raw: true,
	},
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
.stat[data-good] { border-color: var(--tl-color-success, #2a9d3c); }
.stat__n { font-size: 28px; font-weight: 700; font-family: ui-monospace, monospace; }
.stat[data-good] .stat__n { color: var(--tl-color-success, #2a9d3c); }
.stat__label { font-size: 12px; color: var(--tl-color-text-1); margin-top: 4px; }
.linkStage a { color: var(--tl-color-primary); text-decoration: underline; font-size: 13px; }
.section__api { font-size: 11px; font-family: ui-monospace, monospace; line-height: 1.6; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 6px; padding: 10px 12px; max-width: 860px; }
.section__api > div { display: flex; gap: 8px; }
.section__api > div + div { margin-top: 4px; }
.section__api .k { color: var(--tl-color-text-3); flex: 0 0 64px; }
.section__api code { background: none; padding: 0; }
.callout { font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 18px; max-width: 840px; }
.callout strong { color: var(--tl-color-text-0); font-weight: 600; }
.page__footer { max-width: 760px; font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); border-top: 1px solid var(--tl-color-divider); padding-top: 20px; }
`
