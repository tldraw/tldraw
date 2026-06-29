/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import {
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
} from 'tldraw'
import 'tldraw/tldraw.css'
import {
	TlaMenuControl,
	TlaMenuControlGroup,
	TlaMenuControlInfoTooltip,
	TlaMenuControlLabel,
	TlaMenuDetail,
	TlaMenuSection,
	TlaMenuSelect,
	TlaMenuSwitch,
	TlaMenuTabsPage,
	TlaMenuTabsRoot,
	TlaMenuTabsTab,
	TlaMenuTabsTabs,
} from '../tla/components/tla-menu/tla-menu'
import '../tla/styles/tla.css'
import { Specimen, SPECIMEN_CSS } from './dev-components-kit'
import { DevComponentsNav } from './dev-components-nav'
import { IsolationProviders, MinimalEditorHarness } from './dev-editor-harness'

/**
 * Dev-only inventory of the dotcom app's two menu systems. This family shows a
 * divergence mode the others don't: INTENTIONAL COEXISTENCE. tla-menu is a
 * settings-panel system; the SDK TldrawUiMenu* is an action-dropdown system.
 * Different UI patterns sharing the word "menu", deliberately separate. Every
 * part of both systems (that the app uses) is shown.
 *
 * Relevant to tldraw/tldraw#9199. Route: /dev/components/menus.
 */

type PartKind = 'switch' | 'select' | 'tab' | 'row' | 'wrap'

const noop = () => {}

/**
 * Every tla-menu part rendered live under the page's IsolationProviders
 * (react-intl + a container element + the SDK UI context). Select needs the
 * container, ControlInfoTooltip needs react-intl, the rest only the UI context —
 * all covered, so none fall back to PartStage. (PartStage still renders the SDK
 * TldrawUiMenu* mock cards, which are shown composed-live above instead.)
 */
const renderLive = (name: string): ReactNode => {
	switch (name) {
		case 'TlaMenuSwitch':
			return <TlaMenuSwitch id="m-switch" checked onChange={noop} />
		case 'TlaMenuControl':
			return (
				<TlaMenuControl className="mWide">
					<TlaMenuControlLabel htmlFor="m-ctrl">Setting</TlaMenuControlLabel>
					<TlaMenuSwitch id="m-ctrl" checked onChange={noop} />
				</TlaMenuControl>
			)
		case 'TlaMenuControlLabel':
			return <TlaMenuControlLabel htmlFor="m-lbl">Label</TlaMenuControlLabel>
		case 'TlaMenuDetail':
			return <TlaMenuDetail>detail copy</TlaMenuDetail>
		case 'TlaMenuControlGroup':
			return (
				<TlaMenuControlGroup>
					<TlaMenuControl className="mWide">
						<TlaMenuControlLabel htmlFor="m-grp">Grouped</TlaMenuControlLabel>
						<TlaMenuSwitch id="m-grp" checked onChange={noop} />
					</TlaMenuControl>
				</TlaMenuControlGroup>
			)
		case 'TlaMenuSection':
			return (
				<TlaMenuSection>
					<TlaMenuControlLabel htmlFor="m-sec">section contents</TlaMenuControlLabel>
				</TlaMenuSection>
			)
		case 'TlaMenuTabsTab':
		case 'TlaMenuTabsTabs':
		case 'TlaMenuTabsRoot':
			return (
				<TlaMenuTabsRoot activeTab="export" onTabChange={noop}>
					<TlaMenuTabsTabs>
						<TlaMenuTabsTab id="export">Export</TlaMenuTabsTab>
						<TlaMenuTabsTab id="publish">Publish</TlaMenuTabsTab>
					</TlaMenuTabsTabs>
				</TlaMenuTabsRoot>
			)
		case 'TlaMenuTabsPage':
			return (
				<TlaMenuTabsRoot activeTab="p" onTabChange={noop}>
					<TlaMenuTabsPage id="p">tab page content</TlaMenuTabsPage>
				</TlaMenuTabsRoot>
			)
		case 'TlaMenuSelect':
			return (
				<TlaMenuSelect
					id="m-select"
					label="Access"
					value="editor"
					onChange={noop}
					options={[
						{ value: 'editor', label: 'Can edit' },
						{ value: 'viewer', label: 'Can view' },
					]}
				/>
			)
		case 'TlaMenuControlInfoTooltip':
			return <TlaMenuControlInfoTooltip>More info about this setting</TlaMenuControlInfoTooltip>
		default:
			return null
	}
}

