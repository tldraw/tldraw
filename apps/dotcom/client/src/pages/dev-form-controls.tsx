/* eslint-disable tldraw/jsx-no-literals, react/no-unescaped-entities */
import { Helmet } from 'react-helmet-async'
import 'tldraw/tldraw.css'
import {
	TlaMenuControl,
	TlaMenuControlInfoTooltip,
	TlaMenuControlLabel,
	TlaMenuDetail,
	TlaMenuSelect,
	TlaMenuSwitch,
	TlaMenuTabsRoot,
	TlaMenuTabsTab,
	TlaMenuTabsTabs,
} from '../tla/components/tla-menu/tla-menu'
import '../tla/styles/tla.css'
import { Specimen, SPECIMEN_CSS } from './dev-components-kit'
import { DevComponentsNav } from './dev-components-nav'
import { IsolationProviders } from './dev-editor-harness'

/**
 * Dev-only inventory of the dotcom form controls — the tla-menu settings-control
 * set (Switch / Select / Tabs / Control rows). These are the inputs of the
 * "settings panel" half of the menus story, shown here with their full props
 * and states. All render live under IsolationProviders (dotcom react-intl + a
 * container element + the SDK UI context), no editor needed: Select needs the
 * container for its portal, ControlInfoTooltip needs react-intl for useMsg, the
 * rest need only the SDK UI context.
 *
 * Route: /dev/components/form-controls. Companion to the menus page.
 */

