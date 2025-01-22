import { useEditor, useValue } from 'tldraw'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { useMsg } from '../../../utils/i18n'
import { getLocalSessionState, updateLocalSessionState } from '../../../utils/local-session-state'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'
import { messages } from './sidebar-shared'

export function TlaSidebarToggle() {
	const trackEvent = useTldrawAppUiEvents()
	const toggleLbl = useMsg(messages.toggleSidebar)
	const editor = useEditor()

	const hideSidebarToggle = useValue(
		'hideSidebarToggle',
		() => editor.getInstanceState().isFocusMode,
		[editor]
	)
	if (hideSidebarToggle) return null

	return (
		<button
			className={styles.toggle}
			data-mobile={false}
			data-testid="tla-sidebar-toggle"
			title={toggleLbl}
			onClick={() => {
				updateLocalSessionState((s) => {
					if (!s.isSidebarOpen) {
						editor?.updateInstanceState({ isFocusMode: false })
					}

					return { isSidebarOpen: !s.isSidebarOpen }
				})
				trackEvent('sidebar-toggle', {
					value: getLocalSessionState().isSidebarOpen,
					source: 'sidebar',
				})
			}}
		>
			<TlaIcon icon="sidebar-strong" />
		</button>
	)
}
