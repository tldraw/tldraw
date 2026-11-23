import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { defineMessages, tltime, useValue } from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useGlobalEditor } from '../../../../utils/globalEditor'
import type { TldrawApp } from '../../../app/TldrawApp'
import { useActiveWorkspaceId } from '../../../hooks/useActiveWorkspaceId'
import { useApp } from '../../../hooks/useAppState'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../../utils/app-ui-events'
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
	renameFile: { defaultMessage: 'Rename file' },
	selected: { defaultMessage: 'selected' },
})

/** The sidebar toggles hide until an editor exists, and while it is in focus mode. */
export function useHideSidebarToggle() {
	const editor = useGlobalEditor()
	return useValue('hideSidebarToggle', () => !editor || editor.getInstanceState().isFocusMode, [
		editor,
	])
}

/** Opens a new file's name for editing in the sidebar. v3 has no sidebar, so there it does nothing. */
export function startSidebarRename(app: TldrawApp, fileId: string, workspaceId: string) {
	if (app.isUiV3Enabled) return
	app.sidebarState.update((prev) => ({ ...prev, renameState: { fileId, workspaceId } }))
}

export function useHandleSidebarCreateFile() {
	const app = useApp()
	const navigate = useNavigate()
	const trackEvent = useTldrawAppUiEvents()
	// Create the file in whichever workspace is currently active (the home
	// workspace when in Home, otherwise the selected workspace).
	const activeWorkspaceId = useActiveWorkspaceId()

	const rCanCreate = useRef(true)

	// A given name skips the rename that otherwise follows.
	return useCallback(
		async ({ name, source = 'sidebar' }: { name?: string; source?: TLAppUiEventSource } = {}) => {
			if (!rCanCreate.current) return
			// Block repeat clicks while the create is in flight, not just after it resolves, or a
			// double click makes two files.
			rCanCreate.current = false
			let fileId: string
			try {
				const res = await app.createFile({
					workspaceId: activeWorkspaceId,
					name: name || undefined,
				})
				if (!res.ok) {
					rCanCreate.current = true
					return
				}
				fileId = res.value.fileId
			} catch (e) {
				rCanCreate.current = true
				throw e
			}
			const isMobile = getIsCoarsePointer()
			if (!isMobile && !name) startSidebarRename(app, fileId, activeWorkspaceId)
			navigate(routes.tlaFile(fileId))
			trackEvent('create-file', { source })
			tltime.setTimeout('can create again', () => (rCanCreate.current = true), 1000)
			if (isMobile) {
				toggleMobileSidebar(false)
			}
		},
		[app, navigate, trackEvent, activeWorkspaceId]
	)
}
