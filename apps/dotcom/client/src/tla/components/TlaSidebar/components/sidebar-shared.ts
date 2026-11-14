import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { defineMessages, tltime, useValue } from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useGlobalEditor } from '../../../../utils/globalEditor'
import { useActiveWorkspaceId } from '../../../hooks/useActiveWorkspaceId'
import { useApp } from '../../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'
import { toggleMobileSidebar } from '../../../utils/local-session-state'

export interface RecentFile {
	fileId: string
	date: number
	isPinned: boolean
}

export const messages = defineMessages({
	create: { defaultMessage: 'Create file' },
	toggleSidebar: { defaultMessage: 'Toggle sidebar' },
	accountMenu: { defaultMessage: 'Account menu' },
	fileMenu: { defaultMessage: 'File menu' },
})

/** The sidebar toggles hide until an editor exists, and while it is in focus mode. */
export function useHideSidebarToggle() {
	const editor = useGlobalEditor()
	return useValue('hideSidebarToggle', () => !editor || editor.getInstanceState().isFocusMode, [
		editor,
	])
}

export const sidebarMessages = defineMessages({
	renameFile: { defaultMessage: 'Rename file' },
	selected: { defaultMessage: 'selected' },
})

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
			const { fileId } = res.value
			const isMobile = getIsCoarsePointer()
			if (!isMobile) {
				app.sidebarState.update((prev) => ({
					...prev,
					renameState: { fileId, workspaceId: activeWorkspaceId },
				}))
			}
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
