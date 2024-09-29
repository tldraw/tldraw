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
} from 'tldraw'
import { copyTextToClipboard } from '../../utils/copy'
import { TldrawAppFile } from '../../utils/schema/TldrawAppFile'
import { getShareableFileUrl } from '../../utils/urls'
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
	const { addDialog } = useDialogs()

	const handleCopyLinkClick = useCallback(() => {
		const url = getShareableFileUrl(fileId)
		copyTextToClipboard(url)
	}, [fileId])

	const handleRenameLinkClick = useCallback(() => {
		addDialog({
			component: ({ onClose }) => <TlaRenameFileDialog fileId={fileId} onClose={onClose} />,
		})
	}, [fileId, addDialog])

	const handleDuplicateLinkClick = useCallback(() => {
		// duplicate file
	}, [])

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
