import type { Editor } from '@tldraw/editor'
import { ACTION_META, type ActionInvocation } from '../actions/actionIds'
import { getShapePlaintext } from '../editor/richText'
import type { MenuId, UiState } from './UiState'

export interface MenuItem {
	action?: ActionInvocation
	/** Defaults to the action's `ACTION_META` label. */
	label?: string
	submenu?: MenuItem[]
	separator?: boolean
	enabled?(editor: Editor): boolean
	/** Toggle items show a check mark when this returns true. */
	checked?(editor: Editor, ui: UiState): boolean
	/** Items without an action show this in the status bar when chosen. */
	hint?: string
}

export const MENU_IDS: readonly MenuId[] = ['file', 'edit', 'view', 'pages', 'help']

export const MENU_LABELS: Readonly<Record<MenuId, string>> = {
	file: 'File',
	edit: 'Edit',
	view: 'View',
	pages: 'Pages',
	help: 'Help',
}

const SEPARATOR: MenuItem = { separator: true }

function item(id: ActionInvocation['id'], extra: Omit<MenuItem, 'action'> = {}): MenuItem {
	return { action: { id }, ...extra }
}

export function hasSelection(editor: Editor): boolean {
	return editor.getSelectedShapeIds().length > 0
}

function hasSelectionOf(min: number) {
	return (editor: Editor) => editor.getSelectedShapeIds().length >= min
}

function selectionHasGroup(editor: Editor): boolean {
	return editor.getSelectedShapes().some((shape) => editor.isShapeOfType(shape, 'group'))
}

function hasEditableText(editor: Editor): boolean {
	const shape = editor.getOnlySelectedShape()
	return shape !== null && getShapePlaintext(editor, shape) !== null
}

function hasLockedShapes(editor: Editor): boolean {
	return editor.getCurrentPageShapes().some((shape) => shape.isLocked)
}

function hasMultiplePages(editor: Editor): boolean {
	return editor.getPages().length > 1
}

function hasPreviousPage(editor: Editor): boolean {
	return editor.getPages().findIndex((page) => page.id === editor.getCurrentPageId()) > 0
}

function hasNextPage(editor: Editor): boolean {
	const pages = editor.getPages()
	return pages.findIndex((page) => page.id === editor.getCurrentPageId()) < pages.length - 1
}

export const ARRANGE_ITEMS: readonly MenuItem[] = [
	item('arrange.align-left', { enabled: hasSelectionOf(2) }),
	item('arrange.align-center-horizontal', { enabled: hasSelectionOf(2) }),
	item('arrange.align-right', { enabled: hasSelectionOf(2) }),
	item('arrange.align-top', { enabled: hasSelectionOf(2) }),
	item('arrange.align-center-vertical', { enabled: hasSelectionOf(2) }),
	item('arrange.align-bottom', { enabled: hasSelectionOf(2) }),
	SEPARATOR,
	item('arrange.distribute-horizontal', { enabled: hasSelectionOf(3) }),
	item('arrange.distribute-vertical', { enabled: hasSelectionOf(3) }),
	item('arrange.stretch-horizontal', { enabled: hasSelectionOf(2) }),
	item('arrange.stretch-vertical', { enabled: hasSelectionOf(2) }),
	item('arrange.pack', { enabled: hasSelectionOf(2) }),
	item('arrange.stack-horizontal', { enabled: hasSelectionOf(2) }),
	item('arrange.stack-vertical', { enabled: hasSelectionOf(2) }),
	SEPARATOR,
	item('arrange.flip-horizontal', { enabled: hasSelection }),
	item('arrange.flip-vertical', { enabled: hasSelection }),
	item('arrange.rotate-cw', { enabled: hasSelection }),
	item('arrange.rotate-ccw', { enabled: hasSelection }),
	SEPARATOR,
	item('arrange.bring-to-front', { enabled: hasSelection }),
	item('arrange.bring-forward', { enabled: hasSelection }),
	item('arrange.send-backward', { enabled: hasSelection }),
	item('arrange.send-to-back', { enabled: hasSelection }),
]

