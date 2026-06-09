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
import { GroupSettingsDialog } from '../../dialogs/GroupSettingsDialog'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'

export const groupMessages = defineMessages({
	newFile: { defaultMessage: 'Create file' },
	moreOptions: { defaultMessage: 'More options' },
	copyInviteLink: { defaultMessage: 'Copy invite link' },
	settings: { defaultMessage: 'Settings' },
	importFiles: { defaultMessage: 'Import file…' },
	copied: { defaultMessage: 'Copied invite link' },
})

export function TlaSidebarGroupMenu({
	groupId,
	className,
}: {
	groupId: string
	className?: string
}) {
	const moreOptionsLbl = useMsg(groupMessages.moreOptions)

	return (
		<TldrawUiDropdownMenuRoot id={`group-menu-${groupId}-sidebar`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>
					<TldrawUiButton
						className={className ?? styles.sidebarGroupItemButton}
						tooltip={moreOptionsLbl}
						title={moreOptionsLbl}
						type="icon"
					>
						<TlaIcon icon="dots-vertical-strong" />
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="start" alignOffset={0} sideOffset={0}>
					<GroupMenuContent groupId={groupId} />
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}

export function GroupMenuContent({ groupId }: { groupId: string }) {
	const app = useApp()
	const { addDialog } = useDialogs()
	const trackEvent = useTldrawAppUiEvents()
	const navigate = useNavigate()
	const copyInviteLinkMsg = useMsg(groupMessages.copyInviteLink)
	const settingsMsg = useMsg(groupMessages.settings)
	const importFilesMsg = useMsg(groupMessages.importFiles)

	const handleCopyInviteLinkClick = useCallback(() => {
		app.copyGroupInvite(groupId)
	}, [app, groupId])

	const handleSettingsClick = useCallback(() => {
		addDialog({
			component: ({ onClose }) => <GroupSettingsDialog groupId={groupId} onClose={onClose} />,
		})
		trackEvent('open-share-menu', { source: 'sidebar' })
	}, [addDialog, groupId, trackEvent])

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
				groupId
			)
		} catch {
			// user cancelled
			return
		}
	}, [trackEvent, app, navigate, groupId])

	return (
		<>
			<TldrawUiMenuGroup id="group-actions">
				<TldrawUiMenuItem
					label={copyInviteLinkMsg}
					id="copy-invite-link"
					readonlyOk
					onSelect={handleCopyInviteLinkClick}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="group-settings">
				<TldrawUiMenuItem
					label={settingsMsg}
					id="settings"
					readonlyOk
					onSelect={handleSettingsClick}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="group-import-file-actions">
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
