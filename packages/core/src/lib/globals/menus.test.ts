import { tlmenus } from './menus'

describe('tlmenus', () => {
	afterEach(() => {
		tlmenus.clearOpenMenus()
		tlmenus._hiddenMenus = []
	})

	it('reports whether a menu is open with and without a context', () => {
		tlmenus.addOpenMenu('main')
		tlmenus.addOpenMenu('main', 'editor-1')

		expect(tlmenus.isMenuOpen('main')).toBe(true)
		expect(tlmenus.isMenuOpen('main', 'editor-1')).toBe(true)
		expect(tlmenus.isMenuOpen('main', 'editor-2')).toBe(false)
		expect(tlmenus.isMenuOpen('other')).toBe(false)
	})

	it('hides and restores the open menus of a context', () => {
		tlmenus.addOpenMenu('main', 'editor-1')
		tlmenus.addOpenMenu('main', 'editor-2')

		tlmenus.hideOpenMenus('editor-1')
		expect(tlmenus.getOpenMenus()).toEqual(['main-editor-2'])

		tlmenus.showOpenMenus('editor-1')
		expect(tlmenus.getOpenMenus().sort()).toEqual(['main-editor-1', 'main-editor-2'])

		// closing the real menu afterwards leaves nothing behind
		tlmenus.deleteOpenMenu('main', 'editor-1')
		expect(tlmenus.hasOpenMenus('editor-1')).toBe(false)
	})
})
