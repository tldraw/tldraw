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
import { useApp } from '../../hooks/useAppState'
import { useRaw } from '../../hooks/useRaw'

export function TlaDeleteFileDialog({
	fileId,
	onClose,
}: {
	fileId: TldrawAppFileId
	onClose(): void
}) {
	const app = useApp()
	const raw = useRaw()
	const location = useLocation()
	const navigate = useNavigate()

	const handleDelete = useCallback(() => {
		app.deleteFile(fileId)
		if (location.pathname.endsWith(TldrawAppFileRecordType.parseId(fileId))) {
			navigate('/q')
		}
		onClose()
	}, [app, fileId, location.pathname, navigate, onClose])

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>{raw('Delete file')}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>
				<>{raw('Are you sure you want to delete this file?')}</>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onClose}>
					<TldrawUiButtonLabel>{raw('Cancel')}</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton type="danger" onClick={handleDelete}>
					<TldrawUiButtonLabel>{raw('Delete')}</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
