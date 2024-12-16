import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { useMsg } from '../../../utils/i18n'
import { getLocalSessionState, updateLocalSessionState } from '../../../utils/local-session-state'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'
import { messages } from './sidebar-shared'

export function TlaSidebarToggleMobile() {
	const trackEvent = useTldrawAppUiEvents()
	const toggleSidebarLbl = useMsg(messages.toggleSidebar)

	return (
		<button
			className={styles.toggle}
			data-mobile={true}
			data-testid="tla-sidebar-toggle-mobile"
			title={toggleSidebarLbl}
			onClick={() => {
				updateLocalSessionState((s) => ({ isSidebarOpenMobile: !s.isSidebarOpenMobile }))
				trackEvent('sidebar-toggle', {
					value: getLocalSessionState().isSidebarOpenMobile,
					source: 'sidebar',
				})
			}}
		>
			<TlaIcon icon="sidebar-strong" />
		</button>
	)
}
