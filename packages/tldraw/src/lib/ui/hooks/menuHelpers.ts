import {
	Editor,
	TLArrowShape,
	assert,
	exhaustiveSwitchError,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { TLUiActionItem } from './useActions'
import { TLUiToolItem } from './useTools'
import { TLUiTranslationKey } from './useTranslation/TLUiTranslationKey'

/** @public */
export type TLUiMenuChild = TLUiMenuItem | TLUiSubMenu | TLUiMenuGroup | TLUiCustomMenuItem

/** @public */
export type TLUiCustomMenuItem = {
	id: string
	type: 'custom'
	disabled: boolean
	readonlyOk: boolean
}

/** @public */
export type TLUiMenuItem = {
	id: string
	type: 'item'
	readonlyOk: boolean
	actionItem: TLUiActionItem
	disabled: boolean
	checked: boolean
}

/** @public */
export type TLUiMenuGroup = {
	id: string
	type: 'group'
	checkbox: boolean
	disabled: boolean
	readonlyOk: boolean
	children: TLUiMenuChild[]
}

/** @public */
export type TLUiSubMenu = {
	id: string
	type: 'submenu'
	label: TLUiTranslationKey
	disabled: boolean
	readonlyOk: boolean
	children: TLUiMenuChild[]
}

/** @public */
export type TLUiMenuSchema = (TLUiMenuGroup | TLUiMenuItem | TLUiCustomMenuItem)[]

/** @public */
export function compactMenuItems<T>(arr: T[]): Exclude<T, null | false | undefined>[] {
	return arr.filter((i) => i !== undefined && i !== null && i !== false) as any
}

/** @public */
export function menuGroup(
	id: string,
	...children: (TLUiMenuChild | null | false)[]
): TLUiMenuGroup | null {
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
	label: TLUiTranslationKey,
	...children: (TLUiMenuChild | null | false)[]
): TLUiSubMenu | null {
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
	actionItem: TLUiActionItem | TLUiToolItem,
	opts = {} as Partial<{ checked: boolean; disabled: boolean }>
): TLUiMenuItem {
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

function shapesWithUnboundArrows(editor: Editor) {
	const { selectedShapeIds } = editor
	const selectedShapes = selectedShapeIds.map((id) => {
		return editor.getShape(id)
	})

	return selectedShapes.filter((shape) => {
		if (!shape) return false
		if (
			editor.isShapeOfType<TLArrowShape>(shape, 'arrow') &&
			shape.props.start.type === 'binding'
		) {
			return false
		}
		if (editor.isShapeOfType<TLArrowShape>(shape, 'arrow') && shape.props.end.type === 'binding') {
			return false
		}
		return true
	})
}

/** @internal */
export const useThreeStackableItems = () => {
	const editor = useEditor()
	return useValue('threeStackableItems', () => shapesWithUnboundArrows(editor).length > 2, [editor])
}

/** @internal */
export const useAllowGroup = () => {
	const editor = useEditor()
	return useValue('allowGroup', () => shapesWithUnboundArrows(editor).length > 1, [editor])
}

/** @internal */
export const useAllowUngroup = () => {
	const editor = useEditor()
	return useValue(
		'allowUngroup',
		() => editor.selectedShapeIds.some((id) => editor.getShape(id)?.type === 'group'),
		[]
	)
}

/** @public */
export function findMenuItem(menu: TLUiMenuSchema, path: string[]) {
	const item = _findMenuItem(menu, path)
	assert(item, `Menu item ${path.join(' > ')} not found`)
	return item
}

function _findMenuItem(
	menu: TLUiMenuSchema | TLUiMenuChild[],
	path: string[]
): TLUiMenuChild | null {
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
