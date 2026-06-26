/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import 'tldraw/tldraw.css'
import { TlaMenuSwitch } from '../tla/components/tla-menu/tla-menu'
import '../tla/styles/tla.css'
import { DevComponentsNav } from './dev-components-nav'
import { Specimen, SPECIMEN_CSS } from './dev-components-kit'

/**
 * Dev-only inventory of the dotcom app's two menu systems. This family shows a
 * divergence mode the others don't: INTENTIONAL COEXISTENCE. The word "menu" is
 * overloaded — `tla-menu` is a settings-panel system (labeled Select/Switch/Tabs
 * controls), the SDK `TldrawUiMenu*` is an action-dropdown system (command
 * menus). They are different UI patterns, so two systems is correct, not drift.
 *
 * Relevant to tldraw/tldraw#9199, which explicitly excluded "consolidate the
 * menus" from the sweep. Route: /dev/components/menus.
 */

export function Component() {
	return (
		<div
			className="tla tl-container tla-theme-container tla-theme__light tl-theme__light"
			style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'auto' }}
		>
			<Helmet>
				<title>Menu inventory — dev</title>
			</Helmet>
			<style>{PAGE_CSS + SPECIMEN_CSS}</style>

			<div className="page">
				<DevComponentsNav />
				<header className="page__header">
					<h1 className="page__title">Menu inventory</h1>
					<p className="page__lede">
						Two systems share the word &ldquo;menu&rdquo; — and that&rsquo;s the point. Unlike the
						other families, this divergence is <strong>intentional</strong>:{' '}
						<code>tla-menu</code> is a settings-panel system, the SDK <code>TldrawUiMenu*</code> is an
						action-dropdown system. Different patterns, deliberately separate.
					</p>
				</header>

				<section className="section">
					<h2 className="section__title">Two systems, one word</h2>
					<p className="section__note">
						The names collide on &ldquo;menu&rdquo;, but a <em>share menu</em> (a panel of settings)
						and a <em>file menu</em> (a dropdown of actions) are different UI patterns.
					</p>
					<table className="matrix matrix--wide">
						<thead>
							<tr>
								<th></th>
								<th>tla-menu (settings panels)</th>
								<th>SDK TldrawUiMenu* (action dropdowns)</th>
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
					<h2 className="section__title">Overview</h2>
					<p className="section__note">
						Each system's controls and items, with their props — tla-menu controls live, SDK items as
						mocks (they need the editor's menu context to render).
					</p>
					<div className="grid">
						<Specimen
							label="TlaMenuSwitch"
							code={`<TlaMenuSwitch checked>`}
							meta="tla-menu · role=switch"
							source="tla-menu.tsx"
						>
							<TlaMenuSwitch id="ov-on" checked onChange={() => {}} />
						</Specimen>
						<Specimen
							label="TlaMenuSwitch"
							code={`<TlaMenuSwitch checked={false}>`}
							meta="tla-menu · role=switch"
							source="tla-menu.tsx"
						>
							<TlaMenuSwitch id="ov-off" checked={false} onChange={() => {}} />
						</Specimen>
						<Specimen
							label="TlaMenuSelect"
							code={`<TlaMenuSelect options={…} />`}
							meta="tla-menu · Radix Select"
							source="tla-menu.tsx"
						>
							<div className="ctrlMock">Everyone ▾</div>
						</Specimen>
						<Specimen
							label="TlaMenuTabs"
							code={`<TlaMenuTabsRoot>…`}
							meta="tla-menu · role=tablist"
							source="tla-menu.tsx"
						>
							<div className="tabMock">
								<span data-active>Export</span>
								<span>Publish</span>
							</div>
						</Specimen>
						<Specimen
							label="TldrawUiMenuItem"
							code={`<TldrawUiMenuItem>`}
							meta="SDK · action item"
							source="tldraw"
						>
							<div className="rowMock">Rename</div>
						</Specimen>
						<Specimen
							label="TldrawUiMenuCheckboxItem"
							code={`<TldrawUiMenuCheckboxItem>`}
							meta="SDK · toggle item"
							source="tldraw"
						>
							<div className="rowMock">✓ Show grid</div>
						</Specimen>
						<Specimen
							label="TldrawUiMenuSubmenu"
							code={`<TldrawUiMenuSubmenu>`}
							meta="SDK · nested"
							source="tldraw"
						>
							<div className="rowMock">Export as ›</div>
						</Specimen>
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">tla-menu — settings panel system</h2>
					<p className="section__note">
						Declarative labeled controls inside a panel. Parts in{' '}
						<code>tla/components/tla-menu/tla-menu.tsx</code>. Switch shown live:
					</p>
					<div className="demoRow">
						<div className="demoRow__control">
							<TlaMenuSwitch id="demo-on" checked onChange={() => {}} />
							<span>checked</span>
						</div>
						<div className="demoRow__control">
							<TlaMenuSwitch id="demo-off" checked={false} onChange={() => {}} />
							<span>unchecked</span>
						</div>
					</div>
					<div className="section__api">
						<div>
							<span className="k">layout</span>
							TlaMenuSection, TlaMenuControlGroup, TlaMenuControl, TlaMenuControlLabel,
							TlaMenuDetail, TlaMenuControlInfoTooltip
						</div>
						<div>
							<span className="k">controls</span>
							TlaMenuSelect (Radix Select), TlaMenuSwitch (role=switch), TlaMenuTabs Root / Tabs /
							Tab / Page (role=tablist / tab / tabpanel)
						</div>
						<div>
							<span className="k">used in</span>
							TlaFileShareMenu (+ Publish / Invite / Export / AnonCopyLink tabs),
							WorkspaceSettingsDialog, TlaManageCookiesDialog, TlaLegalAcceptance
						</div>
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">SDK TldrawUiMenu* — action dropdown system</h2>
					<p className="section__note">
						A declarative menu schema (groups + items) rendered into a Radix dropdown. Mock below
						(it needs the editor&rsquo;s menu context to render live).
					</p>
					<div className="menuMock">
						<div className="menuMock__item">Rename</div>
						<div className="menuMock__item">Duplicate</div>
						<div className="menuMock__item">Copy link</div>
						<div className="menuMock__sep" />
						<div className="menuMock__item menuMock__danger">Delete</div>
					</div>
					<div className="section__api">
						<div>
							<span className="k">schema</span>
							TldrawUiMenuContextProvider, TldrawUiMenuGroup, TldrawUiMenuItem,
							TldrawUiMenuSubmenu, TldrawUiMenuCheckboxItem, TldrawUiMenuActionItem
						</div>
						<div>
							<span className="k">shell</span>
							TldrawUiDropdownMenuRoot / Trigger / Content / Item / Sub / SubTrigger / SubContent
							(Radix)
						</div>
						<div>
							<span className="k">used in</span>
							TlaFileMenu, TlaSidebarUserSettingsMenu, menu-items.tsx, TlaEditor context menus,
							local-file
						</div>
					</div>
				</section>

				<section className="section">
					<h2 className="section__title">Why the split is deliberate</h2>
					<div className="callout">
						These are not two implementations of one thing — they are two different things. A{' '}
						<strong>settings panel</strong> is persistent, inline, and made of labeled controls you
						read and adjust; an <strong>action dropdown</strong> is transient, floating, and made of
						commands you click once. They share the noun &ldquo;menu&rdquo; and nothing else.
						Consolidating them would force a settings form and a command list into one abstraction —
						strictly worse. #9199 was right to exclude this from the sweep:{' '}
						<strong>this is the divergence an audit must learn to leave alone.</strong>
					</div>
				</section>

				<footer className="page__footer">
					The lesson this page adds to the gallery: not all divergence is drift. Buttons, inputs, and
					type each hide a problem to fix; the two menu systems are a boundary to <em>respect</em>.
					Telling the two apart — accidental inconsistency vs deliberate design — is the whole skill
					of a design-system audit. See tldraw/tldraw#9199.
				</footer>
			</div>
		</div>
	)
}

