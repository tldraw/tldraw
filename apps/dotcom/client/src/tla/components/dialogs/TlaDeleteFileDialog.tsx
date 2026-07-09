import { useAuth } from '@clerk/clerk-react'
import {
	TlButton,
	TlButtonLabel,
	TlDialogBody,
	TlDialogCloseButton,
	TlDialogFooter,
	TlDialogHeader,
	TlDialogTitle,
} from '@tldraw/ui'
import { useNavigate } from 'react-router-dom'
import { useValue } from 'tldraw'
import { routes } from '../../../routeDefs'
import { useApp } from '../../hooks/useAppState'
import { useHasFileAdminRights } from '../../hooks/useIsFileOwner'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { F } from '../../utils/i18n'

export function TlaDeleteFileDialog({
	fileId,
	workspaceId,
	onClose,
}: {
	fileId: string
	workspaceId: string
	onClose(): void
}) {
	const app = useApp()
	const navigate = useNavigate()
	const trackEvent = useTldrawAppUiEvents()
	const auth = useAuth()

	const isOwner = useHasFileAdminRights(fileId)
	const fileName = useValue('file name', () => app.getFileName(fileId), [fileId, app])

	const handleDelete = async () => {
		const token = await auth.getToken()
		if (!token) throw new Error('No token')
		trackEvent('delete-file', { source: 'file-menu' })
		await app.deleteOrForgetFile(fileId, workspaceId)

		// Stay in the workspace the file was deleted from: go to its most recent remaining
		// file, or — if that was its last file — create a fresh blank file in it, the same
		// "always land on a file" behavior as opening an empty workspace. (Home lists its files
		// via getMyFiles rather than as a workspace.)
		const isHome = workspaceId === app.getHomeWorkspaceId()
		const remaining = isHome ? app.getMyFiles() : app.getWorkspaceFilesSorted(workspaceId)
		if (remaining.length > 0) {
			navigate(routes.tlaFile(remaining[0].fileId))
		} else {
			const result = await app.createFile({ workspaceId })
			if (result.ok) {
				navigate(routes.tlaFile(result.value.fileId))
			}
		}
		onClose()
	}

	return (
		<>
			<TlDialogHeader>
				<TlDialogTitle>
					{isOwner ? <F defaultMessage="Delete file" /> : <F defaultMessage="Forget file" />}
				</TlDialogTitle>
				<TlDialogCloseButton />
			</TlDialogHeader>
			<TlDialogBody style={{ maxWidth: 350 }}>
				<>
					{isOwner ? (
						<F
							defaultMessage="Are you sure you want to delete <strong>{fileName}</strong>?"
							values={{ fileName, strong: (chunks) => <strong>{chunks}</strong> }}
						/>
					) : (
						<F
							defaultMessage="Are you sure you want to forget <strong>{fileName}</strong>?"
							values={{ fileName, strong: (chunks) => <strong>{chunks}</strong> }}
						/>
					)}
				</>
			</TlDialogBody>
			<TlDialogFooter className="tlui-dialog__footer__actions">
				<TlButton type="normal" onClick={onClose}>
					<TlButtonLabel>
						<F defaultMessage="Cancel" />
					</TlButtonLabel>
				</TlButton>
				<TlButton type="danger" onClick={handleDelete}>
					<TlButtonLabel>
						{isOwner ? <F defaultMessage="Delete" /> : <F defaultMessage="Forget" />}
					</TlButtonLabel>
				</TlButton>
			</TlDialogFooter>
		</>
	)
}
