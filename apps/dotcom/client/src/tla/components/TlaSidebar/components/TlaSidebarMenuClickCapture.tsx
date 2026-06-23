import { TlaMenuClickCapture } from '../../TlaMenuClickCapture'
import styles from '../sidebar.module.css'

/**
 * The sidebar's dismiss-only overlay. While any menu is open this covers the sidebar so clicking it —
 * a file link, or another menu's trigger — only dismisses the open menu instead of also navigating or
 * opening a second menu. The editor's top panels get the same treatment via {@link TlaMenuClickCapture},
 * and the canvas is handled by the SDK's `MenuClickCapture` (which also forwards drags so click-to-draw
 * keeps working).
 */
export function TlaSidebarMenuClickCapture() {
	return (
		<TlaMenuClickCapture
			className={styles.sidebarMenuClickCapture}
			testId="tla-sidebar-menu-click-capture"
		/>
	)
}
