/* ---------------------- Menu ---------------------- */

import { TldrawAppFile } from '@tldraw/dotcom-shared'
import { ReactNode, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	tltime,
	useDialogs,
	useToasts,
} from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { copyTextToClipboard } from '../../utils/copy'
import { getCurrentEditor } from '../../utils/getCurrentEditor'
import { getFileUrl, getShareableFileUrl } from '../../utils/urls'
import { TlaDeleteFileDialog } from '../dialogs/TlaDeleteFileDialog'

export function TlaFileMenu({
	children,
	source,
	fileId,
	onRenameAction,
	trigger,
}: {
	children?: ReactNode
	source: string
	fileId: TldrawAppFile['id']
	onRenameAction(): void
	trigger: ReactNode
}) {
	const app = useApp()
	const { addDialog } = useDialogs()
	const navigate = useNavigate()
	const { addToast } = useToasts()

	const handleCopyLinkClick = useCallback(() => {
		const url = getShareableFileUrl(fileId)
		copyTextToClipboard(url)
		addToast({
			id: 'copied-link',
			title: 'Copied link',
		})
	}, [fileId, addToast])

	const handleDuplicateClick = useCallback(() => {
		const { newFile, editorStoreSnapshot } = app.duplicateFile(fileId)

		tltime.setTimeout(
			'app',
			() => {
				navigate(getFileUrl(newFile.id))

				if (editorStoreSnapshot) {
					tltime.setTimeout(
						'app',
						() => {
							// TODO: this is very BK, we should do this server-side
							// this is the same in TlaEditor...we need to fix this
							getCurrentEditor()?.store.loadStoreSnapshot(editorStoreSnapshot)
						},
						1000
					)
				}
				// TODO: we need to get a better indicator of when this operation is ready
				// this is the same in TlaEditor...we need to fix this
			},
			1000
		)
	}, [app, navigate, fileId])

	const handleDeleteClick = useCallback(() => {
		addDialog({
			component: ({ onClose }) => <TlaDeleteFileDialog fileId={fileId} onClose={onClose} />,
		})
	}, [fileId, addDialog])

	const fileItems = (
		<>
			<TldrawUiMenuGroup id="file-actions">
				<TldrawUiMenuItem label="Copy link" id="copy-link" onSelect={handleCopyLinkClick} />
				<TldrawUiMenuItem label="Rename" id="copy-link" onSelect={onRenameAction} />
				<TldrawUiMenuItem label="Duplicate" id="copy-link" onSelect={handleDuplicateClick} />
				{/* <TldrawUiMenuItem label="Star" id="copy-link" onSelect={handleStarLinkClick} /> */}
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="file-delete">
				<TldrawUiMenuItem label="Delete" id="delete" onSelect={handleDeleteClick} />
			</TldrawUiMenuGroup>
		</>
	)

	const fileItemsWrapper = children ? (
		<TldrawUiMenuSubmenu id="file" label="menu.file">
			{fileItems}
		</TldrawUiMenuSubmenu>
	) : (
		fileItems
	)

	return (
		<TldrawUiDropdownMenuRoot id={`file-menu-${fileId}-${source}`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>{trigger}</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="start" alignOffset={0} sideOffset={0}>
					{fileItemsWrapper}
					{children}
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}
