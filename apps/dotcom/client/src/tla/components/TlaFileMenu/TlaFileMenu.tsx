/* ---------------------- Menu ---------------------- */

import { FILE_PREFIX, TlaFile, ZErrorCode } from '@tldraw/dotcom-shared'
import { Fragment, ReactNode, useCallback, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	getIncrementedName,
	uniqueId,
	useDialogs,
	useMaybeEditor,
	useToasts,
	useValue,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { TldrawApp } from '../../app/TldrawApp'
import { useApp } from '../../hooks/useAppState'
import { useHasFlag } from '../../hooks/useHasFlag'
import { useHasFileAdminRights } from '../../hooks/useIsFileOwner'
import { useIsFilePinned } from '../../hooks/useIsFilePinned'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { copyTextToClipboard } from '../../utils/copy'
import { defineMessages, useMsg } from '../../utils/i18n'
import { CreateWorkspaceDialog } from '../dialogs/CreateWorkspaceDialog'
import { TlaDeleteFileDialog } from '../dialogs/TlaDeleteFileDialog'
import { editorMessages } from '../TlaEditor/editor-messages'
import { downloadAppFile } from '../TlaEditor/useFileEditorOverrides'

const messages = defineMessages({
	copied: { defaultMessage: 'Copied link' },
	copyLink: { defaultMessage: 'Copy link' },
	delete: { defaultMessage: 'Delete' },
	duplicate: { defaultMessage: 'Duplicate' },
	forget: { defaultMessage: 'Forget' },
	rename: { defaultMessage: 'Rename' },
	copy: { defaultMessage: 'Copy' },
	pin: { defaultMessage: 'Pin file' },
	unpin: { defaultMessage: 'Unpin file' },
	myFiles: { defaultMessage: 'My files' },
})

function getDuplicateName(file: TlaFile, app: TldrawApp) {
	if (file.name.trim().length === 0) {
		return ''
	}
	const currentFileName = app.getFileName(file.id)
	const allFileNames = app.getUserOwnFiles().map((file) => file.name)
	return getIncrementedName(currentFileName, allFileNames)
}

export function TlaFileMenu({
	children,
	source,
	fileId,
	workspaceId,
	onRenameAction,
	trigger,
}: {
	children?: ReactNode
	source: TLAppUiEventSource
	fileId: string
	workspaceId: string | null
	onRenameAction(): void
	trigger: ReactNode
}) {
	const id = useId()
	const fileItemsWhenNoChildren = (
		<FileItems
			source={source}
			fileId={fileId}
			onRenameAction={onRenameAction}
			workspaceId={workspaceId}
		/>
	)
	return (
		<TldrawUiDropdownMenuRoot id={`file-menu-${fileId}-${source}-${id}`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>{trigger}</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="start" alignOffset={0} sideOffset={0}>
					{children ?? fileItemsWhenNoChildren}
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}

export function FileItems({
	source,
	fileId,
	onRenameAction,
	workspaceId,
}: {
	source: TLAppUiEventSource
	fileId: string
	onRenameAction(): void
	workspaceId: string | null
}) {
	const app = useApp()
	const editor = useMaybeEditor()
	const { addDialog } = useDialogs()
	const navigate = useNavigate()
	const { addToast } = useToasts()
	const trackEvent = useTldrawAppUiEvents()
	const copiedMsg = useMsg(messages.copied)
	const hasAdminRights = useHasFileAdminRights(fileId)
	const isPinned = useIsFilePinned(fileId, workspaceId ?? '')
	const workspacesEnabled = useHasFlag('groups_frontend')

	const file = useValue('file', () => app.getFile(fileId), [app, fileId])

	// Get all workspace memberships (including the home workspace, filtered out below)
	const workspaceMemberships = useValue(
		'workspaceMemberships',
		() => app.getWorkspaceMemberships(),
		[app]
	)

	// A file lives in exactly one workspace. The "Move to" menu is a checklist of every
	// destination — the home workspace ("My files") plus each non-home workspace — with the
	// file's current workspace checked. The home workspace is rendered separately as "My files".
	const currentWorkspaceId = file?.owningGroupId ?? app.getHomeWorkspaceId()
	const moveToWorkspaces = workspaceMemberships.filter(
		(g) => g.groupId !== app.getHomeWorkspaceId()
	)

	const handleCopyLinkClick = useCallback(() => {
		const url = routes.tlaFile(fileId, { asUrl: true })
		copyTextToClipboard(editor?.createDeepLink({ url }).toString() ?? url)
		addToast({
			id: 'copied-link',
			title: copiedMsg,
		})
		trackEvent('copy-file-link', { source })
	}, [fileId, addToast, copiedMsg, trackEvent, source, editor])

	const handlePinUnpinClick = useCallback(async () => {
		if (!workspaceId) return
		if (app.isPinned(fileId, workspaceId)) {
			app.z.mutate.unpinFile({ fileId, workspaceId })
		} else {
			app.z.mutate.pinFile({ fileId, workspaceId })
		}
	}, [app, fileId, workspaceId])

	const handleDuplicateClick = useCallback(async () => {
		if (!workspaceId) return
		const newFileId = uniqueId()
		const file = app.getFile(fileId)
		if (!file) return
		trackEvent('duplicate-file', { source })
		const res = await app.createFile({
			fileId: newFileId,
			workspaceId,
			name: getDuplicateName(file, app),
			createSource: `${FILE_PREFIX}/${fileId}`,
		})
		// copy the state too
		const prevState = app.getFileState(fileId)
		app.updateFileState(newFileId, {
			lastSessionState: prevState?.lastSessionState,
		})
		if (res.ok) {
			app.sidebarState.update((prev) => ({
				...prev,
				renameState: { fileId: newFileId, workspaceId },
			}))
			navigate(routes.tlaFile(newFileId))
		}
	}, [app, fileId, workspaceId, navigate, trackEvent, source])

	const handleDeleteClick = useCallback(() => {
		if (!workspaceId) return
		addDialog({
			component: ({ onClose }) => (
				<TlaDeleteFileDialog workspaceId={workspaceId} fileId={fileId} onClose={onClose} />
			),
		})
	}, [fileId, addDialog, workspaceId])

	const handleDownloadClick = useCallback(() => {
		trackEvent('download-file', { source })
		downloadAppFile(fileId)
	}, [fileId, source, trackEvent])

	const copyLinkMsg = useMsg(messages.copyLink)
	const renameMsg = useMsg(messages.rename)
	const duplicateMsg = useMsg(messages.duplicate)
	const pinMsg = useMsg(messages.pin)
	const unpinMsg = useMsg(messages.unpin)
	const deleteOrForgetMsg = useMsg(hasAdminRights ? messages.delete : messages.forget)
	const downloadFile = useMsg(editorMessages.downloadFile)
	const myFilesMsg = useMsg(messages.myFiles)

	return (
		<Fragment>
			<TldrawUiMenuGroup id="file-actions">
				{/* todo: in published rooms, support copying link */}
				<TldrawUiMenuItem
					label={copyLinkMsg}
					id="copy-link"
					readonlyOk
					onSelect={handleCopyLinkClick}
				/>
				{hasAdminRights && (
					<TldrawUiMenuItem label={renameMsg} id="rename" readonlyOk onSelect={onRenameAction} />
				)}
				{/* todo: in published rooms, support duplication / forking */}
				{/* todo: requires a non-trivial refactor, quick fix is to just remove this menu item, it's available elsewhere */}
				{source !== 'file-header' && (
					<TldrawUiMenuItem
						label={duplicateMsg}
						id="duplicate"
						readonlyOk
						onSelect={handleDuplicateClick}
					/>
				)}
				<TldrawUiMenuItem
					label={downloadFile}
					id="download-file"
					readonlyOk
					onSelect={handleDownloadClick}
				/>
				{workspaceId && (
					<TldrawUiMenuItem
						label={isPinned ? unpinMsg : pinMsg}
						id="pin-unpin"
						readonlyOk
						onSelect={handlePinUnpinClick}
					/>
				)}
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="file-delete">
				{workspacesEnabled && (
					<TldrawUiMenuSubmenu id="move-to-workspace" label={'Move to'} size="small">
						<TldrawUiMenuGroup id="workspaces">
							<TldrawUiMenuCheckboxItem
								key="my-files"
								label={myFilesMsg}
								id="my-files"
								readonlyOk
								checked={currentWorkspaceId === app.getHomeWorkspaceId()}
								onSelect={() => {
									if (currentWorkspaceId === app.getHomeWorkspaceId()) return
									app.z.mutate.moveFileToWorkspace({
										fileId,
										workspaceId: app.getHomeWorkspaceId(),
									})
								}}
							/>
							{moveToWorkspaces.map((membership) => (
								<TldrawUiMenuCheckboxItem
									key={membership.groupId}
									label={membership.group.name}
									id={`workspace-${membership.groupId}`}
									readonlyOk
									checked={membership.groupId === currentWorkspaceId}
									onSelect={() => {
										if (membership.groupId === currentWorkspaceId) return
										app.z.mutate.moveFileToWorkspace({ fileId, workspaceId: membership.groupId })
									}}
								/>
							))}
						</TldrawUiMenuGroup>
						<TldrawUiMenuGroup id="create-new-workspace">
							<TldrawUiMenuItem
								label="New workspace"
								id="create-new-workspace"
								iconLeft={'plus'}
								readonlyOk
								onSelect={() => {
									addDialog({
										component: ({ onClose }) => (
											<CreateWorkspaceDialog
												onClose={onClose}
												onCreate={async (name) => {
													const id = uniqueId()
													try {
														await app.z.mutate.createWorkspace({ id, name }).client
													} catch (e) {
														app.showMutationRejectionToast((e as Error).message as ZErrorCode)
														return
													}
													try {
														await app.z.mutate.moveFileToWorkspace({ fileId, workspaceId: id })
															.client
													} catch (e) {
														// the workspace was created; only the move failed
														app.showMutationRejectionToast((e as Error).message as ZErrorCode)
													}
												}}
											/>
										),
									})
								}}
							/>
						</TldrawUiMenuGroup>
					</TldrawUiMenuSubmenu>
				)}
				{workspaceId && (
					<TldrawUiMenuItem
						label={deleteOrForgetMsg}
						id="delete"
						readonlyOk
						onSelect={handleDeleteClick}
					/>
				)}
			</TldrawUiMenuGroup>
		</Fragment>
	)
}
