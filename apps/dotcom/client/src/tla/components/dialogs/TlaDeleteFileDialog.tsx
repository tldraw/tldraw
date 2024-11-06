import { useAuth } from '@clerk/clerk-react'
import { TldrawAppFileId, TldrawAppFileRecordType } from '@tldraw/dotcom-shared'
import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'
import { F } from '../../app/i18n'
import { useApp } from '../../hooks/useAppState'
import { useIsFileOwner } from '../../hooks/useIsFileOwner'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { getRootPath } from '../../utils/urls'

export function TlaDeleteFileDialog({
	fileId,
	onClose,
}: {
	fileId: TldrawAppFileId
	onClose(): void
}) {
	const app = useApp()
	const location = useLocation()
	const navigate = useNavigate()
	const trackEvent = useTldrawAppUiEvents()
	const auth = useAuth()

	const isOwner = useIsFileOwner(fileId)

	const handleDelete = useCallback(async () => {
		const token = await auth.getToken()
		if (!token) throw new Error('No token')
		const result = await app.deleteOrForgetFile(fileId, token)
		if (result.ok) {
			if (location.pathname.endsWith(TldrawAppFileRecordType.parseId(fileId))) {
				navigate(getRootPath())
			}
			trackEvent('delete-file', { source: 'file-menu' })
			onClose()
		} else {
			// ...um, show a error line in the dialog? try again?
		}
	}, [app, fileId, location.pathname, navigate, onClose, auth, trackEvent])

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
