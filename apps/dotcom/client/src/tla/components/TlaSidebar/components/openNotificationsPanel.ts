import { Editor } from 'tldraw'
import {
	isDesktopSidebarLayout,
	toggleMobileSidebar,
	toggleSidebar,
} from '../../../utils/local-session-state'

export const NOTIFICATIONS_MENU_ID = 'sidebar-notifications'

export function openNotificationsPanel(editor: Editor) {
	// Sidebar opens first: the popover anchors to its button.
	if (isDesktopSidebarLayout()) toggleSidebar(true)
	else toggleMobileSidebar(true)
	editor.timers.requestAnimationFrame(() => editor.menus.addOpenMenu(NOTIFICATIONS_MENU_ID))
}
