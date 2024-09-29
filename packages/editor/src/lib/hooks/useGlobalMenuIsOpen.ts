import { useValue } from '@tldraw/state-react'
import { useCallback, useEffect, useRef } from 'react'
import { addOpenMenu, deleteOpenMenu, getOpenMenus, globalOpenMenus } from '../editor/menus'

/** @public */
export function useGlobalMenuIsOpen(
	id: string,
	onChange?: (isOpen: boolean) => void,
	onEvent?: (id: string) => void
) {
	const rIsOpen = useRef(false)

	const onOpenChange = useCallback(
		(isOpen: boolean) => {
			rIsOpen.current = isOpen

			if (isOpen) {
				addOpenMenu(id)
			} else {
				deleteOpenMenu(id)
			}

			onChange?.(isOpen)
		},
		[id, onChange]
	)

	const isOpen = useValue('is menu open', () => globalOpenMenus.get().includes(id), [id])

	useEffect(() => {
		// When the effect runs, if the menu is open then
		// add it to the open menus list.

		// This is necessary for cases where the user closes
		// the parent of a submenu before closing the submenu.
		// There is some duplication between this and `onOpenChange`
		// hook but it's necessary to handle the case where the
		// this effect runs twice or re-runs.
		if (rIsOpen.current) {
			onEvent?.('open-menu')
			addOpenMenu(id)
		}

		return () => {
			if (rIsOpen.current) {
				// Close menu on unmount
				deleteOpenMenu(id)

				// Close menu and all submenus when the parent is closed
				getOpenMenus().forEach((menuId) => {
					if (menuId.startsWith(id)) {
						onEvent?.('close-menu')
						deleteOpenMenu(menuId)
					}
				})

				rIsOpen.current = false
			}
		}
	}, [id, onEvent])

	return [isOpen, onOpenChange] as const
}
