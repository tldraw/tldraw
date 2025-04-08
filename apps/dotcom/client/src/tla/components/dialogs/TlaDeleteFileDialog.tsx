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
import { useIsFileOwner } from '../../hooks/useIsFileOwner'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { F } from '../../utils/i18n'

export function TlaDeleteFileDialog({ fileId, onClose }: { fileId: string; onClose(): void }) {
	const app = useApp()
	const navigate = useNavigate()
	const trackEvent = useTldrawAppUiEvents()
	const auth = useAuth()

	const isOwner = useIsFileOwner(fileId)

	const handleDelete = useCallback(async () => {
		const token = await auth.getToken()
		if (!token) throw new Error('No token')
		trackEvent('delete-file', { source: 'file-menu' })
		await app.deleteOrForgetFile(fileId)
		const recentFiles = app.getUserRecentFiles()
		if (recentFiles.length === 0) {
			const result = await app.createFile()
			if (result.ok) {
				navigate(routes.tlaFile(result.value.file.id))
			}
		} else {
			navigate(routes.tlaFile(recentFiles[0].fileId))
		}
		onClose()
	}, [auth, app, fileId, onClose, navigate, trackEvent])

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