const SYSTEMS: ReadonlyArray<readonly [string, string, string]> = [
	['purpose', 'persistent labeled controls in a panel', 'transient dropdown of one-shot commands'],
	['pattern', 'a form inside a panel', 'a declarative menu schema → Radix dropdown'],
	['controls', 'Select · Switch · Tabs', 'Item · CheckboxItem · Submenu · ActionItem'],
	['ARIA', 'role=switch / tab / tablist / tabpanel', 'role=menu / menuitem (Radix)'],
	['where', 'share menu, settings & cookies dialogs', 'file menu, user menu, context menus'],
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
.page__lede strong, .callout strong { color: var(--tl-color-text-0); font-weight: 600; }
.section { margin-bottom: 48px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 760px; }
.section code, .callout code, .page__footer code, .section__note code, .page__lede code { font-family: ui-monospace, monospace; font-size: 0.92em; background: var(--tl-color-low); padding: 1px 4px; border-radius: 3px; }
.demoRow { display: flex; gap: 32px; margin-bottom: 20px; padding: 18px; background: var(--tl-color-low); border-radius: 8px; }
.demoRow__control { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--tl-color-text-1); }
.menuMock { display: inline-block; min-width: 180px; padding: 6px; border: 1px solid var(--tl-color-divider); border-radius: var(--tl-radius-3); background: var(--tl-color-panel); box-shadow: 0 6px 24px rgba(0,0,0,0.12); margin-bottom: 20px; }
.menuMock__item { padding: 7px 10px; border-radius: var(--tl-radius-2); font-size: 13px; cursor: default; }
.menuMock__item:hover { background: var(--tl-color-muted-2); }
.menuMock__danger { color: var(--tl-color-warning, #cb4b16); }
.menuMock__sep { height: 1px; background: var(--tl-color-divider); margin: 6px 4px; }
.ctrlMock { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border: 1px solid var(--tla-color-secondary-border, var(--tl-color-divider)); border-radius: var(--tl-radius-2); background: var(--tl-color-panel); font-size: 12px; }
.tabMock { display: inline-flex; gap: 4px; }
.tabMock span { padding: 4px 10px; border-radius: var(--tl-radius-2); font-size: 12px; color: var(--tl-color-text-3); }
.tabMock span[data-active] { background: var(--tl-color-muted-2); color: var(--tl-color-text); }
.rowMock { padding: 6px 10px; border-radius: var(--tl-radius-2); font-size: 13px; background: var(--tl-color-panel); border: 1px solid var(--tl-color-divider); min-width: 130px; text-align: left; }
.section__api { font-size: 11px; font-family: ui-monospace, monospace; line-height: 1.6; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 6px; padding: 10px 12px; max-width: 880px; }
.section__api > div { display: flex; gap: 8px; }
.section__api > div + div { margin-top: 4px; }
.section__api .k { color: var(--tl-color-text-3); flex: 0 0 70px; }
.matrix { border-collapse: collapse; font-size: 12px; font-family: ui-monospace, monospace; }
.matrix th, .matrix td { text-align: left; padding: 6px 18px 6px 0; border-bottom: 1px solid var(--tl-color-divider); vertical-align: top; }
.matrix th { color: var(--tl-color-text-3); font-weight: 500; }
.matrix--wide td, .matrix--wide th { padding-right: 28px; max-width: 340px; }
.matrix .rowhead { color: var(--tl-color-text-3); }
.callout { font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 18px; max-width: 840px; }
.page__footer { max-width: 760px; font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); border-top: 1px solid var(--tl-color-divider); padding-top: 20px; }
`