/**
 * A genuinely real SDK action menu. The TldrawUiMenu* parts can't render
 * individually (each calls useEditor and the 'menu' type emits a Radix
 * DropdownMenu.Item), but composed inside a minimal in-memory <Tldraw> they
 * work. hideUi drops the default chrome; debugOpen forces the dropdown open so
 * the resolved menu shows with no click. Fake content, real function.
 */
const RealActionMenu = (): ReactNode => (
	<MinimalEditorHarness>
		<div className="realMenuAnchor">
			<TldrawUiDropdownMenuRoot id="dev-real-menu" debugOpen>
				<TldrawUiDropdownMenuTrigger>
					<TldrawUiButton type="normal">
						<TldrawUiButtonLabel>Actions</TldrawUiButtonLabel>
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="start">
					<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
						<TldrawUiMenuGroup id="dev-edit">
							<TldrawUiMenuItem id="rename" label="Rename" icon="edit" onSelect={noop} />
							<TldrawUiMenuItem id="duplicate" label="Duplicate" icon="duplicate" onSelect={noop} />
						</TldrawUiMenuGroup>
						<TldrawUiMenuGroup id="dev-view">
							<TldrawUiMenuCheckboxItem id="grid" label="Show grid" checked onSelect={noop} />
							<TldrawUiMenuSubmenu id="export" label="Export as">
								<TldrawUiMenuItem id="png" label="PNG" onSelect={noop} />
								<TldrawUiMenuItem id="svg" label="SVG" onSelect={noop} />
							</TldrawUiMenuSubmenu>
						</TldrawUiMenuGroup>
					</TldrawUiMenuContextProvider>
				</TldrawUiDropdownMenuContent>
			</TldrawUiDropdownMenuRoot>
		</div>
	</MinimalEditorHarness>
)

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

			<IsolationProviders>
				<div className="page">
					<DevComponentsNav />
					<header className="page__header">
						<h1 className="page__title">Menu inventory</h1>
						<p className="page__lede">
							Two systems share the word &ldquo;menu&rdquo; — and that&rsquo;s the point. This
							divergence is <strong>intentional</strong>: <code>tla-menu</code> is a settings-panel
							system, the SDK <code>TldrawUiMenu*</code> is an action-dropdown system. Different
							patterns, deliberately separate.
						</p>
					</header>

					<section className="section">
						<h2 className="section__title">Two systems, one word</h2>
						<p className="section__note">
							A <em>share menu</em> (a panel of settings) and a <em>file menu</em> (a dropdown of
							actions) are different UI patterns that happen to share a noun.
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
						<h2 className="section__title">tla-menu — all {TLA_PARTS.length} parts</h2>
						<p className="section__note">
							The settings-panel system (in <code>tla/components/tla-menu/tla-menu.tsx</code>). All
							parts render live under <code>IsolationProviders</code> (react-intl for{' '}
							<code>useMsg</code>, a container element for <code>useContainer</code>, and the SDK UI
							context) — no editor needed. <code>meta</code> shows the role and dotcom usage count.
						</p>
						<div className="grid">
							{TLA_PARTS.map((p) => {
								const live = renderLive(p.name)
								return (
									<Specimen
										key={p.name}
										label={p.name}
										code={`<${p.name}>`}
										meta={p.meta}
										source="tla-menu.tsx"
										mock={!live}
									>
										{live}
									</Specimen>
								)
							})}
						</div>
					</section>

					<section className="section">
						<h2 className="section__title">A real action menu (live)</h2>
						<p className="section__note">
							The parts below can&rsquo;t render on their own — each calls <code>useEditor</code>{' '}
							and the <code>menu</code> type emits a Radix dropdown item. But composed inside a
							minimal, in-memory <code>&lt;Tldraw&gt;</code> (fake content, real function) they
							work. This is a genuine <code>TldrawUiDropdownMenu</code> forced open with{' '}
							<code>debugOpen</code> — real <code>MenuItem</code> / <code>CheckboxItem</code> /{' '}
							<code>Submenu</code>.
						</p>
						<RealActionMenu />
					</section>

					<section className="section">
						<h2 className="section__title">
							SDK TldrawUiMenu* — {SDK_PARTS.length} parts used in dotcom
						</h2>
						<p className="section__note">
							The same system broken into parts — catalogued as data here, because each only has a
							resolved state <em>composed</em> (a lone menu item must live inside a dropdown). The
							live menu above is these parts, real.
						</p>
						<table className="matrix matrix--wide">
							<thead>
								<tr>
									<th>part</th>
									<th>role · usage</th>
								</tr>
							</thead>
							<tbody>
								{SDK_PARTS.map((p) => (
									<tr key={p.name}>
										<td>{p.name}</td>
										<td>{p.meta}</td>
									</tr>
								))}
							</tbody>
						</table>
					</section>

					<section className="section">
						<h2 className="section__title">Why the split is deliberate</h2>
						<div className="callout">
							These are not two implementations of one thing — they are two different things. A{' '}
							<strong>settings panel</strong> is persistent, inline, and made of labeled controls
							you read and adjust; an <strong>action dropdown</strong> is transient, floating, and
							made of commands you click once. They share the noun &ldquo;menu&rdquo; and nothing
							else. Consolidating them would force a settings form and a command list into one
							abstraction — strictly worse. #9199 was right to exclude this from the sweep:{' '}
							<strong>this is the divergence an audit must learn to leave alone.</strong>
						</div>
					</section>
				</div>
			</IsolationProviders>
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

