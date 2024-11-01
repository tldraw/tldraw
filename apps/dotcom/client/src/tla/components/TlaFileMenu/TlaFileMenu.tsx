/* ---------------------- Menu ---------------------- */

import { useAuth } from '@clerk/clerk-react'
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
	useDialogs,
	useToasts,
} from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useIsFileOwner } from '../../hooks/useIsFileOwner'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { copyTextToClipboard } from '../../utils/copy'
import { getFilePath, getShareableFileUrl } from '../../utils/urls'
import { TlaDeleteFileDialog } from '../dialogs/TlaDeleteFileDialog'

export function TlaFileMenu({
	children,
	source,
	fileId,
	onRenameAction,
	trigger,
}: {
	children?: ReactNode
	source: TLAppUiEventSource
	fileId: TldrawAppFile['id']
	onRenameAction(): void
	trigger: ReactNode
}) {
	const app = useApp()
	const { addDialog } = useDialogs()
	const navigate = useNavigate()
	const { addToast } = useToasts()
	const trackEvent = useTldrawAppUiEvents()
	const auth = useAuth()

	const handleCopyLinkClick = useCallback(() => {
		const url = getShareableFileUrl(fileId)
		copyTextToClipboard(url)
		addToast({
			id: 'copied-link',
			title: 'Copied link',
		})
		trackEvent('copy-file-link', { source })
	}, [fileId, addToast, trackEvent, source])

	const handleDuplicateClick = useCallback(async () => {
		const token = await auth.getToken()
		if (!token) throw Error('no token')

		const res = await app.duplicateFile(fileId.split(':')[1], token)

		if (res.ok) {
			// If the user just duplicated their current file, navigate to the new file
			if (location.pathname.endsWith(fileId)) {
				navigate(getFilePath(res.value.slug))
			} else {
				// ...otherwise, stay where they are
			}
		} else {
			// do something to indicate failure
			console.error('Failed to duplicate file')
			console.error(res.error)
		}
	}, [app, auth, navigate, fileId])

	const handleDeleteClick = useCallback(() => {
		addDialog({
			component: ({ onClose }) => <TlaDeleteFileDialog fileId={fileId} onClose={onClose} />,
		})
	}, [fileId, addDialog])

	const isOwner = useIsFileOwner(fileId)
	const fileItems = (
		<>
			<TldrawUiMenuGroup id="file-actions">
				<TldrawUiMenuItem
					label="Copy link"
					id="copy-link"
					readonlyOk
					onSelect={handleCopyLinkClick}
				/>
				{isOwner && (
					<TldrawUiMenuItem label="Rename" id="copy-link" readonlyOk onSelect={onRenameAction} />
				)}
				<TldrawUiMenuItem
					label="Duplicate"
					id="copy-link"
					readonlyOk
					onSelect={handleDuplicateClick}
				/>
				{/* <TldrawUiMenuItem label="Star" id="copy-link" onSelect={handleStarLinkClick} /> */}
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="file-delete">
				<TldrawUiMenuItem
					label={isOwner ? 'Delete' : 'Forget'}
					id="delete"
					readonlyOk
					onSelect={handleDeleteClick}
				/>
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
