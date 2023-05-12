import { useApp } from '@tldraw/editor'
import { useCallback, useEffect, useRef } from 'react'
import { useEvents } from './useEventsProvider'

/** @public */
export function useMenuIsOpen(id: string, cb?: (isOpen: boolean) => void) {
	const app = useApp()
	const rIsOpen = useRef(false)
	const trackEvent = useEvents()

	const onOpenChange = useCallback(
		(isOpen: boolean) => {
			rIsOpen.current = isOpen
			app.batch(() => {
				if (isOpen) {
					app.complete()
					app.addOpenMenu(id)
				} else {
					app.deleteOpenMenu(id)
					app.openMenus.forEach((menuId) => {
						if (menuId.startsWith(id)) {
							app.deleteOpenMenu(menuId)
						}
					})
				}

				cb?.(isOpen)
			})
		},
		[app, id, cb]
	)

	useEffect(() => {
		// When the effect runs, if the menu is open then
		// add it to the open menus list.

		// This is necessary for cases where the user closes
		// the parent of a submenu before closing the submenu.
		// There is some duplication between this and `onOpenChange`
		// hook but it's necessary to handle the case where the
		// this effect runs twice or re-runs.
		if (rIsOpen.current) {
			trackEvent('open-menu', { source: 'unknown', id })
			app.addOpenMenu(id)
		}

		return () => {
			if (rIsOpen.current) {
				// Close menu on unmount
				app.deleteOpenMenu(id)

				// Close menu and all submenus when the parent is closed
				app.openMenus.forEach((menuId) => {
					if (menuId.startsWith(id)) {
						trackEvent('close-menu', { source: 'unknown', id })
						app.deleteOpenMenu(menuId)
					}
				})

				rIsOpen.current = false
			}
		}
	}, [app, id, trackEvent])

	return onOpenChange
}
