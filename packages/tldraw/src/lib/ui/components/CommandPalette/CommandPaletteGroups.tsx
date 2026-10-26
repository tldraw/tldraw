import { defineMessages, PageRecordType, useEditor, useValue } from '@tldraw/editor'
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
import { CommandPalettePromptItem } from './CommandPalettePromptItem'

const messages = defineMessages({
	selection: { id: 'command-palette.selection', defaultMessage: 'Selection' },
	arrange: { id: 'context-menu.arrange', defaultMessage: 'Arrange' },
	edit: { id: 'menu.edit', defaultMessage: 'Edit' },
	view: { id: 'menu.view', defaultMessage: 'View' },
	pages: { id: 'page-menu.title', defaultMessage: 'Pages' },
	goToPage: { id: 'command-palette.go-to-page', defaultMessage: 'Go to page' },
	newPage: { id: 'context.pages.new-page', defaultMessage: 'New page' },
	maxPagesReached: { id: 'page-menu.max-pages-reached', defaultMessage: 'Maximum pages reached' },
	newPageInitialName: { id: 'page-menu.new-page-initial-name', defaultMessage: 'Page 1' },
	renamePage: { id: 'command-palette.rename-page', defaultMessage: 'Rename page' },
	pageName: { id: 'command-palette.page-name', defaultMessage: 'Page name' },
	duplicatePage: { id: 'command-palette.duplicate-page', defaultMessage: 'Duplicate page' },
	deletePage: { id: 'command-palette.delete-page', defaultMessage: 'Delete page' },
	onlyPage: { id: 'command-palette.reason.only-page', defaultMessage: 'This is the only page' },
	moveToPage: { id: 'context-menu.move-to-page', defaultMessage: 'Move to page' },
	export: { id: 'command-palette.export', defaultMessage: 'Export' },
	tools: { id: 'command-palette.tools', defaultMessage: 'Tools' },
	preferences: { id: 'menu.preferences', defaultMessage: 'Preferences' },
	accessibility: { id: 'menu.accessibility', defaultMessage: 'Accessibility' },
	help: { id: 'help-menu.title', defaultMessage: 'Help and resources' },
})

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
	return <CommandPaletteActionGroup group="selection" label={messages.selection.id} />
}

/** @public @react */
export function CommandPaletteArrangeGroup() {
	return <CommandPaletteActionGroup group="arrange" label={messages.arrange.id} />
}

/** @public @react */
export function CommandPaletteEditGroup() {
	return <CommandPaletteActionGroup group="edit" label={messages.edit.id} />
}

/** @public @react */
export function CommandPaletteViewGroup() {
	return (
		<TldrawUiMenuGroup id="command-palette-view" label={messages.view.id}>
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
	const currentPageName = useValue('current page name', () => editor.getCurrentPage().name, [
		editor,
	])
	const { maxPages } = editor.options
	if (maxPages <= 1) return null

	return (
		<TldrawUiMenuGroup id="command-palette-pages" label={messages.pages.id}>
			<TldrawUiMenuSubmenu id="go-to-page" label={messages.goToPage.id}>
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
					label={messages.newPage.id}
					disabled={pages.length >= maxPages}
					disabledReason={messages.maxPagesReached.id}
					onSelect={(source) => {
						const id = PageRecordType.createId()
						editor.run(() => {
							editor.markHistoryStoppingPoint('creating page')
							editor.createPage({ name: msg(messages.newPageInitialName), id })
							editor.setCurrentPage(id)
						})
						trackEvent('new-page', { source })
					}}
				/>
			)}
			{!isReadonly && (
				<>
					<CommandPalettePromptItem
						id="rename-page"
						label={msg(messages.renamePage)}
						placeholder={msg(messages.pageName)}
						initialValue={currentPageName}
						onSubmit={(name) => {
							if (!name || name === currentPageName) return
							editor.markHistoryStoppingPoint('rename page')
							editor.renamePage(currentPageId, name)
							trackEvent('rename-page', { source: 'command-palette' })
						}}
					/>
					<TldrawUiMenuItem
						id="duplicate-page"
						label={messages.duplicatePage.id}
						disabled={pages.length >= maxPages}
						disabledReason={messages.maxPagesReached.id}
						onSelect={(source) => {
							editor.markHistoryStoppingPoint('creating page')
							editor.duplicatePage(currentPageId, PageRecordType.createId())
							trackEvent('duplicate-page', { source })
						}}
					/>
					<TldrawUiMenuItem
						id="delete-page"
						label={messages.deletePage.id}
						disabled={pages.length <= 1}
						disabledReason={messages.onlyPage.id}
						onSelect={(source) => {
							editor.markHistoryStoppingPoint('deleting page')
							editor.deletePage(currentPageId)
							trackEvent('delete-page', { source })
						}}
					/>
				</>
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
		<TldrawUiMenuSubmenu id="move-to-page" label={messages.moveToPage.id}>
			<TldrawUiMenuActionItem actionId="move-to-new-page" />
		</TldrawUiMenuSubmenu>
	)
}

/** @public @react */
export function CommandPaletteExportGroup() {
	return <CommandPaletteActionGroup group="export" label={messages.export.id} />
}

// Covered by the insert media and insert embed actions.
const EXCLUDED_TOOLS = new Set(['asset', 'embed'])

/** @public @react */
export function CommandPaletteToolsGroup() {
	const editor = useEditor()
	const tools = useTools()
	const currentToolId = useValue('current tool', () => editor.getCurrentToolId(), [editor])
	return (
		<TldrawUiMenuGroup id="command-palette-tools" label={messages.tools.id}>
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
		<TldrawUiMenuGroup id="command-palette-preferences" label={messages.preferences.id}>
			<CommandPaletteActionGroup group="preferences" />
			<TldrawUiMenuSubmenu id="accessibility" label={messages.accessibility.id}>
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
		<TldrawUiMenuGroup id="command-palette-help" label={messages.help.id}>
			<KeyboardShortcutsMenuItem />
			<CommandPaletteActionGroup group="help" />
		</TldrawUiMenuGroup>
	)
}
