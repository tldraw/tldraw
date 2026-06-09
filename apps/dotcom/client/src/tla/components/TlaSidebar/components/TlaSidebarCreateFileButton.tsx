import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { TldrawUiButton, tltime } from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useActiveGroupId } from '../../../hooks/useActiveGroupId'
import { useApp } from '../../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'
import { useMsg } from '../../../utils/i18n'
import { toggleMobileSidebar } from '../../../utils/local-session-state'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import { messages } from './sidebar-shared'
import styles from '../sidebar.module.css'

export function TlaSidebarCreateFileButton() {
	const app = useApp()
	const navigate = useNavigate()
	const trackEvent = useTldrawAppUiEvents()
	const createTitle = useMsg(messages.create)
	// Create the file in whichever space is currently active (the home group when
	// in "My files", otherwise the selected workspace).
	const activeGroupId = useActiveGroupId()

	const rCanCreate = useRef(true)

	const handleSidebarCreate = async () => {
		if (!rCanCreate.current) return
		const res = await app.createFile({ groupId: activeGroupId })
		if (res.ok) {
			const isMobile = getIsCoarsePointer()
			if (!isMobile) {
				app.sidebarState.update((prev) => ({
					...prev,
					renameState: { fileId: res.value.fileId, groupId: activeGroupId },
				}))
			}
			const { fileId } = res.value
			app.ensureFileVisibleInSidebar(fileId)
			navigate(routes.tlaFile(fileId))
			trackEvent('create-file', { source: 'sidebar' })
			rCanCreate.current = false
			tltime.setTimeout('can create again', () => (rCanCreate.current = true), 1000)
			if (isMobile) {
				toggleMobileSidebar(false)
			}
		}
	}

	return (
		<TldrawUiButton
			type="icon"
			className={styles.sidebarCreateFileButton}
			onClick={handleSidebarCreate}
			data-testid="tla-create-file"
			tooltip={createTitle}
			title={createTitle}
		>
			<TlaIcon icon="edit-strong" style={{ left: 1 }} />
		</TldrawUiButton>
	)
}
