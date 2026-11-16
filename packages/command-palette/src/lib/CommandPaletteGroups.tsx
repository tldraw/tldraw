import {
	defineMessages,
	PageRecordType,
	useEditor,
	useValue,
	useActions,
	useUiEvents,
	useCommentingEnabled,
	useReadonly,
	useTools,
	useTranslation,
	ColorSchemeMenu,
	KeyboardShortcutsMenuItem,
	InputModeMenu,
	LanguageMenu,
	MoveToPageMenu,
	TldrawUiMenuActionCheckboxItem,
	TldrawUiMenuActionItem,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	TldrawUiMenuToolItem,
} from 'tldraw'
import { useCommandPaletteActionGroups } from './commandPaletteActionGroups'
import { CommandPalettePromptItem } from './CommandPalettePromptItem'

const messages = defineMessages({
	selection: { id: 'command-palette.selection', defaultMessage: 'Selection' },
	arrange: { id: 'context-menu.arrange', defaultMessage: 'Arrange' },
	edit: { id: 'menu.edit', defaultMessage: 'Edit' },
	view: { id: 'menu.view', defaultMessage: 'View' },
	pages: { id: 'command-palette.pages', defaultMessage: 'Pages' },
	goToPage: { id: 'command-palette.go-to-page', defaultMessage: 'Go to page' },
	newPage: { id: 'context.pages.new-page', defaultMessage: 'New page' },
	newPageInitialName: { id: 'page-menu.new-page-initial-name', defaultMessage: 'Page 1' },
	renamePage: { id: 'command-palette.rename-page', defaultMessage: 'Rename page' },
	pageName: { id: 'command-palette.page-name', defaultMessage: 'Page name' },
	duplicatePage: { id: 'command-palette.duplicate-page', defaultMessage: 'Duplicate page' },
	deletePage: { id: 'command-palette.delete-page', defaultMessage: 'Delete page' },
	export: { id: 'command-palette.export', defaultMessage: 'Export' },
	tools: { id: 'command-palette.tools', defaultMessage: 'Tools' },
	preferences: { id: 'menu.preferences', defaultMessage: 'Preferences' },
	accessibility: { id: 'menu.accessibility', defaultMessage: 'Accessibility' },
	help: { id: 'help-menu.title', defaultMessage: 'Help and resources' },
})

/** @public */
export interface TLUiCommandPaletteActionGroupProps {
	/**
	 * Lists the actions that the palette's `actionGroups` put in this group. Without it, the group
	 * is the catch-all: every action not left out with `false`, wherever it's grouped.
	 */
	group?: string
	/**
	 * The group's heading, a translation key or plain text, also searched along with each item's
	 * label. An enclosing group's label heads it instead. Without one, its items take the enclosing
	 * group's heading, if any.
	 */
	label?: string
}

/**
 * Lists actions in the command palette, in the order they're defined. An action shows once,
 * wherever it's placed first, so a catch-all group at the end only adds the actions nothing
 * earlier listed. Needs an editor.
 *
 * @public @react
 */
export function CommandPaletteActionGroup({ group, label }: TLUiCommandPaletteActionGroupProps) {
	const actions = useActions()
	const actionGroups = useCommandPaletteActionGroups()
	return (
		<TldrawUiMenuGroup id={`command-palette-actions-${group ?? 'all'}`} label={label}>
			{Object.values(actions)
				.filter(({ id }) =>
					group === undefined ? actionGroups[id] !== false : actionGroups[id] === group
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

/**
 * Commands on the selection, such as delete, duplicate, group and lock, while shapes are
 * selected. Needs an editor.
 *
 * @public @react
 */
export function CommandPaletteSelectionGroup() {
	return <CommandPaletteActionGroup group="selection" label={messages.selection.id} />
}

/**
 * Align, distribute, stack, reorder, flip and rotate commands, while shapes are selected.
 * Needs an editor.
 *
 * @public @react
 */
export function CommandPaletteArrangeGroup() {
	return <CommandPaletteActionGroup group="arrange" label={messages.arrange.id} />
}

/**
 * Undo, redo, paste, select all, unlock all, and insert media or embed. Needs an editor.
 *
 * @public @react
 */
export function CommandPaletteEditGroup() {
	return <CommandPaletteActionGroup group="edit" label={messages.edit.id} />
}

/**
 * Zoom, grid, focus mode and minimap toggles, and the color scheme submenu. Needs an editor.
 *
 * @public @react
 */
export function CommandPaletteViewGroup() {
	return (
		<TldrawUiMenuGroup id="command-palette-view" label={messages.view.id}>
			<CommandPaletteActionGroup group="view" />
			<ColorSchemeMenu />
		</TldrawUiMenuGroup>
	)
}

/**
 * Go to page, new page, rename, duplicate or delete the current page, and move the selection to
 * another page. Renders nothing when `maxPages` is 1; read-only users only get go to page.
 * Needs an editor.
 *
 * @public @react
 */
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
						label={messages.renamePage.id}
						placeholder={messages.pageName.id}
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
						onSelect={(source) => {
							editor.markHistoryStoppingPoint('deleting page')
							editor.deletePage(currentPageId)
							trackEvent('delete-page', { source })
						}}
					/>
				</>
			)}
			<MoveToPageMenu />
		</TldrawUiMenuGroup>
	)
}

/**
 * Export as SVG or PNG, copy as SVG, PNG or JSON, the transparent background toggle, and print.
 * Needs an editor.
 *
 * @public @react
 */
export function CommandPaletteExportGroup() {
	return <CommandPaletteActionGroup group="export" label={messages.export.id} />
}

// Covered by the insert media and insert embed actions.
const EXCLUDED_TOOLS = new Set(['asset', 'embed'])

/**
 * One item per tool, except the current one, the media and embed tools, which the edit group
 * covers, and the comment tool while commenting is off. Needs an editor.
 *
 * @public @react
 */
export function CommandPaletteToolsGroup() {
	const editor = useEditor()
	const tools = useTools()
	const currentToolId = useValue('current tool', () => editor.getCurrentToolId(), [editor])
	const commentingEnabled = useCommentingEnabled()
	return (
		<TldrawUiMenuGroup id="command-palette-tools" label={messages.tools.id}>
			{Object.values(tools)
				.filter(
					(tool) =>
						!EXCLUDED_TOOLS.has(tool.id) &&
						tool.id !== currentToolId &&
						(tool.id !== 'comment' || commentingEnabled)
				)
				.map((tool) => (
					<TldrawUiMenuToolItem key={tool.id} toolId={tool.id} />
				))}
		</TldrawUiMenuGroup>
	)
}

/**
 * Preference toggles, an accessibility submenu, input mode and language. Needs an editor.
 *
 * @public @react
 */
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

/**
 * Keyboard shortcuts, plus exit pen mode, stop following and cursor chat when they apply.
 * Needs an editor.
 *
 * @public @react
 */
export function CommandPaletteHelpGroup() {
	return (
		<TldrawUiMenuGroup id="command-palette-help" label={messages.help.id}>
			<KeyboardShortcutsMenuItem />
			<CommandPaletteActionGroup group="help" />
		</TldrawUiMenuGroup>
	)
}
