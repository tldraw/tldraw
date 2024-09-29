import { atom } from '@tldraw/state'

/**
 * A set of strings representing any open menus. When menus are open,
 * certain interactions will behave differently; for example, when a
 * draw tool is selected and a menu is open, a pointer-down will not
 * create a dot (because the user is probably trying to close the menu)
 * however a pointer-down event followed by a drag will begin drawing
 * a line (because the user is BOTH trying to close the menu AND start
 * drawing a line).
 *
 * @public
 */
export const globalOpenMenus = atom<string[]>('open menus', [])

/**
 * Get the current open menus.
 *
 * @param context - An optional context to get menus for.
 *
 * @public
 */
export function getOpenMenus(context?: string) {
	if (context) return globalOpenMenus.get().filter((m) => m.endsWith('-' + context))
	return globalOpenMenus.get()
}

/**
 * Add an open menu.
 *
 * @example
 * ```ts
 * addOpenMenu('menu-id')
 * addOpenMenu('menu-id', myEditorId)
 * ```
 *
 * @param id - The id of the menu to add.
 * @param context - An optional context to add the menu to.
 *
 * @public
 */
export function addOpenMenu(id: string, context = '') {
	const idWithContext = context ? `${id}-${context}` : id
	const menus = new Set(globalOpenMenus.get())
	if (!menus.has(idWithContext)) {
		menus.add(idWithContext)
		globalOpenMenus.set([...menus])
	}
}

/**
 * Delete an open menu.
 *
 * @example
 * ```ts
 * deleteOpenMenu('menu-id')
 * deleteOpenMenu('menu-id', myEditorId)
 * ```
 *
 * @param id - The id of the menu to delete.
 * @param context - An optional context to delete the menu from.
 *
 * @public
 */
export function deleteOpenMenu(id: string, context = '') {
	const idWithContext = context ? `${id}-${context}` : id
	const menus = new Set(globalOpenMenus.get())
	if (menus.has(idWithContext)) {
		menus.delete(idWithContext)
		globalOpenMenus.set([...menus])
	}
}

/**
 * Clear all open menus.
 *
 * @example
 * ```ts
 * clearOpenMenus()
 * clearOpenMenus(myEditorId)
 * ```
 *
 * @param context - An optional context to clear menus for.
 *
 * @public
 */
export function clearOpenMenus(context?: string) {
	globalOpenMenus.set(
		context ? globalOpenMenus.get().filter((m) => !m.endsWith('-' + context)) : []
	)
}

/**
 * Get whether any menus are open.
 *
 * @example
 * ```ts
 * getIsMenuOpen()
 * ```
 *
 * @param context - An optional context to check menus for.
 *
 * @public
 */
export function getIsMenuOpen(context?: string): boolean {
	return getOpenMenus(context).length > 0
}