const TLA_PARTS: ReadonlyArray<{ name: string; kind: PartKind; meta: string; sample?: string }> = [
	{ name: 'TlaMenuSwitch', kind: 'switch', meta: 'control · role=switch · ×8' },
	{ name: 'TlaMenuSelect', kind: 'select', meta: 'control · Radix Select · ×4' },
	{ name: 'TlaMenuTabsTab', kind: 'tab', meta: 'control · role=tab · ×6', sample: 'Export' },
	{
		name: 'TlaMenuControl',
		kind: 'row',
		meta: 'labeled control row · ×10',
		sample: 'Setting       ◉',
	},
	{ name: 'TlaMenuControlLabel', kind: 'row', meta: 'control label · ×10', sample: 'Label' },
	{
		name: 'TlaMenuControlInfoTooltip',
		kind: 'row',
		meta: 'info tooltip · ×4',
		sample: 'ⓘ  more info',
	},
	{ name: 'TlaMenuDetail', kind: 'row', meta: 'detail text · ×1', sample: 'detail copy' },
	{ name: 'TlaMenuSection', kind: 'wrap', meta: 'layout wrapper · ×4', sample: 'section' },
	{
		name: 'TlaMenuControlGroup',
		kind: 'wrap',
		meta: 'layout wrapper · ×4',
		sample: 'control group',
	},
	{ name: 'TlaMenuTabsRoot', kind: 'wrap', meta: 'tabs root · ×2', sample: 'tabs root' },
	{ name: 'TlaMenuTabsTabs', kind: 'wrap', meta: 'role=tablist · ×2', sample: 'tablist' },
	{ name: 'TlaMenuTabsPage', kind: 'wrap', meta: 'role=tabpanel · ×7', sample: 'tabpanel' },
]

