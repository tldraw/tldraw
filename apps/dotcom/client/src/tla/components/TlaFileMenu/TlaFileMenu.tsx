/* ---------------------- Menu ---------------------- */

import { FILE_PREFIX, TlaFile } from '@tldraw/dotcom-shared'
import { patch } from 'patchfork'
import { Fragment, ReactNode, useCallback, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	TLDRAW_FILE_EXTENSION,
	TldrawUiButtonCheck,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
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
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { useHasFlag } from '../../hooks/useHasFlag'
import { useHasFileAdminRights } from '../../hooks/useIsFileOwner'
import { useIsFilePinned } from '../../hooks/useIsFilePinned'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { copyTextToClipboard } from '../../utils/copy'
import { defineMessages, useMsg } from '../../utils/i18n'
import { CreateGroupDialog } from '../dialogs/CreateGroupDialog'
import { TlaDeleteFileDialog } from '../dialogs/TlaDeleteFileDialog'
import { editorMessages } from '../TlaEditor/editor-messages'
import { download } from '../TlaEditor/useFileEditorOverrides'
import { TlaIcon } from '../TlaIcon/TlaIcon'

const messages = defineMessages({
	copied: { defaultMessage: 'Copied link' },
	copyLink: { defaultMessage: 'Copy link' },
	delete: { defaultMessage: 'Delete' },
	duplicate: { defaultMessage: 'Duplicate' },
	file: { defaultMessage: 'File' },
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
	groupId,
	onRenameAction,
	trigger,
}: {
	children?: ReactNode
	source: TLAppUiEventSource
	fileId: string
	groupId: string | null
	onRenameAction(): void
	trigger: ReactNode
}) {
	const id = useId()
	return (
		<TldrawUiDropdownMenuRoot id={`file-menu-${fileId}-${source}-${id}`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>{trigger}</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="start" alignOffset={0} sideOffset={0}>
					<FileItemsWrapper showAsSubMenu={!!children}>
						<FileItems
							source={source}
							fileId={fileId}
							onRenameAction={onRenameAction}
							groupId={groupId}
						/>
					</FileItemsWrapper>
					{children}
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}

export function FileItems({
	source,
	fileId,
	onRenameAction,
	groupId,
}: {
	source: TLAppUiEventSource
	fileId: string
	onRenameAction(): void
	groupId: string | null
}) {
	const app = useApp()
	const editor = useMaybeEditor()
	const { addDialog } = useDialogs()
	const navigate = useNavigate()
	const { addToast } = useToasts()
	const trackEvent = useTldrawAppUiEvents()
	const copiedMsg = useMsg(messages.copied)
	const hasAdminRights = useHasFileAdminRights(fileId)
	const isPinned = useIsFilePinned(fileId, groupId ? app.resolveGroupId(groupId) : '')
	const isActive = useCurrentFileId() === fileId
	const hasGroups = useHasFlag('groups_frontend')

	const file = useValue('file', () => app.getFile(fileId), [app, fileId])

	// Get groups data (excluding the home group, which is shown as "My files")
	const groupMemberships = useValue(
		'groupMembers',
		() => app.getGroupMemberships().filter((g) => g.groupId !== app.getHomeGroupId()),
		[app]
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
		if (!groupId) return
		const actualGroupId = app.resolveGroupId(groupId)
		if (app.isPinned(fileId, actualGroupId)) {
			app.z.mutate.unpinFile({ fileId, groupId: actualGroupId })
		} else {
			app.z.mutate.pinFile({ fileId, groupId: actualGroupId })
		}
	}, [app, fileId, groupId])

	const handleDuplicateClick = useCallback(async () => {
		const newFileId = uniqueId()
		const file = app.getFile(fileId)
		if (!file) return
		trackEvent('duplicate-file', { source })
		const res = await app.createFile({
			fileId: newFileId,
			name: getDuplicateName(file, app),
			createSource: `${FILE_PREFIX}/${fileId}`,
		})
		// copy the state too
		const prevState = app.getFileState(fileId)
		app.updateFileState(newFileId, {
			lastSessionState: prevState?.lastSessionState,
		})
		if (res.ok) {
			app.ensureFileVisibleInSidebar(newFileId)
			patch(app.sidebarState).renameState({ fileId: newFileId, groupId: 'my-files' })
			navigate(routes.tlaFile(newFileId))
		}
	}, [app, fileId, navigate, trackEvent, source])

	const handleDeleteClick = useCallback(() => {
		if (!groupId) return
		addDialog({
			component: ({ onClose }) => (
				<TlaDeleteFileDialog
					groupId={app.resolveGroupId(groupId)}
					fileId={fileId}
					onClose={onClose}
				/>
			),
		})
	}, [fileId, addDialog, groupId, app])

	const untitledProject = useMsg(editorMessages.untitledProject)
	const handleDownloadClick = useCallback(async () => {
		if (!editor) return
		const defaultName =
			app.getFileName(fileId, false) ?? editor.getDocumentSettings().name ?? untitledProject
		trackEvent('download-file', { source })
		await download(editor, defaultName + TLDRAW_FILE_EXTENSION)
	}, [app, editor, fileId, source, trackEvent, untitledProject])

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
				<TldrawUiMenuItem
					label={duplicateMsg}
					id="duplicate"
					readonlyOk
					onSelect={handleDuplicateClick}
				/>
				{!source.startsWith('sidebar') ||
					(isActive && (
						// TODO: make a /download/:fileId endpoint so we can download any file
						// from the sidebar, not just the active one
						<TldrawUiMenuItem
							label={downloadFile}
							id="download-file"
							readonlyOk
							onSelect={handleDownloadClick}
						/>
					))}
				{groupId && (
					<TldrawUiMenuItem
						label={isPinned ? unpinMsg : pinMsg}
						id="pin-unpin"
						readonlyOk
						onSelect={handlePinUnpinClick}
					/>
				)}
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="file-delete">
				{hasGroups && (
					<TldrawUiMenuSubmenu id="move-to-group" label={'Move to'} size="small">
						<TldrawUiMenuGroup id="my-files">
							<TldrawUiMenuItem
								key="my-files"
								label={myFilesMsg}
								id="my-files"
								iconLeft={
									<TldrawUiButtonCheck
										checked={
											app.canUpdateFile(fileId)
												? // if we can update the file then either it is ours or it is in a group we are a member of
													!groupMemberships.some(
														(groupUser) => groupUser.group.id === file?.owningGroupId
													)
												: // if it's just a shared file we got a link to, then we need to check whether there's a group_file for it
													!groupMemberships.some((groupUser) =>
														groupUser.groupFiles.some((g) => g.fileId === fileId)
													)
										}
									/>
								}
								readonlyOk
								onSelect={() => {
									app.z.mutate.moveFileToGroup({ fileId, groupId: app.getHomeGroupId() })
								}}
							/>
						</TldrawUiMenuGroup>
						{groupMemberships.length > 0 && (
							<TldrawUiMenuGroup id="my-groups">
								{groupMemberships.map((groupUser) => (
									<TldrawUiMenuItem
										key={groupUser.groupId}
										label={groupUser.group.name}
										id={`group-${groupUser.groupId}`}
										iconLeft={
											<TldrawUiButtonCheck
												checked={
													app.canUpdateFile(fileId)
														? groupUser.group.id === file?.owningGroupId
														: groupUser.groupFiles.some((g) => g.fileId === fileId)
												}
											/>
										}
										readonlyOk
										onSelect={() => {
											app.z.mutate.moveFileToGroup({ fileId, groupId: groupUser.groupId })
											app.ensureSidebarGroupExpanded(groupUser.groupId)
										}}
									/>
								))}
							</TldrawUiMenuGroup>
						)}
						<TldrawUiMenuGroup id="create-new-group">
							<TldrawUiMenuItem
								label="New group"
								id="create-new-group"
								readonlyOk
								icon={<TlaIcon icon="plus" />}
								onSelect={() => {
									addDialog({
										component: ({ onClose }) => (
											<CreateGroupDialog
												onClose={onClose}
												onCreate={(name) => {
													const id = uniqueId()
													app.z.mutate.createGroup({ id, name })
													app.z.mutate.moveFileToGroup({ fileId, groupId: id })
													app.ensureSidebarGroupExpanded(id)
												}}
											/>
										),
									})
								}}
							/>
						</TldrawUiMenuGroup>
					</TldrawUiMenuSubmenu>
				)}
				{groupId && (
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

export function FileItemsWrapper({
	showAsSubMenu,
	children,
}: {
	showAsSubMenu: boolean
	children: ReactNode
}) {
	const fileSubmenuMsg = useMsg(messages.file)

	if (showAsSubMenu) {
		return (
			<TldrawUiMenuSubmenu id="file" label={fileSubmenuMsg}>
				{children}
			</TldrawUiMenuSubmenu>
		)
	}

	return children
}
