import { useAuth } from '@clerk/clerk-react'
import { useLayoutEffect, useRef } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import {
	F,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useValue,
} from 'tldraw'
import { ROUTES, routes } from '../../../routeDefs'
import { useApp } from '../../hooks/useAppState'
import { useHasFileAdminRights } from '../../hooks/useIsFileOwner'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { TlaButton } from '../TlaButton/TlaButton'
import styles from './dialogs.module.css'

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
	const fileRoute = useMatch({ path: ROUTES.tlaFile, end: false })
	const trackEvent = useTldrawAppUiEvents()
	const auth = useAuth()
	const anchorRef = useRef<HTMLDivElement>(null)
	useLayoutEffect(() => {
		const content = anchorRef.current?.closest('.tlui-dialog__content')
		if (!(content instanceof HTMLElement)) return
		content.classList.add(styles.deleteFileDialog)
		content.style.alignSelf = 'start'
		content.style.marginTop = '8vh'
		content.style.maxHeight = '84vh'
		return () => content.classList.remove(styles.deleteFileDialog)
	}, [])

	const isOwner = useHasFileAdminRights(fileId)
	const fileName = useValue('file name', () => app.getFileName(fileId), [fileId, app])

	const handleDelete = async () => {
		const token = await auth.getToken()
		if (!token) throw new Error('No token')
		const deleted = await app.deleteOrForgetFile(fileId, workspaceId)
		if (!deleted) {
			onClose()
			return
		}
		trackEvent('delete-file', { source: 'file-menu' })

		// Gallery deletions must not open or create another board.
		if (fileRoute?.params.fileSlug !== fileId) {
			onClose()
			return
		}

		// Replace the open board within the same workspace, even when it was the last board.
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
			<div ref={anchorRef} hidden />
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					{isOwner ? <F defaultMessage="Delete file" /> : <F defaultMessage="Forget file" />}
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.deleteFileBody}>
				<p>
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
				</p>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter>
				<TlaButton variant="secondary" className={styles.deleteCancel} onClick={onClose}>
					<F defaultMessage="Cancel" />
				</TlaButton>
				<TlaButton className={styles.deleteConfirm} onClick={handleDelete}>
					{isOwner ? <F defaultMessage="Delete" /> : <F defaultMessage="Forget" />}
				</TlaButton>
			</TldrawUiDialogFooter>
		</>
	)
}