export function Component() {
	return (
		<div
			className="tla tl-container tla-theme-container tla-theme__light tl-theme__light"
			style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'auto' }}
		>
			<Helmet>
				<title>Form controls — dev</title>
			</Helmet>
			<style>{PAGE_CSS + SPECIMEN_CSS}</style>

			<IsolationProviders>
				<div className="page">
					<DevComponentsNav />
					<header className="page__header">
						<h1 className="page__title">Form controls</h1>
						<p className="page__lede">
							The settings-panel controls from <code>tla-menu</code> — Switch, Select, Tabs, and the
							labeled Control row. These live inside the share menu and settings dialogs (the
							&ldquo;panel&rdquo; half of the <a href="/dev/components/menus">menus</a> story),
							shown here with their props and states.
						</p>
					</header>

					<section className="section">
						<h2 className="section__title">TlaMenuSwitch — all states (live)</h2>
						<p className="section__note">
							Props: <code>id · checked · onChange · disabled</code>. A native <code>checkbox</code>{' '}
							with <code>role="switch"</code>, styled.
						</p>
						<div className="grid">
							<Specimen
								label="checked"
								code={`checked`}
								meta="role=switch"
								source="tla-menu.tsx:243"
							>
								<TlaMenuSwitch id="fc-on" checked onChange={() => {}} />
							</Specimen>
							<Specimen
								label="unchecked"
								code={`checked={false}`}
								meta="role=switch"
								source="tla-menu.tsx:243"
							>
								<TlaMenuSwitch id="fc-off" checked={false} onChange={() => {}} />
							</Specimen>
							<Specimen
								label="disabled"
								code={`disabled`}
								meta="non-interactive"
								source="tla-menu.tsx:243"
							>
								<TlaMenuSwitch id="fc-dis" checked disabled onChange={() => {}} />
							</Specimen>
						</div>
					</section>

					<section className="section">
						<h2 className="section__title">TlaMenuSelect — live</h2>
						<p className="section__note">
							A generic <code>TlaMenuSelect&lt;T&gt;</code> over a Radix Select. Notable: an{' '}
							<code>actions</code> slot for a destructive option below the choices. Rendered live —
							it needs a container element for its portal, which the page&rsquo;s providers supply.
						</p>
						<div className="grid">
							<Specimen
								label="TlaMenuSelect"
								code={`label · value · options[] · onChange`}
								meta="generic <T> · Radix Select · ×4"
								source="tla-menu.tsx:119"
							>
								<TlaMenuSelect
									id="fc-select"
									label="Access"
									value="editor"
									onChange={() => {}}
									options={[
										{ value: 'editor', label: 'Can edit' },
										{ value: 'viewer', label: 'Can view' },
									]}
								/>
							</Specimen>
							<Specimen
								label="with actions"
								code={`actions={[{ label: 'Remove', onSelect }]}`}
								meta="destructive action below options"
								source="tla-menu.tsx:119"
							>
								<TlaMenuSelect
									id="fc-select-actions"
									label="Member"
									value="editor"
									onChange={() => {}}
									options={[
										{ value: 'editor', label: 'Can edit' },
										{ value: 'viewer', label: 'Can view' },
									]}
									actions={[
										{ id: 'remove', label: 'Remove member', onSelect: () => {}, destructive: true },
									]}
								/>
							</Specimen>
						</div>
					</section>

					<section className="section">
						<h2 className="section__title">TlaMenuTabs — Root / Tabs / Tab / Page (live)</h2>
						<p className="section__note">
							ARIA tabs (<code>role=tablist / tab / tabpanel</code>). The share menu&rsquo;s Invite
							/ Export / Publish tabs, rendered with the real components (Invite active).
						</p>
						<div className="grid">
							<Specimen
								label="TlaMenuTabs"
								code={`<Root activeTab><Tabs><Tab id>`}
								meta="role=tablist · Invite active"
								source="tla-menu.tsx:296"
							>
								<TlaMenuTabsRoot activeTab="invite" onTabChange={() => {}}>
									<TlaMenuTabsTabs>
										<TlaMenuTabsTab id="invite">Invite</TlaMenuTabsTab>
										<TlaMenuTabsTab id="export">Export</TlaMenuTabsTab>
										<TlaMenuTabsTab id="publish">Publish</TlaMenuTabsTab>
									</TlaMenuTabsTabs>
								</TlaMenuTabsRoot>
							</Specimen>
						</div>
					</section>

					<section className="section">
						<h2 className="section__title">
							Control rows — Control / Label / InfoTooltip / Detail
						</h2>
						<p className="section__note">
							The layout pieces that hold a control: a label, an optional info tooltip, and detail
							text.
						</p>
						<div className="grid">
							<Specimen
								label="TlaMenuControl"
								code={`<TlaMenuControl>`}
								meta="labeled row · ×10"
								source="tla-menu.tsx:43"
							>
								<TlaMenuControl className="fcWide">
									<TlaMenuControlLabel htmlFor="fc-ctrl">Share this file</TlaMenuControlLabel>
									<TlaMenuSwitch id="fc-ctrl" checked onChange={() => {}} />
								</TlaMenuControl>
							</Specimen>
							<Specimen
								label="TlaMenuControlLabel"
								code={`<TlaMenuControlLabel>`}
								meta="control label · ×10"
								source="tla-menu.tsx:96"
							>
								<TlaMenuControlLabel htmlFor="fc-lbl">Label text</TlaMenuControlLabel>
							</Specimen>
							<Specimen
								label="TlaMenuControlInfoTooltip"
								code={`<TlaMenuControlInfoTooltip>`}
								meta="info icon · tooltip on hover"
								source="tla-menu.tsx:60"
							>
								<TlaMenuControlInfoTooltip>
									More information about this setting
								</TlaMenuControlInfoTooltip>
							</Specimen>
							<Specimen
								label="TlaMenuDetail"
								code={`<TlaMenuDetail>`}
								meta="detail text · ×1"
								source="tla-menu.tsx:111"
							>
								<TlaMenuDetail>Supporting detail copy</TlaMenuDetail>
							</Specimen>
						</div>
					</section>
				</div>
			</IsolationProviders>
		</div>
	)
}

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
.page__lede code, .section__note code, .page__footer code { font-family: ui-monospace, monospace; font-size: 0.92em; background: var(--tl-color-low); padding: 1px 4px; border-radius: 3px; }
.page__lede a, .page__footer a { color: var(--tl-color-primary); }
.section { margin-bottom: 48px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 760px; }
.fcWide { width: 100%; }
.ctrlMock { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border: 1px solid var(--tla-color-secondary-border, var(--tl-color-divider)); border-radius: var(--tl-radius-2); background: var(--tl-color-panel); font-size: 12px; }
.tabMock { display: inline-flex; gap: 4px; }
.tabMock span { padding: 4px 10px; border-radius: var(--tl-radius-2); font-size: 12px; color: var(--tl-color-text-3); }
.tabMock span[data-active] { background: var(--tl-color-muted-2); color: var(--tl-color-text); }
.rowMock { padding: 6px 10px; border-radius: var(--tl-radius-2); font-size: 13px; background: var(--tl-color-panel); border: 1px solid var(--tl-color-divider); min-width: 130px; text-align: left; }
.rowMock--wide { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; box-sizing: border-box; }
.page__footer { max-width: 760px; font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); border-top: 1px solid var(--tl-color-divider); padding-top: 20px; }
`
