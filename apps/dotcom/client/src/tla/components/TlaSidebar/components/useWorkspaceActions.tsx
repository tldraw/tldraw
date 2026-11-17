import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { uniqueId, useDialogs } from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useApp } from '../../../hooks/useAppState'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'
import { CreateWorkspaceDialog } from '../../dialogs/CreateWorkspaceDialog'

export type WorkspaceDestination = 'board' | 'workspace'

export function useSwitchToWorkspace(destination: WorkspaceDestination = 'board') {
	const app = useApp()
	const navigate = useNavigate()

	return useCallback(
		async (workspaceId: string) => {
			if (destination === 'workspace') {
				navigate(routes.tlaWorkspace(workspaceId))
				return
			}
			// Open the file the user last had open here, not just the top of the pinned-first list.
			const mostRecentFileId = app.getMostRecentFileId(workspaceId)
			if (mostRecentFileId) {
				navigate(routes.tlaFile(mostRecentFileId))
				return
			}
			// A workspace created moments ago may still be seeding its welcome file: the
			// createWorkspace mutation lands before the file does, so it briefly appears empty.
			// Await that in-flight seed and open its result rather than racing it with a duplicate
			// blank file. (On seed failure we fall through to the blank-file path below.)
			const pendingWelcome = app.getPendingWorkspaceWelcomeFile(workspaceId)
			if (pendingWelcome) {
				const seeded = await pendingWelcome
				if (seeded.ok) {
					navigate(routes.tlaFile(seeded.value.fileId))
					return
				}
			}
			// Empty workspace: create a blank file and open it, so selecting a workspace always
			// lands you on a file within it. The welcome file is seeded only when a workspace is
			// first created (see useCreateWorkspaceDialog), so an emptied workspace — like the
			// home workspace — just gets a fresh blank file to rename, not another welcome doc.
			const res = await app.createFile({ workspaceId })
			if (res.ok) {
				if (!getIsCoarsePointer()) {
					app.sidebarState.update((prev) => ({
						...prev,
						renameState: { fileId: res.value.fileId, workspaceId },
					}))
				}
				navigate(routes.tlaFile(res.value.fileId))
			}
		},
		[app, navigate, destination]
	)
}

export function useCreateWorkspaceDialog({
	source = 'sidebar',
	destination = 'board',
}: { source?: TLAppUiEventSource; destination?: WorkspaceDestination } = {}) {
	const app = useApp()
	const navigate = useNavigate()
	const { addDialog } = useDialogs()
	const switchToWorkspace = useSwitchToWorkspace(destination)
	const trackEvent = useTldrawAppUiEvents()

	return useCallback(() => {
		addDialog({
			component: ({ onClose }) => (
				<CreateWorkspaceDialog
					onClose={onClose}
					onCreate={async (name) => {
						const id = uniqueId()
						const createRes = await app.z.mutate.createWorkspace({ id, name }).client
						if (createRes.type === 'error') {
							app.showMutationRejectionToast(createRes.error)
							return
						}
						trackEvent('create-workspace', { source })
						// Seed the workspace's welcome file once, here at creation, and open it
						// directly (not via switchToWorkspace, whose empty-workspace path would
						// otherwise create a blank file before the welcome file lands).
						const res = await app.createWorkspaceWelcomeFile(id)
						if (res.ok) {
							navigate(
								destination === 'workspace'
									? routes.tlaWorkspace(id)
									: routes.tlaFile(res.value.fileId)
							)
						} else {
							// Seeding failed; still land the user in the new workspace rather than
							// leaving them stranded. switchToWorkspace creates a blank file for the
							// (now empty) workspace and opens it.
							await switchToWorkspace(id)
						}
					}}
				/>
			),
		})
	}, [app, addDialog, navigate, switchToWorkspace, trackEvent, source, destination])
}
