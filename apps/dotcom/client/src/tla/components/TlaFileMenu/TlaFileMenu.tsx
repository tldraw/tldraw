/* ---------------------- Menu ---------------------- */

import { ReactNode, useCallback } from 'react'
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
import { useDbFile } from '../../hooks/db-hooks'
import { copyTextToClipboard } from '../../utils/copy'
import { getShareableFileUrl } from '../../utils/urls'
import { TlaRenameFileDialog } from '../dialogs/TlaRenameFileDialog'
// import { useApp } from '../../hooks/useAppState'

export function TlaFileMenu({
	fileId,
	source,
	children,
}: {
	children: ReactNode
	source: string
	fileId: string
}) {
	const { addDialog } = useDialogs()
	const { addToast } = useToasts()
	// const navigate = useNavigate()

	const file = useDbFile(fileId)

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
		// const newFile = app.duplicateFile(auth.userId, fileId)
		// navigate(getFileUrl(newFile.id))
	}, [])

	const handleDeleteLinkClick = useCallback(() => {
		// app.deleteFile(fileId)
	}, [])

	if (!file) return null

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
						{/* <TldrawUiMenuItem label="Star" id="copy-link" onSelect={handleStarLinkClick} /> */}
					</TldrawUiMenuGroup>
					<TldrawUiMenuGroup id="file-delete">
						<TldrawUiMenuItem label="Delete" id="delete" onSelect={handleDeleteLinkClick} />
					</TldrawUiMenuGroup>
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}
