import { useValue } from 'tldraw'
import { useGlobalEditor } from '../../../../utils/globalEditor'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { useMsg } from '../../../utils/i18n'
import { getIsSidebarOpen, toggleSidebar } from '../../../utils/local-session-state'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'
import { messages } from './sidebar-shared'

export function TlaSidebarToggle() {
	const trackEvent = useTldrawAppUiEvents()
	const toggleLbl = useMsg(messages.toggleSidebar)
	const editor = useGlobalEditor()

	const hideSidebarToggle = useValue(
		'hideSidebarToggle',
		() => !editor || editor.getInstanceState().isFocusMode,
		[editor]
	)
	if (hideSidebarToggle) return null

	return (
		<button
			className={styles.sidebarToggle}
			data-mobile={false}
			data-testid="tla-sidebar-toggle"
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
		</button>
	)
}
