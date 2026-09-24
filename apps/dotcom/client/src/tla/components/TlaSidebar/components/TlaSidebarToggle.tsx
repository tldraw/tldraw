import { TldrawUiButton } from 'tldraw'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { useMsg } from '../../../utils/i18n'
import { getIsSidebarOpen, toggleSidebar } from '../../../utils/local-session-state'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import { messages, useHideSidebarToggle } from './sidebar-shared'
import styles from '../sidebar.module.css'

export function TlaSidebarToggle() {
	const trackEvent = useTldrawAppUiEvents()
	const toggleLbl = useMsg(messages.toggleSidebar)
	const hideSidebarToggle = useHideSidebarToggle()
	if (hideSidebarToggle) return null

	return (
		<TldrawUiButton
			type="icon"
			className={styles.sidebarToggle}
			data-mobile={false}
			data-testid="tla-sidebar-toggle"
			tooltip={toggleLbl}
			title={toggleLbl}
			onClick={() => {
				toggleSidebar()
				trackEvent('sidebar-toggle', {
					value: getIsSidebarOpen(),
					source: 'sidebar',
				})
			}}
		>
			<TlaIcon icon="sidebar-strong" />
		</TldrawUiButton>
	)
}
