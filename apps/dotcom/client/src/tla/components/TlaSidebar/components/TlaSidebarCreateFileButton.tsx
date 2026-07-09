import { TlButton } from '@tldraw/ui'
import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { tltime } from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useActiveWorkspaceId } from '../../../hooks/useActiveWorkspaceId'
import { useApp } from '../../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'
import { useMsg } from '../../../utils/i18n'
import { toggleMobileSidebar } from '../../../utils/local-session-state'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import { messages } from './sidebar-shared'
import styles from '../sidebar.module.css'

export function useHandleSidebarCreateFile() {
	const app = useApp()
	const navigate = useNavigate()
	const trackEvent = useTldrawAppUiEvents()
	// Create the file in whichever workspace is currently active (the home
	// workspace when in Home, otherwise the selected workspace).
	const activeWorkspaceId = useActiveWorkspaceId()

	const rCanCreate = useRef(true)

	return useCallback(async () => {
		if (!rCanCreate.current) return
		const res = await app.createFile({ workspaceId: activeWorkspaceId })
		if (res.ok) {
			const isMobile = getIsCoarsePointer()
			if (!isMobile) {
				app.sidebarState.update((prev) => ({
					...prev,
					renameState: { fileId: res.value.fileId, workspaceId: activeWorkspaceId },
				}))
			}
			const { fileId } = res.value
			navigate(routes.tlaFile(fileId))
			trackEvent('create-file', { source: 'sidebar' })
			rCanCreate.current = false
			tltime.setTimeout('can create again', () => (rCanCreate.current = true), 1000)
			if (isMobile) {
				toggleMobileSidebar(false)
			}
		}
	}, [app, navigate, trackEvent, activeWorkspaceId])
}

export function TlaSidebarCreateFileButton() {
	const createTitle = useMsg(messages.create)
	const handleSidebarCreate = useHandleSidebarCreateFile()

	return (
		<TlButton
			type="icon"
			className={styles.sidebarCreateFileButton}
			onClick={handleSidebarCreate}
			data-testid="tla-create-file"
			tooltip={createTitle}
			title={createTitle}
		>
			<TlaIcon icon="edit-strong" style={{ left: 1 }} />
		</TlButton>
	)
}
