import { patch } from 'patchfork'
import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { tltime } from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useApp } from '../../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'
import { useMsg } from '../../../utils/i18n'
import { toggleMobileSidebar } from '../../../utils/local-session-state'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'
import { messages } from './sidebar-shared'

export function TlaSidebarCreateFileButton() {
	const app = useApp()
	const navigate = useNavigate()
	const trackEvent = useTldrawAppUiEvents()
	const createTitle = useMsg(messages.create)

	const rCanCreate = useRef(true)

	const handleSidebarCreate = useCallback(async () => {
		if (!rCanCreate.current) return
		const res = await app.createFile()
		if (res.ok) {
			const isMobile = getIsCoarsePointer()
			if (!isMobile) {
				patch(app.sidebarState).renameState({
					fileId: res.value.fileId,
					groupId: app.getHomeGroupId(),
				})
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
	}, [app, navigate, trackEvent])

	return (
		<button
			className={styles.sidebarCreateFileButton}
			onClick={handleSidebarCreate}
			data-testid="tla-create-file"
			aria-label={createTitle}
		>
			<TlaIcon icon="edit-strong" style={{ left: 1 }} />
		</button>
	)
}
