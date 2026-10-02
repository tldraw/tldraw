import { PageRecordType, useEditor, useValue } from '@tldraw/editor'
import { useActions } from '../../context/actions'
import { useUiEvents } from '../../context/events'
import { useReadonly } from '../../hooks/useReadonly'
import { useTools } from '../../hooks/useTools'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { ColorSchemeMenu } from '../ColorSchemeMenu'
import { KeyboardShortcutsMenuItem } from '../HelpMenu/DefaultHelpMenuContent'
import { InputModeMenu } from '../InputModeMenu'
import { LanguageMenu } from '../LanguageMenu'
import { MoveToPageMenu } from '../menu-items'
import { TldrawUiMenuActionCheckboxItem } from '../primitives/menus/TldrawUiMenuActionCheckboxItem'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'
import { TldrawUiMenuGroup } from '../primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'
import { TldrawUiMenuSubmenu } from '../primitives/menus/TldrawUiMenuSubmenu'
import { TldrawUiMenuToolItem } from '../primitives/menus/TldrawUiMenuToolItem'

/** @public */
export interface TLUiCommandPaletteActionGroupProps {
	/**
	 * Lists the actions whose `commandPalette.group` is this. Without it, the group is the
	 * catch-all: every action not opted out with `commandPalette: false`.
	 */
	group?: string
	/** Searched along with each item's own label. */
	label?: string
}

/**
 * Lists actions in the command palette, in the order they're defined. An action shows once,
 * wherever it's placed first, so a catch-all group at the end only adds the actions nothing
 * earlier listed.
 *
 * @public @react
 */
export function CommandPaletteActionGroup({ group, label }: TLUiCommandPaletteActionGroupProps) {
	const actions = useActions()
	return (
		<TldrawUiMenuGroup id={`command-palette-actions-${group ?? 'all'}`} label={label}>
			{Object.values(actions)
				.filter(({ commandPalette }) =>
					group === undefined
						? commandPalette !== false
						: commandPalette && commandPalette.group === group
				)
				.map((action) =>
					action.checkbox || action.isChecked ? (
						<TldrawUiMenuActionCheckboxItem key={action.id} actionId={action.id} />
					) : (
						<TldrawUiMenuActionItem key={action.id} actionId={action.id} />
					)
				)}
		</TldrawUiMenuGroup>
	)
}

/** @public @react */
export function CommandPaletteSelectionGroup() {
	return <CommandPaletteActionGroup group="selection" label="command-palette.selection" />
}

/** @public @react */
export function CommandPaletteArrangeGroup() {
	return <CommandPaletteActionGroup group="arrange" label="context-menu.arrange" />
}

/** @public @react */
export function CommandPaletteEditGroup() {
	return <CommandPaletteActionGroup group="edit" label="menu.edit" />
}

/** @public @react */
export function CommandPaletteViewGroup() {
	return (
		<TldrawUiMenuGroup id="command-palette-view" label="menu.view">
			<CommandPaletteActionGroup group="view" />
			<ColorSchemeMenu />
		</TldrawUiMenuGroup>
	)
}

/** @public @react */
export function CommandPalettePagesGroup() {
	const editor = useEditor()
	const msg = useTranslation()
	const trackEvent = useUiEvents()
	const isReadonly = useReadonly()
	const pages = useValue('pages', () => editor.getPages(), [editor])
	const currentPageId = useValue('current page id', () => editor.getCurrentPageId(), [editor])
	const { maxPages } = editor.options
	if (maxPages <= 1) return null

	return (
		<TldrawUiMenuGroup id="command-palette-pages" label="page-menu.title">
			<TldrawUiMenuSubmenu id="go-to-page" label="command-palette.go-to-page">
				{pages
					.filter((page) => page.id !== currentPageId)
					.map((page) => (
						<TldrawUiMenuItem
							key={page.id}
							id={`go-to-${page.id}`}
							label={page.name}
							readonlyOk
							onSelect={(source) => {
								editor.markHistoryStoppingPoint('change-page')
								editor.setCurrentPage(page.id)
								trackEvent('change-page', { source })
							}}
						/>
					))}
			</TldrawUiMenuSubmenu>
			{!isReadonly && (
				<TldrawUiMenuItem
					id="new-page"
					label="context.pages.new-page"
					disabled={pages.length >= maxPages}
					disabledReason="page-menu.max-pages-reached"
					onSelect={(source) => {
						const id = PageRecordType.createId()
						editor.run(() => {
							editor.markHistoryStoppingPoint('creating page')
							editor.createPage({ name: msg('page-menu.new-page-initial-name'), id })
							editor.setCurrentPage(id)
						})
						trackEvent('new-page', { source })
					}}
				/>
			)}
			<MoveToPageItems />
		</TldrawUiMenuGroup>
	)
}

// The menu's Move to page renders nothing without a selection, so the palette lists its new page
// item on its own to say why.
function MoveToPageItems() {
	const editor = useEditor()
	const hasSelection = useValue('has selection', () => editor.getSelectedShapeIds().length > 0, [
		editor,
	])
	if (hasSelection) return <MoveToPageMenu />
	return (
		<TldrawUiMenuSubmenu id="move-to-page" label="context-menu.move-to-page">
			<TldrawUiMenuActionItem actionId="move-to-new-page" />
		</TldrawUiMenuSubmenu>
	)
}

/** @public @react */
export function CommandPaletteExportGroup() {
	return <CommandPaletteActionGroup group="export" label="command-palette.export" />
}

// Covered by the insert media and insert embed actions.
const EXCLUDED_TOOLS = new Set(['asset', 'embed'])

/** @public @react */
export function CommandPaletteToolsGroup() {
	const editor = useEditor()
	const tools = useTools()
	const currentToolId = useValue('current tool', () => editor.getCurrentToolId(), [editor])
	return (
		<TldrawUiMenuGroup id="command-palette-tools" label="command-palette.tools">
			{Object.values(tools)
				.filter((tool) => !EXCLUDED_TOOLS.has(tool.id) && tool.id !== currentToolId)
				.map((tool) => (
					<TldrawUiMenuToolItem key={tool.id} toolId={tool.id} />
				))}
		</TldrawUiMenuGroup>
	)
}

/** @public @react */
export function CommandPalettePreferencesGroup() {
	return (
		<TldrawUiMenuGroup id="command-palette-preferences" label="menu.preferences">
			<CommandPaletteActionGroup group="preferences" />
			<TldrawUiMenuSubmenu id="accessibility" label="menu.accessibility">
				<CommandPaletteActionGroup group="accessibility" />
			</TldrawUiMenuSubmenu>
			<InputModeMenu />
			<LanguageMenu />
		</TldrawUiMenuGroup>
	)
}

/** @public @react */
export function CommandPaletteHelpGroup() {
	return (
		<TldrawUiMenuGroup id="command-palette-help" label="help-menu.title">
			<KeyboardShortcutsMenuItem />
			<CommandPaletteActionGroup group="help" />
		</TldrawUiMenuGroup>
	)
}