const SDK_PARTS: ReadonlyArray<{ name: string; kind: PartKind; meta: string; sample?: string }> = [
	{ name: 'TldrawUiMenuItem', kind: 'row', meta: 'action item · ×16', sample: 'Rename' },
	{
		name: 'TldrawUiMenuCheckboxItem',
		kind: 'row',
		meta: 'toggle item · ×4',
		sample: '✓ Show grid',
	},
	{ name: 'TldrawUiMenuSubmenu', kind: 'row', meta: 'nested menu · ×6', sample: 'Export as ›' },
	{
		name: 'TldrawUiMenuActionItem',
		kind: 'row',
		meta: 'bound to an action · ×3',
		sample: 'Undo   ⌘Z',
	},
	{ name: 'TldrawUiMenuGroup', kind: 'wrap', meta: 'item group · ×20', sample: 'group' },
	{
		name: 'TldrawUiMenuContextProvider',
		kind: 'wrap',
		meta: 'menu schema root · ×4',
		sample: 'context provider',
	},
	{
		name: 'TldrawUiDropdownMenuRoot',
		kind: 'wrap',
		meta: 'Radix shell · ×3',
		sample: 'dropdown root',
	},
	{
		name: 'TldrawUiDropdownMenuTrigger',
		kind: 'wrap',
		meta: 'Radix shell · ×3',
		sample: 'trigger',
	},
	{
		name: 'TldrawUiDropdownMenuContent',
		kind: 'wrap',
		meta: 'Radix shell · ×3',
		sample: 'content',
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
.page__lede strong, .callout strong { color: var(--tl-color-text-0); font-weight: 600; }
.section { margin-bottom: 48px; }
.section__title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.section__note { font-size: 13px; line-height: 1.6; color: var(--tl-color-text-1); margin: 0 0 16px; max-width: 760px; }
.section code, .callout code, .page__footer code, .section__note code, .page__lede code { font-family: ui-monospace, monospace; font-size: 0.92em; background: var(--tl-color-low); padding: 1px 4px; border-radius: 3px; }
.mWide { width: 100%; }
.realMenuStage { position: relative; height: 380px; max-width: 640px; border: 1px solid var(--tl-color-divider); border-radius: 8px; overflow: hidden; }
.realMenuAnchor { position: absolute; top: 20px; left: 20px; z-index: 100; }
.ctrlMock { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border: 1px solid var(--tla-color-secondary-border, var(--tl-color-divider)); border-radius: var(--tl-radius-2); background: var(--tl-color-panel); font-size: 12px; }
.tabMock { display: inline-flex; gap: 4px; }
.tabMock span { padding: 4px 10px; border-radius: var(--tl-radius-2); font-size: 12px; color: var(--tl-color-text-3); }
.tabMock span[data-active] { background: var(--tl-color-muted-2); color: var(--tl-color-text); }
.rowMock { padding: 6px 10px; border-radius: var(--tl-radius-2); font-size: 13px; background: var(--tl-color-panel); border: 1px solid var(--tl-color-divider); min-width: 130px; text-align: left; }
.wrapMock { font-size: 11px; font-family: ui-monospace, monospace; color: var(--tl-color-text-3); border: 1px dashed var(--tl-color-divider); border-radius: 5px; padding: 8px 12px; }
.matrix { border-collapse: collapse; font-size: 12px; font-family: ui-monospace, monospace; }
.matrix th, .matrix td { text-align: left; padding: 6px 18px 6px 0; border-bottom: 1px solid var(--tl-color-divider); vertical-align: top; }
.matrix th { color: var(--tl-color-text-3); font-weight: 500; }
.matrix--wide td, .matrix--wide th { padding-right: 28px; max-width: 340px; }
.matrix .rowhead { color: var(--tl-color-text-3); }
.callout { font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); background: var(--tl-color-low); border: 1px solid var(--tl-color-divider); border-radius: 8px; padding: 16px 18px; max-width: 840px; }
.page__footer { max-width: 760px; font-size: 13px; line-height: 1.7; color: var(--tl-color-text-1); border-top: 1px solid var(--tl-color-divider); padding-top: 20px; }
`
