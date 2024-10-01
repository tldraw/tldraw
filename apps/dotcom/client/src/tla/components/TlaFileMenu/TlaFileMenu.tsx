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
	useDialogs,
	useToasts,
} from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { copyTextToClipboard } from '../../utils/copy'
import { getFileUrl, getShareableFileUrl } from '../../utils/urls'
import { TlaRenameFileDialog } from '../dialogs/TlaRenameFileDialog'

export function TlaFileMenu({
	children,
	source,
	fileId,
}: {
	children: ReactNode
	source: string
	fileId: TldrawAppFile['id']
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

	const handleRenameLinkClick = useCallback(() => {
		addDialog({
			component: ({ onClose }) => <TlaRenameFileDialog fileId={fileId} onClose={onClose} />,
		})
	}, [fileId, addDialog])

	const handleDuplicateLinkClick = useCallback(() => {
		// duplicate file
		const { auth } = app.getSessionState()
		if (!auth) throw Error('expected auth')
		const newFile = app.duplicateFile(auth.userId, fileId)

		navigate(getFileUrl(newFile.id))
	}, [app, navigate, fileId])

	const handleStarLinkClick = useCallback(() => {
		// toggle star file
	}, [])

	const handleDeleteLinkClick = useCallback(() => {
		// toggle star file
	}, [])

	return (
		<TldrawUiDropdownMenuRoot id={`file-menu-${fileId}-${source}`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>{children}</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="start" alignOffset={0} sideOffset={0}>
					<TldrawUiMenuGroup id="file-actions">
						<TldrawUiMenuItem label="Copy link" id="copy-link" onSelect={handleCopyLinkClick} />
						<TldrawUiMenuItem label="Rename" id="copy-link" onSelect={handleRenameLinkClick} />
						<TldrawUiMenuItem
							label="Duplicate"
							id="copy-link"
							onSelect={handleDuplicateLinkClick}
						/>
						<TldrawUiMenuItem label="Star" id="copy-link" onSelect={handleStarLinkClick} />
					</TldrawUiMenuGroup>
					<TldrawUiMenuGroup id="file-delete">
						<TldrawUiMenuItem label="Delete" id="delete" onSelect={handleDeleteLinkClick} />
					</TldrawUiMenuGroup>
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}
