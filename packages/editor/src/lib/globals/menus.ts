import { atom } from '@tldraw/state'

/** @public */
export const tlmenus = {
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
	menus: atom<string[]>('open menus', []),

	/**
	 * Get the current open menus.
	 *
	 * @param contextId - An optional context to get menus for.
	 *
	 * @public
	 */
	getOpenMenus(contextId?: string) {
		if (contextId) return this.menus.get().filter((m) => m.endsWith('-' + contextId))
		return this.menus.get()
	},

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
	 * @param contextId - An optional context to add the menu to.
	 *
	 * @public
	 */
	addOpenMenu(id: string, contextId = '') {
		const idWithContext = contextId ? `${id}-${contextId}` : id
		const menus = new Set(this.menus.get())
		if (!menus.has(idWithContext)) {
			menus.add(idWithContext)
			this.menus.set([...menus])
		}
	},

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
	 * @param contextId - An optional context to delete the menu from.
	 *
	 * @public
	 */
	deleteOpenMenu(id: string, contextId = '') {
		const idWithContext = contextId ? `${id}-${contextId}` : id
		const menus = new Set(this.menus.get())
		if (menus.has(idWithContext)) {
			menus.delete(idWithContext)
			this.menus.set([...menus])
		}
	},

	/**
	 * Clear all open menus.
	 *
	 * @example
	 * ```ts
	 * clearOpenMenus()
	 * clearOpenMenus(myEditorId)
	 * ```
	 *
	 * @param contextId - An optional context to clear menus for.
	 *
	 * @public
	 */
	clearOpenMenus(contextId?: string) {
		this.menus.set(contextId ? this.menus.get().filter((m) => !m.endsWith('-' + contextId)) : [])
	},

	_hiddenMenus: [] as string[],

	/**
	 * Hide all open menus. Restore them with the `showOpenMenus` method.
	 *
	 * @example
	 * ```ts
	 * hideOpenMenus()
	 * hideOpenMenus(myEditorId)
	 * ```
	 *
	 * @param contextId - An optional context to hide menus for.
	 *
	 * @public
	 */
	hideOpenMenus(contextId?: string) {
		this._hiddenMenus = [...this.getOpenMenus(contextId)]
		if (this._hiddenMenus.length === 0) return
		for (const menu of this._hiddenMenus) {
			this.deleteOpenMenu(menu, contextId)
		}
	},

	/**
	 * Show all hidden menus.
	 *
	 * @example
	 * ```ts
	 * showOpenMenus()
	 * showOpenMenus(myEditorId)
	 * ```
	 *
	 * @param contextId - An optional context to show menus for.
	 *
	 * @public
	 */
	showOpenMenus(contextId?: string) {
		if (this._hiddenMenus.length === 0) return
		for (const menu of this._hiddenMenus) {
			this.addOpenMenu(menu, contextId)
		}
		this._hiddenMenus = []
	},

	/**
	 * Get whether a menu is open for a given context.
	 *
	 * @example
	 * ```ts
	 * isMenuOpem(id, myEditorId)
	 * ```
	 *
	 * @param id - The id of the menu to check.
	 * @param contextId - An optional context to check menus for.
	 *
	 * @public
	 */
	isMenuOpen(id: string, contextId?: string): boolean {
		return this.getOpenMenus(contextId).includes(id)
	},

	/**
	 * Get whether any menus are open for a given context.
	 *
	 * @example
	 * ```ts
	 * hasOpenMenus(myEditorId)
	 * ```
	 *
	 * @param contextId - A context to check menus for.
	 *
	 * @public
	 */
	hasOpenMenus(contextId: string): boolean {
		return this.getOpenMenus(contextId).length > 0
	},

	/**
	 * Get whether any menus are open for any context.
	 *
	 * @example
	 * ```ts
	 * hasAnyOpenMenus()
	 * ```
	 *
	 * @public
	 */
	hasAnyOpenMenus(): boolean {
		return this.getOpenMenus().length > 0
	},

	forContext(contextId: string) {
		return {
			getOpenMenus: () => this.getOpenMenus(contextId),
			addOpenMenu: (id: string) => this.addOpenMenu(id, contextId),
			deleteOpenMenu: (id: string) => this.deleteOpenMenu(id, contextId),
			clearOpenMenus: () => this.clearOpenMenus(contextId),
			// Gets whether any menus are open
			isMenuOpen: (id: string) => this.isMenuOpen(id, contextId),
			hasOpenMenus: () => this.hasOpenMenus(contextId),
			hasAnyOpenMenus: () => this.hasAnyOpenMenus(),
		}
	},
}
