import { App, TLArrowUtil, useEditor } from '@tldraw/editor'
import { assert, exhaustiveSwitchError } from '@tldraw/utils'
import { useValue } from 'signia-react'
import { ActionItem } from './useActions'
import { ToolItem } from './useTools'
import { TLTranslationKey } from './useTranslation/TLTranslationKey'

/** @public */
export type MenuChild = MenuItem | SubMenu | MenuGroup | CustomMenuItem

/** @public */
export type CustomMenuItem = {
	id: string
	type: 'custom'
	disabled: boolean
	readonlyOk: boolean
}

/** @public */
export type MenuItem = {
	id: string
	type: 'item'
	readonlyOk: boolean
	actionItem: ActionItem
	disabled: boolean
	checked: boolean
}

/** @public */
export type MenuGroup = {
	id: string
	type: 'group'
	checkbox: boolean
	disabled: boolean
	readonlyOk: boolean
	children: MenuChild[]
}

/** @public */
export type SubMenu = {
	id: string
	type: 'submenu'
	label: TLTranslationKey
	disabled: boolean
	readonlyOk: boolean
	children: MenuChild[]
}

/** @public */
export type MenuSchema = (MenuGroup | MenuItem | CustomMenuItem)[]

/** @public */
export function compactMenuItems<T>(arr: T[]): Exclude<T, null | false | undefined>[] {
	return arr.filter((i) => i !== undefined && i !== null && i !== false) as any
}

/** @public */
export function menuGroup(id: string, ...children: (MenuChild | null | false)[]): MenuGroup | null {
	const childItems = compactMenuItems(children)

	if (childItems.length === 0) return null

	return {
		id,
		type: 'group',
		checkbox: childItems.every((child) => child.type === 'item' && child.actionItem.checkbox),
		disabled: childItems.every((child) => child.disabled),
		readonlyOk: childItems.some((child) => child.readonlyOk),
		children: childItems,
	}
}

/** @public */
export function menuSubmenu(
	id: string,
	label: TLTranslationKey,
	...children: (MenuChild | null | false)[]
): SubMenu | null {
	const childItems = compactMenuItems(children)
	if (childItems.length === 0) return null

	return {
		id,
		type: 'submenu',
		label,
		children: childItems,
		disabled: childItems.every((child) => child.disabled),
		readonlyOk: childItems.some((child) => child.readonlyOk),
	}
}

/** @public */
export function menuCustom(
	id: string,
	opts = {} as Partial<{ readonlyOk: boolean; disabled: boolean }>
) {
	const { readonlyOk = true, disabled = false } = opts
	return {
		id,
		type: 'custom' as const,
		disabled,
		readonlyOk,
	}
}

/** @public */
export function menuItem(
	actionItem: ActionItem | ToolItem,
	opts = {} as Partial<{ checked: boolean; disabled: boolean }>
): MenuItem {
	if (!actionItem) {
		throw Error('No action item provided to menuItem')
	}

	if (!actionItem.label) {
		throw Error("Trying to create menu item for action item that doesn't have a label")
	}

	const { checked = false, disabled = false } = opts

	return {
		id: actionItem.id,
		type: 'item' as const,
		actionItem,
		disabled,
		checked,
		readonlyOk: actionItem.readonlyOk,
	}
}

function shapesWithUnboundArrows(app: App) {
	const { selectedIds } = app
	const selectedShapes = selectedIds.map((id) => {
		return app.getShapeById(id)
	})

	return selectedShapes.filter((shape) => {
		if (!shape) return false
		if (app.isShapeOfType(shape, TLArrowUtil) && shape.props.start.type === 'binding') {
			return false
		}
		if (app.isShapeOfType(shape, TLArrowUtil) && shape.props.end.type === 'binding') {
			return false
		}
		return true
	})
}

/** @public */
export const useThreeStackableItems = () => {
	const app = useEditor()
	return useValue('threeStackableItems', () => shapesWithUnboundArrows(app).length > 2, [app])
}

/** @public */
export const useAllowGroup = () => {
	const app = useEditor()
	return useValue('allowGroup', () => shapesWithUnboundArrows(app).length > 1, [app])
}

/** @public */
export const useAllowUngroup = () => {
	const app = useEditor()
	return useValue(
		'allowUngroup',
		() => app.selectedIds.some((id) => app.getShapeById(id)?.type === 'group'),
		[]
	)
}

/** @public */
export function findMenuItem(menu: MenuSchema, path: string[]) {
	const item = _findMenuItem(menu, path)
	assert(item, `Menu item ${path.join(' > ')} not found`)
	return item
}

function _findMenuItem(menu: MenuSchema | MenuChild[], path: string[]): MenuChild | null {
	const [next, ...rest] = path
	if (!next) return null

	const item = menu.find((item) => item.id === next)
	if (!item) return null

	switch (item.type) {
		case 'group':
		case 'submenu':
			return rest.length === 0 ? item : _findMenuItem(item.children, rest)
		case 'item':
		case 'custom':
			return rest.length === 0 ? item : null
		default:
			exhaustiveSwitchError(item, 'type')
	}
}

export const showMenuPaste =
	typeof window !== 'undefined' &&
	'navigator' in window &&
	Boolean(navigator.clipboard) &&
	Boolean(navigator.clipboard.read)
