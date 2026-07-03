/* eslint-disable tldraw/jsx-no-literals, react/no-unescaped-entities */
import { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import { FormattedRelativeTime, useIntl } from 'react-intl'
import 'tldraw/tldraw.css'
import '../tla/styles/tla.css'
import { Specimen, SPECIMEN_CSS } from './dev-components-kit'
import { DevComponentsNav } from './dev-components-nav'
import { IsolationProviders } from './dev-editor-harness'

/**
 * Dev-only inventory of how the dotcom app renders dates & times. There is NO
 * shared Timestamp component — each call site formats its own way, via five
 * different mechanisms, and they disagree on locale (two hardcode en-GB, two
 * follow the user locale via react-intl, one uses the browser default). The SDK
 * renders no user-facing dates at all (only internal new Date() for logic), so a
 * Timestamp primitive belongs in the app layer. All five are rendered live off
 * one reference instant so the divergence is real.
 *
 * Candidate primitive for a design system. Route: /dev/components/timestamps.
 */

const REF = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // ~3 days ago
const SECONDS_AGO = -3 * 24 * 60 * 60

const enGBMonthYear = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'long' }).format(
	REF
)
const enGBFull = new Intl.DateTimeFormat('en-GB', {
	year: 'numeric',
	month: 'short',
	day: 'numeric',
	hour: 'numeric',
	minute: 'numeric',
	second: 'numeric',
}).format(REF)
const browserTime = REF.toLocaleTimeString()

/** The react-intl absolute path (locale-aware), as TldrawApp uses it. */
const IntlAbsolute = (): ReactNode => {
	const intl = useIntl()
	return (
		<>
			{intl.formatDate(REF, {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric',
			})}
		</>
	)
}

