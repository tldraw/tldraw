import { useAuth } from '@clerk/clerk-react'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { useApp } from '../../hooks/useAppState'
import { useHasFileAdminRights } from '../../hooks/useIsFileOwner'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { F } from '../../utils/i18n'

export function TlaDeleteFileDialog({
	fileId,
	groupId,
	onClose,
}: {
	fileId: string
	groupId: string
	onClose(): void
}) {
	const app = useApp()
	const navigate = useNavigate()
	const trackEvent = useTldrawAppUiEvents()
	const auth = useAuth()

	const isOwner = useHasFileAdminRights(fileId)

	const handleDelete = useCallback(async () => {
		const token = await auth.getToken()
		if (!token) throw new Error('No token')
		trackEvent('delete-file', { source: 'file-menu' })
		await app.deleteOrForgetFile(fileId, groupId)

		// Prefer staying within the group the file was deleted from: navigate to the
		// top of its remaining files so the sidebar scrolls to the current group
		// instead of jumping up to my files.
		const groupFiles = groupId === app.getHomeGroupId() ? [] : app.getGroupFilesSorted(groupId)
		if (groupFiles.length > 0) {
			app.ensureFileVisibleInSidebar(groupFiles[0].fileId)
			navigate(routes.tlaFile(groupFiles[0].fileId))
		} else {
			// Deleting from my files, or the group is now empty: fall back to my files,
			// creating a new file if there are none.
			const recentFiles = app.getMyFiles()
			if (recentFiles.length === 0) {
				const result = await app.createFile()
				if (result.ok) {
					navigate(routes.tlaFile(result.value.fileId))
				}
			} else {
				navigate(routes.tlaFile(recentFiles[0].fileId))
			}
		}
		onClose()
	}, [auth, app, fileId, groupId, onClose, navigate, trackEvent])

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					{isOwner ? <F defaultMessage="Delete file" /> : <F defaultMessage="Forget file" />}
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>
				<>
					{isOwner ? (
						<F defaultMessage="Are you sure you want to delete this file?" />
					) : (
						<F defaultMessage="Are you sure you want to forget this file?" />
					)}
				</>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onClose}>
					<TldrawUiButtonLabel>
						<F defaultMessage="Cancel" />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton type="danger" onClick={handleDelete}>
					<TldrawUiButtonLabel>
						{isOwner ? <F defaultMessage="Delete" /> : <F defaultMessage="Forget" />}
					</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
