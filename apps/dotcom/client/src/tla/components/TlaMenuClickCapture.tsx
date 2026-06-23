import { PointerEvent, useCallback } from 'react'
import { tlmenus, useValue } from 'tldraw'

/**
 * A dismiss-only overlay for dotcom chrome (the sidebar, the editor's top panels). While any menu is
 * open it covers its region and absorbs presses, so clicking the chrome underneath only dismisses the
 * open menu instead of also acting on what was pressed — navigating to a file, opening a second menu,
 * or hitting the share button.
 *
 * It is scoped per region by `className` (each caller positions it over its own chrome) and stays off
 * the canvas, which the SDK's own `MenuClickCapture` already covers — including forwarding drags so
 * click-to-draw keeps working. The two together give consistent "an outside press only dismisses"
 * behaviour without touching the SDK. Mounts on `hasAnyOpenMenus()` and `clearOpenMenus()` on press,
 * the same trigger and dismissal the SDK overlay uses.
 */
export function TlaMenuClickCapture({ className, testId }: { className: string; testId: string }) {
	const hasOpenMenu = useValue('has open menu', () => tlmenus.hasAnyOpenMenus(), [])

	const handlePointerDown = useCallback((e: PointerEvent) => {
		// Swallow the press so it can't reach the chrome underneath, then dismiss the open menu.
		e.preventDefault()
		e.stopPropagation()
		tlmenus.clearOpenMenus()
	}, [])

	if (!hasOpenMenu) return null

	return (
		<div
			className={className}
			data-testid={testId}
			onPointerDown={handlePointerDown}
			onContextMenu={(e) => e.preventDefault()}
		/>
	)
}
