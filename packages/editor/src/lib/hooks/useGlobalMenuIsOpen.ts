import { useValue } from '@tldraw/state-react'
import { useCallback, useEffect, useRef } from 'react'
import { tlmenus } from '../globals/menus'
import { useEvent } from './useEvent'

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
				tlmenus.addOpenMenu(id)
			} else {
				tlmenus.deleteOpenMenu(id)
			}

			onChange?.(isOpen)
		},
		[id, onChange]
	)

	const isOpen = useValue('is menu open', () => tlmenus.getOpenMenus().includes(id), [id])

	// Hosts usually pass an inline handler (`<Tldraw onUiEvent={(name, data) => ...} />`), which the
	// events context hands straight on, so this arrives with a new identity on every render. The
	// effect below tears the menu out of the registry when it re-runs and cannot put it back, so an
	// unstable identity here closes open menus whenever the host re-renders for any reason.
	const handleEvent = useEvent((eventName: string) => onEvent?.(eventName))

	useEffect(() => {
		// When the effect runs, if the menu is open then
		// add it to the open menus list.

		// This is necessary for cases where the user closes
		// the parent of a submenu before closing the submenu.
		// There is some duplication between this and `onOpenChange`
		// hook but it's necessary to handle the case where the
		// this effect runs twice or re-runs.
		if (rIsOpen.current) {
			handleEvent('open-menu')
			tlmenus.addOpenMenu(id)
		}

		return () => {
			if (rIsOpen.current) {
				// Close menu on unmount
				tlmenus.deleteOpenMenu(id)

				// Close menu and all submenus when the parent is closed
				tlmenus.getOpenMenus().forEach((menuId) => {
					if (menuId.startsWith(id)) {
						handleEvent('close-menu')
						tlmenus.deleteOpenMenu(menuId)
					}
				})

				rIsOpen.current = false
			}
		}
	}, [id, handleEvent])

	return [isOpen, onOpenChange] as const
}
