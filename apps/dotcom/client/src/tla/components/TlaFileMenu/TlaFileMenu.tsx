import { FILE_PREFIX, TlaFile } from '@tldraw/dotcom-shared'
import { Fragment, ReactNode, useCallback, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	CommandPalettePromptItem,
	defineMessages,
	getIncrementedName,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	TLUiMenuContextType,
	uniqueId,
	useDialogs,
	useMaybeEditor,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { TldrawApp } from '../../app/TldrawApp'
import { useActiveWorkspaceId } from '../../hooks/useActiveWorkspaceId'
import { useApp } from '../../hooks/useAppState'
import { useHasFileAdminRights } from '../../hooks/useIsFileOwner'
import { useIsFilePinned } from '../../hooks/useIsFilePinned'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { copyTextToClipboard } from '../../utils/copy'
import { CreateWorkspaceDialog } from '../dialogs/CreateWorkspaceDialog'
import { TlaDeleteFileDialog } from '../dialogs/TlaDeleteFileDialog'
import { TLA_MENU_POSITION } from '../tla-menu/tla-menu'
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
	myWorkspace: { defaultMessage: 'My workspace' },
	moveTo: { defaultMessage: 'Move to' },
	newWorkspace: { defaultMessage: 'New workspace' },
	// The palette mixes file and shape commands, so file items name their target there.
	copyFileLink: { defaultMessage: 'Copy file link' },
	renameFile: { defaultMessage: 'Rename file' },
	fileName: { defaultMessage: 'File name' },
	duplicateFile: { defaultMessage: 'Duplicate file' },
	deleteFile: { defaultMessage: 'Delete file' },
	forgetFile: { defaultMessage: 'Forget file' },
	moveFileTo: { defaultMessage: 'Move file to' },
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
				{/* Sidebar menus hang ~8px over the sidebar's right edge, so they keep the shared
				    side/collision offsets but override alignOffset (the default is tuned for the
				    share/select menus, which would leave these looking inset). */}
				<TldrawUiDropdownMenuContent
					side="bottom"
					align="end"
					{...TLA_MENU_POSITION}
					alignOffset={-16}
				>
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
	menuType = 'menu',
}: {
	source: TLAppUiEventSource
	fileId: string
	// Not needed in the command palette, which asks for the new name itself.
	onRenameAction?(): void
	workspaceId: string | null
	menuType?: TLUiMenuContextType
}) {
	const inPalette = menuType === 'command-palette'
	// The palette keeps one entry per id: unprefixed, duplicate/delete clash with the SDK actions
	// and one of each pair silently vanishes.
	const idPrefix = inPalette ? 'file-' : ''
	const msg = useTranslation()
	const app = useApp()
	const editor = useMaybeEditor()
	const { addDialog } = useDialogs()
	const navigate = useNavigate()
	const { addToast } = useToasts()
	const trackEvent = useTldrawAppUiEvents()
	const copiedMsg = msg(messages.copied)
	const hasAdminRights = useHasFileAdminRights(fileId)
	const isPinned = useIsFilePinned(fileId, workspaceId)
	const activeWorkspaceId = useActiveWorkspaceId()

	const file = useValue('file', () => app.getFile(fileId), [app, fileId])
	const homeWorkspaceId = app.getHomeWorkspaceId()
	const workspaceMemberships = useValue(
		'workspaceMemberships',
		() => app.getWorkspaceMemberships(),
		[app]
	)

	// The workspace that owns the file, which the user can't necessarily write to (see
	// activeWorkspaceId).
	const fileWorkspaceId = file?.owningGroupId ?? homeWorkspaceId
	const homeWorkspaceName = workspaceMemberships.find((g) => g.groupId === homeWorkspaceId)?.group
		?.name
	const moveTargets = [
		{
			workspaceId: homeWorkspaceId,
			itemId: 'my-files',
			label: homeWorkspaceName ?? msg(messages.myWorkspace),
		},
		...workspaceMemberships.flatMap((g) =>
			g.groupId !== homeWorkspaceId && g.group
				? [{ workspaceId: g.groupId, itemId: `workspace-${g.groupId}`, label: g.group.name }]
				: []
		),
		// In the palette every row must do something, so the file's current workspace is hidden.
	].filter((target) => !(inPalette && target.workspaceId === fileWorkspaceId))

	const labels = inPalette
		? {
				copyLink: messages.copyFileLink,
				duplicate: messages.duplicateFile,
				deleteOrForget: hasAdminRights ? messages.deleteFile : messages.forgetFile,
				moveTo: messages.moveFileTo,
			}
		: {
				copyLink: messages.copyLink,
				duplicate: messages.duplicate,
				deleteOrForget: hasAdminRights ? messages.delete : messages.forget,
				moveTo: messages.moveTo,
			}

	const handleCopyLinkClick = useCallback(() => {
		const url = routes.tlaFile(fileId, { asUrl: true })
		// The mounted editor is the open file's, which a sidebar row may not be. The header and the
		// palette only show the open file.
		const deepLink =
			source === 'file-header' || source === 'command-palette'
				? editor?.createDeepLink({ url }).toString()
				: null
		copyTextToClipboard(deepLink ?? url)
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
		// The sidebar passes the workspace the file is listed under; the file header doesn't, so
		// fall back to the user's active workspace. This matches the sidebar (and unlike the file's
		// own owning workspace, it's always one the user can write to — e.g. a guest duplicating a
		// shared file gets the copy in their home workspace, not the owner's).
		const targetWorkspaceId = workspaceId ?? activeWorkspaceId
		if (!targetWorkspaceId) return
		const newFileId = uniqueId()
		const file = app.getFile(fileId)
		if (!file) return
		trackEvent('duplicate-file', { source })
		const res = await app.createFile({
			fileId: newFileId,
			workspaceId: targetWorkspaceId,
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
				renameState: { fileId: newFileId, workspaceId: targetWorkspaceId },
			}))
			navigate(routes.tlaFile(newFileId))
		}
	}, [app, fileId, workspaceId, activeWorkspaceId, navigate, trackEvent, source])

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

	const handleMoveToWorkspace = useCallback(
		(targetWorkspaceId: string) => {
			if (targetWorkspaceId === fileWorkspaceId) return
			app.z.mutate.moveFileToWorkspace({ fileId, workspaceId: targetWorkspaceId })
		},
		[app, fileId, fileWorkspaceId]
	)

	const handleMoveToNewWorkspace = useCallback(() => {
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
						const moveRes = await app.z.mutate.moveFileToWorkspace({ fileId, workspaceId: id })
							.client
						if (moveRes.type === 'error') {
							// the workspace was created; only the move failed
							app.showMutationRejectionToast(moveRes.error)
						}
					}}
				/>
			),
		})
	}, [addDialog, app, fileId, source, trackEvent])

	return (
		<Fragment>
			<TldrawUiMenuGroup id={`${idPrefix}file-actions`}>
				<TldrawUiMenuItem
					label={msg(labels.copyLink)}
					id={`${idPrefix}copy-link`}
					readonlyOk
					onSelect={handleCopyLinkClick}
				/>
				{hasAdminRights && (
					<FileRenameItem
						fileId={fileId}
						source={source}
						idPrefix={idPrefix}
						inPalette={inPalette}
						onRenameAction={onRenameAction}
					/>
				)}
				<TldrawUiMenuItem
					label={msg(labels.duplicate)}
					id={`${idPrefix}duplicate`}
					readonlyOk
					onSelect={handleDuplicateClick}
				/>
				<TldrawUiMenuItem
					label={msg(editorMessages.downloadFile)}
					id={`${idPrefix}download-file`}
					readonlyOk
					onSelect={handleDownloadClick}
				/>
				{workspaceId && (
					<TldrawUiMenuItem
						label={msg(isPinned ? messages.unpin : messages.pin)}
						id={`${idPrefix}pin-unpin`}
						readonlyOk
						onSelect={handlePinUnpinClick}
					/>
				)}
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id={`${idPrefix}file-delete`}>
				{hasAdminRights && (
					<TldrawUiMenuSubmenu
						id={`${idPrefix}move-to-workspace`}
						label={msg(labels.moveTo)}
						size="small"
					>
						<TldrawUiMenuGroup id={`${idPrefix}workspaces`}>
							{moveTargets.map((target) => (
								<TldrawUiMenuCheckboxItem
									key={target.itemId}
									label={target.label}
									id={`${idPrefix}${target.itemId}`}
									readonlyOk
									checked={target.workspaceId === fileWorkspaceId}
									onSelect={() => handleMoveToWorkspace(target.workspaceId)}
								/>
							))}
						</TldrawUiMenuGroup>
						<TldrawUiMenuGroup id={`${idPrefix}create-new-workspace`}>
							<TldrawUiMenuItem
								label={msg(messages.newWorkspace)}
								id={`${idPrefix}create-new-workspace`}
								iconLeft={'plus'}
								readonlyOk
								onSelect={handleMoveToNewWorkspace}
							/>
						</TldrawUiMenuGroup>
					</TldrawUiMenuSubmenu>
				)}
				{workspaceId && (
					<TldrawUiMenuItem
						label={msg(labels.deleteOrForget)}
						id={`${idPrefix}delete`}
						readonlyOk
						onSelect={handleDeleteClick}
					/>
				)}
			</TldrawUiMenuGroup>
		</Fragment>
	)
}

function FileRenameItem({
	fileId,
	source,
	idPrefix,
	inPalette,
	onRenameAction,
}: {
	fileId: string
	source: TLAppUiEventSource
	idPrefix: string
	inPalette: boolean
	onRenameAction?(): void
}) {
	const msg = useTranslation()
	const app = useApp()
	const trackEvent = useTldrawAppUiEvents()

	if (inPalette) {
		return (
			<CommandPalettePromptItem
				id={`${idPrefix}rename`}
				label={messages.renameFile.id}
				placeholder={messages.fileName.id}
				initialValue={app.getFileName(fileId, false)}
				onSubmit={(name) => {
					if (!name) return
					app.updateFile(fileId, { name })
					trackEvent('rename-file', { name, source })
				}}
			/>
		)
	}
	if (!onRenameAction) return null
	return (
		<TldrawUiMenuItem
			label={msg(messages.rename)}
			id={`${idPrefix}rename`}
			readonlyOk
			onSelect={onRenameAction}
		/>
	)
}
