import { TldrawUiButton, useValue } from 'tldraw'
import { useGlobalEditor } from '../../../../utils/globalEditor'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { useMsg } from '../../../utils/i18n'
import { getIsSidebarOpenMobile, toggleMobileSidebar } from '../../../utils/local-session-state'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import { messages } from './sidebar-shared'
import styles from '../sidebar.module.css'

export function TlaSidebarToggleMobile() {
	const trackEvent = useTldrawAppUiEvents()
	const toggleSidebarLbl = useMsg(messages.toggleSidebar)
	const editor = useGlobalEditor()

	const hideSidebarToggle = useValue(
		'hideSidebarToggle',
		() => !editor || editor.getInstanceState().isFocusMode,
		[editor]
	)
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
