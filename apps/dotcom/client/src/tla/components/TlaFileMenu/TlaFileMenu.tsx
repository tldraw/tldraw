/* ---------------------- Menu ---------------------- */

import { FILE_PREFIX, TlaFile } from '@tldraw/dotcom-shared'
import { fileOpen } from 'browser-fs-access'
import { Fragment, ReactNode, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	TLDRAW_FILE_EXTENSION,
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
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { TldrawApp } from '../../app/TldrawApp'
import { useApp, useMaybeApp } from '../../hooks/useAppState'
import { useIsFileOwner } from '../../hooks/useIsFileOwner'
import { useIsFilePinned } from '../../hooks/useIsFilePinned'
import { useFileSidebarFocusContext } from '../../providers/FileInputFocusProvider'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { copyTextToClipboard } from '../../utils/copy'
import { getCurrentEditor } from '../../utils/getCurrentEditor'
import { defineMessages, useMsg } from '../../utils/i18n'
import { editorMessages } from '../TlaEditor/editor-messages'
import { download } from '../TlaEditor/useFileEditorOverrides'
import { TlaDeleteFileDialog } from '../dialogs/TlaDeleteFileDialog'

const messages = defineMessages({
	importFile: { defaultMessage: 'Import file…' },
	copied: { defaultMessage: 'Copied link' },
	copyLink: { defaultMessage: 'Copy link' },
	delete: { defaultMessage: 'Delete' },
	duplicate: { defaultMessage: 'Duplicate' },
	file: { defaultMessage: 'File' },
	forget: { defaultMessage: 'Forget' },
	rename: { defaultMessage: 'Rename' },
	copy: { defaultMessage: 'Copy' },
	pin: { defaultMessage: 'Pin' },
	unpin: { defaultMessage: 'Unpin' },
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
	return (
		<TldrawUiDropdownMenuRoot id={`file-menu-${fileId}-${source}`}>
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

	const focusCtx = useFileSidebarFocusContext()

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
			focusCtx.shouldRenameNextNewFile = true
			navigate(routes.tlaFile(newFileId))
		}
	}, [app, fileId, focusCtx, navigate, trackEvent, source])

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

	const importFileMsg = useMsg(messages.importFile)
	const copyLinkMsg = useMsg(messages.copyLink)
	const renameMsg = useMsg(messages.rename)
	const duplicateMsg = useMsg(messages.duplicate)
	const pinMsg = useMsg(messages.pin)
	const unpinMsg = useMsg(messages.unpin)
	const deleteOrForgetMsg = useMsg(isOwner ? messages.delete : messages.forget)
	const downloadFile = useMsg(editorMessages.downloadFile)

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
				{isOwner && (
					<TldrawUiMenuItem label={renameMsg} id="copy-link" readonlyOk onSelect={onRenameAction} />
				)}
				{/* todo: in published rooms, support duplication / forking */}
				<TldrawUiMenuItem
					label={duplicateMsg}
					id="copy-link"
					readonlyOk
					onSelect={handleDuplicateClick}
				/>
				<TldrawUiMenuItem
					label={isPinned ? unpinMsg : pinMsg}
					id="pin-unpin"
					readonlyOk
					onSelect={handlePinUnpinClick}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="file-actions-2">
				<TlImportFileActionGroup label={importFileMsg} />
				<TldrawUiMenuItem
					label={downloadFile}
					id="download-file"
					readonlyOk
					onSelect={handleDownloadClick}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="file-delete">
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

function TlImportFileActionGroup({ label }: { label: string }) {
	const trackEvent = useTldrawAppUiEvents()
	const app = useMaybeApp()

	const navigate = useNavigate()

	return (
		<TldrawUiMenuGroup id="app-actions">
			<TldrawUiMenuItem
				id="about"
				label={label}
				icon="import"
				readonlyOk
				onSelect={async () => {
					const editor = getCurrentEditor()
					if (!editor) return
					if (!app) return

					trackEvent('import-tldr-file', { source: 'account-menu' })

					try {
						const tldrawFiles = await fileOpen({
							extensions: [TLDRAW_FILE_EXTENSION],
							multiple: true,
							description: 'tldraw project',
						})

						app.uploadTldrFiles(tldrawFiles, (file) => {
							navigate(routes.tlaFile(file.id), { state: { mode: 'create' } })
						})
					} catch {
						// user cancelled
						return
					}
				}}
			/>
		</TldrawUiMenuGroup>
	)
}
