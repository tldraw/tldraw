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
import { useCanUpdateFile } from '../../hooks/useCanUpdateFile'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { useHasFlag } from '../../hooks/useHasFlag'
import { useIsFileOwner } from '../../hooks/useIsFileOwner'
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
	pin: { defaultMessage: 'Add to favorites' },
	unpin: { defaultMessage: 'Remove from favorites' },
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
	onRenameAction,
	trigger,
}: {
	children?: ReactNode
	source: TLAppUiEventSource
	fileId: string
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
						<FileItems source={source} fileId={fileId} onRenameAction={onRenameAction} />
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
}: {
	source: TLAppUiEventSource
	fileId: string
	onRenameAction(): void
}) {
	const app = useApp()
	const editor = useMaybeEditor()
	const { addDialog } = useDialogs()
	const navigate = useNavigate()
	const { addToast } = useToasts()
	const trackEvent = useTldrawAppUiEvents()
	const copiedMsg = useMsg(messages.copied)
	const isOwner = useIsFileOwner(fileId)
	const isPinned = useIsFilePinned(fileId)
	const isActive = useCurrentFileId() === fileId
	const hasGroups = useHasFlag('groups')

	const file = useValue('file', () => app.getFile(fileId), [app, fileId])

	// Get groups data
	const groupMembers = useValue('groupMembers', () => app.getGroupMemberships(), [app])

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
		app.pinOrUnpinFile(fileId)
	}, [app, fileId])

	const handleDuplicateClick = useCallback(async () => {
		const newFileId = uniqueId()
		const file = app.getFile(fileId)
		if (!file) return
		trackEvent('duplicate-file', { source })
		const res = await app.createFile({
			id: newFileId,
			name: getDuplicateName(file, app),
			createSource: `${FILE_PREFIX}/${fileId}`,
		})
		// copy the state too
		const prevState = app.getFileState(fileId)
		app.createFileStateIfNotExists(newFileId)
		app.updateFileState(newFileId, {
			lastSessionState: prevState?.lastSessionState,
		})
		if (res.ok) {
			app.ensureFileVisibleInSidebar(newFileId)
			patch(app.sidebarState).renameState({ fileId: newFileId, context: 'my-files' })
			navigate(routes.tlaFile(newFileId))
		}
	}, [app, fileId, navigate, trackEvent, source])

	const handleDeleteClick = useCallback(() => {
		addDialog({
			component: ({ onClose }) => <TlaDeleteFileDialog fileId={fileId} onClose={onClose} />,
		})
	}, [fileId, addDialog])

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
	const deleteOrForgetMsg = useMsg(isOwner ? messages.delete : messages.forget)
	const canUpdateFile = useCanUpdateFile(fileId)
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
				{canUpdateFile && (
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
				<TldrawUiMenuItem
					label={isPinned ? unpinMsg : pinMsg}
					id="pin-unpin"
					readonlyOk
					onSelect={handlePinUnpinClick}
				/>
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
											!groupMembers.some((groupUser) => groupUser.group.id === file?.owningGroupId)
										}
									/>
								}
								readonlyOk
								onSelect={() => {
									app.z.mutate.group.ungroupFile({ fileId })
								}}
							/>
						</TldrawUiMenuGroup>
						{groupMembers.length > 0 && (
							<TldrawUiMenuGroup id="my-groups">
								{groupMembers.map((groupUser) => (
									<TldrawUiMenuItem
										key={groupUser.groupId}
										label={groupUser.group.name}
										id={`group-${groupUser.groupId}`}
										iconLeft={
											<TldrawUiButtonCheck checked={groupUser.group.id === file?.owningGroupId} />
										}
										readonlyOk
										onSelect={() => {
											app.z.mutate.group.moveFileToGroup({ fileId, groupId: groupUser.groupId })
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
													app.z.mutate.group.create({ id, name })
													app.z.mutate.group.moveFileToGroup({ fileId, groupId: id })
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
				<TldrawUiMenuItem
					label={deleteOrForgetMsg}
					id="delete"
					readonlyOk
					onSelect={handleDeleteClick}
				/>
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
