import { TldrawUiButton, useTranslation } from 'tldraw'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { getIsSidebarOpenMobile, toggleMobileSidebar } from '../../../utils/local-session-state'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import { messages, useHideSidebarToggle } from './sidebar-shared'
import styles from '../sidebar.module.css'

export function TlaSidebarToggleMobile() {
	const msg = useTranslation()
	const trackEvent = useTldrawAppUiEvents()
	const toggleSidebarLbl = msg(messages.toggleSidebar)
	const hideSidebarToggle = useHideSidebarToggle()
	if (hideSidebarToggle) return null

	return (
		<TldrawUiButton
			type="icon"
			className={styles.sidebarToggle}
			data-mobile={true}
			data-testid="tla-sidebar-toggle-mobile"
			tooltip={toggleSidebarLbl}
			title={toggleSidebarLbl}
			onClick={() => {
				toggleMobileSidebar()
				trackEvent('sidebar-toggle', {
					value: getIsSidebarOpenMobile(),
					source: 'sidebar',
				})
			}}
		>
			<TlaIcon icon="sidebar-strong" />
		</TldrawUiButton>
	)
}
