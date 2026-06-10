import { fileOpen } from 'browser-fs-access'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	TLDRAW_FILE_EXTENSION,
	TldrawUiButton,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useDialogs,
} from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useApp } from '../../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { defineMessages, useMsg } from '../../../utils/i18n'
import { WorkspaceSettingsDialog } from '../../dialogs/WorkspaceSettingsDialog'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'

export const workspaceMessages = defineMessages({
	moreOptions: { defaultMessage: 'More options' },
	copyInviteLink: { defaultMessage: 'Copy invite link' },
	settings: { defaultMessage: 'Settings' },
	importFiles: { defaultMessage: 'Import file…' },
})

export function TlaSidebarWorkspaceMenu({
	workspaceId,
	className,
}: {
	workspaceId: string
	className?: string
}) {
	const moreOptionsLbl = useMsg(workspaceMessages.moreOptions)

	return (
		<TldrawUiDropdownMenuRoot id={`workspace-menu-${workspaceId}-sidebar`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>
					<TldrawUiButton
						className={className ?? styles.sidebarWorkspaceMenuButton}
						tooltip={moreOptionsLbl}
						title={moreOptionsLbl}
						type="icon"
					>
						<TlaIcon icon="dots-vertical-strong" />
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="start" alignOffset={0} sideOffset={0}>
					<WorkspaceMenuContent workspaceId={workspaceId} />
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}

export function WorkspaceMenuContent({ workspaceId }: { workspaceId: string }) {
	const app = useApp()
	const { addDialog } = useDialogs()
	const trackEvent = useTldrawAppUiEvents()
	const navigate = useNavigate()
	const copyInviteLinkMsg = useMsg(workspaceMessages.copyInviteLink)
	const settingsMsg = useMsg(workspaceMessages.settings)
	const importFilesMsg = useMsg(workspaceMessages.importFiles)

	const handleCopyInviteLinkClick = useCallback(() => {
		app.copyWorkspaceInvite(workspaceId)
	}, [app, workspaceId])

	const handleSettingsClick = useCallback(() => {
		addDialog({
			component: ({ onClose }) => (
				<WorkspaceSettingsDialog workspaceId={workspaceId} onClose={onClose} />
			),
		})
		trackEvent('open-share-menu', { source: 'sidebar' })
	}, [addDialog, workspaceId, trackEvent])

	const handleImportFilesClick = useCallback(async () => {
		trackEvent('import-tldr-file', { source: 'sidebar' })

		try {
			const tldrawFiles = await fileOpen({
				extensions: [TLDRAW_FILE_EXTENSION],
				multiple: true,
				description: 'tldraw project',
			})

			app.uploadTldrFiles(
				tldrawFiles,
				(fileId) => {
					navigate(routes.tlaFile(fileId), { state: { mode: 'create' } })
				},
				workspaceId
			)
		} catch {
			// user cancelled
			return
		}
	}, [trackEvent, app, navigate, workspaceId])

	return (
		<>
			<TldrawUiMenuGroup id="workspace-actions">
				<TldrawUiMenuItem
					label={copyInviteLinkMsg}
					id="copy-invite-link"
					readonlyOk
					onSelect={handleCopyInviteLinkClick}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="workspace-settings">
				<TldrawUiMenuItem
					label={settingsMsg}
					id="settings"
					readonlyOk
					onSelect={handleSettingsClick}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="workspace-import-file-actions">
				<TldrawUiMenuItem
					label={importFilesMsg}
					id="import-files"
					readonlyOk
					onSelect={handleImportFilesClick}
				/>
			</TldrawUiMenuGroup>
		</>
	)
}
