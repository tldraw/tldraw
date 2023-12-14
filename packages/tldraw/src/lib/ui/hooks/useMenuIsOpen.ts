import { useEditor, useValue } from '@tldraw/editor'
import { useCallback, useEffect, useRef } from 'react'
import { useUiEvents } from './useEventsProvider'

/** @public */
export function useMenuIsOpen(id: string, cb?: (isOpen: boolean) => void) {
	const editor = useEditor()
	const rIsOpen = useRef(false)
	const trackEvent = useUiEvents()

	const rLastChange = useRef(0)

	const onOpenChange = useCallback(
		(isOpen: boolean) => {
			// prevent multiple calls in quick succession
			const now = Date.now()
			if (now - rLastChange.current < 50) return
			rLastChange.current = now

			rIsOpen.current = isOpen

			editor.batch(() => {
				if (isOpen) {
					editor.complete()
					editor.addOpenMenu(id)
				} else {
					editor.updateInstanceState({
						openMenus: editor.getOpenMenus().filter((m) => !m.startsWith(id)),
					})
				}

				cb?.(isOpen)
			})
		},
		[editor, id, cb]
	)

	const isOpen = useValue('is menu open', () => editor.getOpenMenus().includes(id), [editor, id])

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
			editor.addOpenMenu(id)
		}

		return () => {
			if (rIsOpen.current) {
				// Close menu on unmount
				editor.deleteOpenMenu(id)

				// Close menu and all submenus when the parent is closed
				editor.getOpenMenus().forEach((menuId) => {
					if (menuId.startsWith(id)) {
						trackEvent('close-menu', { source: 'unknown', id })
						editor.deleteOpenMenu(menuId)
					}
				})

				rIsOpen.current = false
			}
		}
	}, [editor, id, trackEvent])

	return [isOpen, onOpenChange] as const
}