export function Component() {
	return (
		<div
			className="tla tl-container tla-theme-container tla-theme__light tl-theme__light"
			style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'auto' }}
		>
			<Helmet>
				<title>Dates & timestamps — dev</title>
			</Helmet>
			<style>{PAGE_CSS + SPECIMEN_CSS}</style>

			<IsolationProviders>
				<div className="page">
					<DevComponentsNav />
					<header className="page__header">
						<h1 className="page__title">Dates &amp; timestamps</h1>
						<p className="page__lede">
							There is <strong>no shared Timestamp component</strong>. Every date/time is formatted
							ad-hoc at the call site — <strong>five different mechanisms</strong> that disagree on
							locale. All five below render the <em>same</em> reference instant (~3 days ago), live,
							so the divergence is real, not drawn.
						</p>
					</header>

					<section className="section">
						<div className="stats">
							<Stat n="5" label="formatting mechanisms" accent />
							<Stat n="0" label="shared components / utils" />
							<Stat n="2" label="hardcode en-GB (locale bug)" accent />
						</div>
					</section>

					<section className="section">
						<h2 className="section__title">Same instant, five renderings (live)</h2>
						<p className="section__note">
							One <code>Date</code> ({REF.toISOString()}), formatted by each mechanism the app
							actually uses.
						</p>
						<div className="grid">
							<Specimen
								label="Intl.DateTimeFormat — month/year"
								code={`Intl.DateTimeFormat('en-GB', { year, month: 'long' })`}
								meta="hardcoded en-GB · ignores user locale"
								source="BoardHistoryLog.tsx:14"
							>
								<span className="ts">{enGBMonthYear}</span>
							</Specimen>
							<Specimen
								label="Intl.DateTimeFormat — full"
								code={`Intl.DateTimeFormat('en-GB', { …y m d h m s })`}
								meta="hardcoded en-GB · ignores user locale"
								source="BoardHistoryLog.tsx:87"
							>
								<span className="ts">{enGBFull}</span>
							</Specimen>
							<Specimen
								label="react-intl formatDate"
								code={`intl.formatDate(date, format)`}
								meta="locale-aware (follows the app language)"
								source="TldrawApp.ts:727"
							>
								<span className="ts">
									<IntlAbsolute />
								</span>
							</Specimen>
							<Specimen
								label="react-intl FormattedRelativeTime"
								code={`<FormattedRelativeTime value={s} numeric="auto" updateIntervalInSeconds={15} />`}
								meta="locale-aware · auto-updates · picks the human unit"
								source="TlaPublishTab.tsx:122"
							>
								<span className="ts">
									<FormattedRelativeTime
										value={SECONDS_AGO}
										numeric="auto"
										updateIntervalInSeconds={15}
									/>
								</span>
							</Specimen>
							<Specimen
								label="toLocaleTimeString"
								code={`new Date(t).toLocaleTimeString()`}
								meta="browser default locale · time only"
								source="admin.tsx:810"
							>
								<span className="ts">{browserTime}</span>
							</Specimen>
						</div>
					</section>

					<section className="section">
						<h2 className="section__title">The locale drift</h2>
						<div className="callout">
							This isn&rsquo;t just style — the mechanisms <strong>disagree on behaviour</strong>.
							Two call sites{' '}
							<strong>
								hardcode <code>en-GB</code>
							</strong>{' '}
							(British format regardless of the user&rsquo;s language); two go through{' '}
							<strong>react-intl</strong> and follow the app locale; one uses the{' '}
							<strong>browser default</strong>. So the same product shows dates differently
							depending on which screen you&rsquo;re on. A single <code>&lt;Timestamp&gt;</code>{' '}
							that reads locale from context fixes the drift as a side effect.
						</div>
					</section>

					<section className="section">
						<h2 className="section__title">Where the app renders dates</h2>
						<table className="matrix">
							<thead>
								<tr>
									<th>call site</th>
									<th>mechanism</th>
									<th>locale</th>
									<th>shape</th>
								</tr>
							</thead>
							<tbody>
								{SITES.map((r) => (
									<tr key={r[0]} data-off={r[2] === 'hardcoded en-GB' || undefined}>
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
						<h2 className="section__title">The SDK renders no dates</h2>
						<div className="callout">
							<code>packages/tldraw</code> / <code>packages/editor</code> render{' '}
							<strong>no user-facing dates at all</strong> — the only date usage is internal (
							<code>new Date()</code> ×27, <code>.toISOString</code> ×5, e.g. presence{' '}
							<code>lastActivityTimestamp</code>). The canvas engine has no chrome that shows a
							date, so unlike buttons or dialogs (SDK-owned), a <code>&lt;Timestamp&gt;</code> is
							squarely an <strong>app-layer</strong> primitive — a <code>--tla-*</code>-world
							component, where all the divergence above lives.
						</div>
					</section>

					<section className="section">
						<h2 className="section__title">The gap</h2>
						<div className="callout">
							A <code>&lt;Timestamp&gt;</code> — absolute vs relative mode, locale from context, one
							set of format presets — would collapse all five mechanisms into one and remove the
							en-GB drift. The same shape as the missing <code>&lt;ErrorState&gt;</code> the{' '}
							<a href="/dev/components/states">states</a> page flagged: a primitive that
							doesn&rsquo;t exist yet, reinvented per site.
						</div>
					</section>
				</div>
			</IsolationProviders>
		</div>
	)
}

const Stat = ({ n, label, accent }: { n: string; label: string; accent?: boolean }): ReactNode => (
	<div className="stat" data-accent={accent || undefined}>
		<div className="stat__n">{n}</div>
		<div className="stat__label">{label}</div>
	</div>
)

const SITES: ReadonlyArray<readonly [string, string, string, string]> = [
	[
		'BoardHistoryLog (month header)',
		"Intl.DateTimeFormat('en-GB')",
		'hardcoded en-GB',
		'June 2026',
	],
	[
		'BoardHistoryLog (row)',
		"Intl.DateTimeFormat('en-GB')",
		'hardcoded en-GB',
		'29 Jun 2026, 14:30:00',
	],
	['TldrawApp.formatFileDate', 'intl.formatDate', 'user locale', 'dynamic (getDateFormat)'],
	['TlaPublishTab', 'FormattedRelativeTime', 'user locale', 'relative — "3 days ago"'],
	['admin (log)', 'toLocaleTimeString', 'browser default', 'time only'],
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
.page__header { max-width: 800px; margin-bottom: 32px; }
.page__title { font-size: 28px; font-weight: 700; margin: 0 0 12px; }
.page__lede { font-size: 14px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0; }
.page__lede strong { color: var(--tl-color-text-0); font-weight: 600; }
.page__lede em { font-style: italic; }
.page__lede code, .section__note code, .callout code { font-family: ui-monospace, monospace; font-size: 0.92em; background: var(--tl-color-low); padding: 1px 4px; border-radius: 3px; }
.section { margin-bottom: 40px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 800px; }
.stats { display: flex; gap: 16px; flex-wrap: wrap; }
.stat { border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 20px; min-width: 170px; background: var(--tl-color-panel); }
.stat[data-accent] { border-color: var(--tl-color-warning, #cb4b16); }
.stat__n { font-size: 26px; font-weight: 700; font-family: ui-monospace, monospace; }
.stat[data-accent] .stat__n { color: var(--tl-color-warning, #cb4b16); }
.stat__label { font-size: 12px; color: var(--tl-color-text-1); margin-top: 4px; }
.ts { font-size: 14px; font-family: ui-monospace, monospace; color: var(--tl-color-text-0); text-align: center; }
.callout { font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 18px; max-width: 860px; }
.callout strong { color: var(--tl-color-text-0); font-weight: 600; }
.callout a { color: var(--tl-color-primary); }
.matrix { border-collapse: collapse; font-size: 12px; font-family: ui-monospace, monospace; width: 100%; max-width: 820px; }
.matrix th, .matrix td { text-align: left; padding: 6px 18px 6px 0; border-bottom: 1px solid var(--tl-color-divider); vertical-align: top; }
.matrix th { color: var(--tl-color-text-3); font-weight: 500; }
.matrix tr[data-off] td:nth-child(3) { color: var(--tl-color-warning, #cb4b16); font-weight: 600; }
`
