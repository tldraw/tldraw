import { PointerEvent, useCallback } from 'react'
import { tlmenus, useValue } from 'tldraw'
import styles from '../sidebar.module.css'

/**
 * The sidebar twin of the SDK's `MenuClickCapture`. While any menu is open, this covers the sidebar
 * and absorbs presses on it, so clicking the sidebar — a file link, or another menu's trigger —
 * only dismisses the open menu instead of also navigating or opening a second menu.
 *
 * The canvas is already handled by `MenuClickCapture` (which mounts for any open menu and also
 * forwards drags so click-to-draw keeps working), so this is deliberately scoped to the sidebar.
 * The two together give consistent "an outside press only dismisses" behaviour without breaking
 * click-to-drag on the canvas. It mirrors `MenuClickCapture`'s trigger and dismissal exactly:
 * mount on `hasAnyOpenMenus()`, and `clearOpenMenus()` on press.
 */
export function TlaSidebarMenuClickCapture() {
	const hasOpenMenu = useValue('has open menu', () => tlmenus.hasAnyOpenMenus(), [])

	const handlePointerDown = useCallback((e: PointerEvent) => {
		// Swallow the press so it can't reach the sidebar underneath, then dismiss the open menu.
		e.preventDefault()
		e.stopPropagation()
		tlmenus.clearOpenMenus()
	}, [])

	if (!hasOpenMenu) return null

	return (
		<div
			className={styles.sidebarMenuClickCapture}
			data-testid="tla-sidebar-menu-click-capture"
			onPointerDown={handlePointerDown}
			onContextMenu={(e) => e.preventDefault()}
		/>
	)
}