export const MENUS: Readonly<Record<MenuId, readonly MenuItem[]>> = {
	file: [
		item('file.new'),
		item('file.open'),
		SEPARATOR,
		item('file.save'),
		item('file.save-as'),
		item('file.export-text'),
		SEPARATOR,
		item('app.quit'),
	],
	edit: [
		item('edit.undo', { enabled: (editor) => editor.getCanUndo() }),
		item('edit.redo', { enabled: (editor) => editor.getCanRedo() }),
		SEPARATOR,
		item('edit.cut', { enabled: hasSelection }),
		item('edit.copy', { enabled: hasSelection }),
		item('edit.paste'),
		item('edit.duplicate', { enabled: hasSelection }),
		item('edit.delete', { enabled: hasSelection }),
		SEPARATOR,
		item('edit.select-all'),
		item('edit.edit-text', { enabled: hasEditableText }),
		item('edit.group', { enabled: hasSelectionOf(2) }),
		item('edit.ungroup', { enabled: selectionHasGroup }),
		item('edit.toggle-lock', { enabled: hasSelection }),
		item('edit.unlock-all', { enabled: hasLockedShapes }),
		SEPARATOR,
		{ label: 'Arrange', submenu: [...ARRANGE_ITEMS], enabled: hasSelection },
	],
	view: [
		item('view.zoom-in'),
		item('view.zoom-out'),
		item('view.zoom-to-fit'),
		item('view.zoom-to-selection', { enabled: hasSelection }),
		item('view.zoom-to-100'),
		SEPARATOR,
		item('view.toggle-grid', { checked: (editor) => editor.getInstanceState().isGridMode }),
		item('view.toggle-snap', { checked: (editor) => editor.user.getIsSnapMode() }),
		item('view.toggle-dark-mode', { checked: (editor) => editor.getColorMode() === 'dark' }),
		SEPARATOR,
		item('view.toggle-pointer-mode', { checked: (_editor, ui) => ui.pointerMode.get() }),
		item('view.toggle-style-panel', { checked: (_editor, ui) => ui.stylePanelOpen.get() }),
		item('view.toggle-debug', { checked: (_editor, ui) => ui.debug.get() }),
	],
	pages: [
		item('page.new'),
		item('page.rename'),
		item('page.duplicate'),
		item('page.delete', { enabled: hasMultiplePages }),
		SEPARATOR,
		item('page.prev', { enabled: hasPreviousPage }),
		item('page.next', { enabled: hasNextPage }),
	],
	help: [item('ui.help'), { label: 'About', hint: 'tldraw in the terminal · https://tldraw.dev' }],
}

/** One item per page, the current one checked; choosing a page runs `page.switch`. */
export function pageItems(editor: Editor): MenuItem[] {
	const currentId = editor.getCurrentPageId()
	return editor.getPages().map((page) => ({
		action: { id: 'page.switch', arg: page.id },
		label: page.name,
		checked: () => page.id === currentId,
	}))
}

/** The items of a menubar menu; the pages menu lists the document's pages first. */
export function menuItems(menu: MenuId, editor: Editor): MenuItem[] {
	if (menu === 'pages') return [...pageItems(editor), SEPARATOR, ...MENUS.pages]
	return [...MENUS[menu]]
}

/** The right-click menu: clipboard and selection actions, or just paste/select all without a selection. */
export function contextMenuItems(editor: Editor): MenuItem[] {
	if (!hasSelection(editor)) {
		const items = [item('edit.paste'), item('edit.select-all')]
		if (hasLockedShapes(editor)) items.push(item('edit.unlock-all'))
		return items
	}
	const items: MenuItem[] = [
		item('edit.cut'),
		item('edit.copy'),
		item('edit.paste'),
		item('edit.duplicate'),
		item('edit.delete'),
		SEPARATOR,
	]
	if (hasEditableText(editor)) items.push(item('edit.edit-text'))
	items.push(
		selectionHasGroup(editor)
			? item('edit.ungroup')
			: item('edit.group', { enabled: hasSelectionOf(2) })
	)
	items.push(item('edit.toggle-lock'), SEPARATOR)
	items.push(item('arrange.bring-to-front'), item('arrange.send-to-back'), SEPARATOR)
	items.push(item('edit.select-all'))
	return items
}

export function menuItemLabel(entry: MenuItem): string {
	if (entry.label !== undefined) return entry.label
	if (entry.action) return ACTION_META[entry.action.id].label
	return ''
}

/**
 * The shortcut to show next to an item: the legacy-safe key, or the tldraw chord when the
 * terminal speaks the kitty protocol or modifyOtherKeys and the action has one.
 */
export function actionKbd(
	id: ActionInvocation['id'],
	encoding: 'legacy' | 'full'
): string | undefined {
	const meta = ACTION_META[id]
	if (encoding === 'full' && meta.kbdFull) return meta.kbdFull
	return meta.kbd
}

export function menuItemKbd(entry: MenuItem, encoding: 'legacy' | 'full'): string | undefined {
	if (!entry.action || entry.action.arg !== undefined) return undefined
	return actionKbd(entry.action.id, encoding)
}

export function isMenuItemEnabled(entry: MenuItem, editor: Editor): boolean {
	if (entry.separator) return false
	return entry.enabled ? entry.enabled(editor) : true
}
