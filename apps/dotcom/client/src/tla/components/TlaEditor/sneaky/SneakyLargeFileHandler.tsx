import { ReactNode, useEffect, useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useDialogs,
	useEditor,
	useValue,
} from 'tldraw'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { F } from '../../../utils/i18n'

function RoomSizeDialog({
	title,
	body,
	onClose,
}: {
	title: ReactNode
	body: ReactNode
	onClose(): void
}) {
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>{title}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>{body}</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="primary" onClick={onClose}>
					<TldrawUiButtonLabel>
						<F defaultMessage="Got it" />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}

function RoomSizeWarningDialog({ onClose }: { onClose(): void }) {
	return (
		<RoomSizeDialog
			title={<F defaultMessage="File is getting large" />}
			body={
				<F defaultMessage="This file is approaching its size limit. Consider removing some content or starting a new file." />
			}
			onClose={onClose}
		/>
	)
}

function RoomSizeLimitDialog({ onClose }: { onClose(): void }) {
	return (
		<RoomSizeDialog
			title={<F defaultMessage="File is full" />}
			body={
				<F defaultMessage="This file has reached its size limit and changes might no longer be saved. Remove some content or start a new file." />
			}
			onClose={onClose}
		/>
	)
}

export function SneakyLargeFileHander() {
	const [sizeWarningShown, setSizeWarningShown] = useState(false)
	const [sizeLimitShown, setSizeLimitShown] = useState(false)
	const { addDialog } = useDialogs()
	const trackEvent = useTldrawAppUiEvents()
	const editor = useEditor()
	const storageUsedPercentage = useValue(
		'storageUsagePercentage',
		() => editor.getDocumentSettings().meta.storageUsedPercentage ?? 0,
		[editor]
	) as number

	useEffect(() => {
		if (!sizeLimitShown && storageUsedPercentage > 90) {
			trackEvent('room-size-limit-dialog-shown', { source: 'dialog' })
			addDialog({ component: RoomSizeLimitDialog })
			setSizeLimitShown(true)
		} else if (!sizeLimitShown && !sizeWarningShown && storageUsedPercentage > 75) {
			trackEvent('room-size-warning-dialog-shown', { source: 'dialog' })
			addDialog({ component: RoomSizeWarningDialog })
			setSizeWarningShown(true)
		}
	}, [storageUsedPercentage, sizeLimitShown, sizeWarningShown, addDialog, trackEvent])

	return null
}
