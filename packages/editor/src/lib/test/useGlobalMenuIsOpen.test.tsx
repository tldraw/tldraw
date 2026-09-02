import { act, render } from '@testing-library/react'
import { useCallback } from 'react'
import { tlmenus } from '../globals/menus'
import { useGlobalMenuIsOpen } from '../hooks/useGlobalMenuIsOpen'

const MENU_ID = 'test-menu'

let setOpen: (isOpen: boolean) => void

// `onEvent` identity changes with `nonce`, the way a host passing an inline `onUiEvent` to
// <Tldraw> hands `useMenuIsOpen` a fresh callback on every render.
function Menu({ nonce }: { nonce: number }) {
	const onEvent = useCallback(() => nonce, [nonce])
	const [isOpen, onOpenChange] = useGlobalMenuIsOpen(MENU_ID, undefined, onEvent)
	setOpen = onOpenChange
	return <div data-testid="state">{isOpen ? 'open' : 'closed'}</div>
}

describe('useGlobalMenuIsOpen', () => {
	beforeEach(() => {
		tlmenus.clearOpenMenus()
	})

	it('keeps an open menu open when the host re-renders', () => {
		const { rerender } = render(<Menu nonce={0} />)

		act(() => setOpen(true))
		expect(tlmenus.isMenuOpen(MENU_ID)).toBe(true)

		rerender(<Menu nonce={1} />)
		expect(tlmenus.isMenuOpen(MENU_ID)).toBe(true)
	})

	it('stays closed after the menu is closed through tlmenus directly', () => {
		const { rerender } = render(<Menu nonce={0} />)

		act(() => setOpen(true))
		// How ReactionPicker dismisses its palette: drop the registry entry rather than routing
		// through the hook's own onOpenChange. A re-render must not bring it back.
		act(() => tlmenus.deleteOpenMenu(MENU_ID))
		expect(tlmenus.hasAnyOpenMenus()).toBe(false)

		rerender(<Menu nonce={1} />)
		expect(tlmenus.hasAnyOpenMenus()).toBe(false)
	})

	it('drops the entry when a menu unmounts while open', () => {
		const { unmount } = render(<Menu nonce={0} />)

		act(() => setOpen(true))
		expect(tlmenus.hasAnyOpenMenus()).toBe(true)

		unmount()
		expect(tlmenus.hasAnyOpenMenus()).toBe(false)
	})

	it('closes through onOpenChange', () => {
		render(<Menu nonce={0} />)

		act(() => setOpen(true))
		act(() => setOpen(false))
		expect(tlmenus.hasAnyOpenMenus()).toBe(false)
	})
})
