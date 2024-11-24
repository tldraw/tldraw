import { useIntl } from 'react-intl'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { getLocalSessionState, updateLocalSessionState } from '../../../utils/local-session-state'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'
import { messages } from './sidebar-shared'

export function TlaSidebarToggle() {
	const trackEvent = useTldrawAppUiEvents()
	const intl = useIntl()
	const toggleLbl = intl.formatMessage(messages.toggleSidebar)

	return (
		<button
			className={styles.toggle}
			data-mobile={false}
			data-testid="tla-sidebar-toggle"
			title={toggleLbl}
			onClick={() => {
				updateLocalSessionState((s) => ({ isSidebarOpen: !s.isSidebarOpen }))
				trackEvent('sidebar-toggle', {
					value: getLocalSessionState().isSidebarOpen,
					source: 'sidebar',
				})
			}}
		>
			<TlaIcon icon="sidebar" />
		</button>
	)
}
