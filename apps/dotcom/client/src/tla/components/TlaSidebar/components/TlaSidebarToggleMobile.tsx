import { useIntl } from 'react-intl'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { getLocalSessionState, updateLocalSessionState } from '../../../utils/local-session-state'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'
import { messages } from './sidebar-shared'

export function TlaSidebarToggleMobile() {
	const trackEvent = useTldrawAppUiEvents()
	const intl = useIntl()
	const toggleSidebarLbl = intl.formatMessage(messages.toggleSidebar)

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
			<TlaIcon icon="sidebar" />
		</button>
	)
}
