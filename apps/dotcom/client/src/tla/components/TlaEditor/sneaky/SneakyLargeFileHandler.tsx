import { useEffect, useState } from 'react'
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

function RoomSizeWarningDialog({ onClose }: { onClose(): void }) {
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Room getting large" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>
				<F defaultMessage="This room is approaching its size limit. Consider removing some content or starting a new file." />
			</TldrawUiDialogBody>
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

function RoomSizeLimitDialog({ onClose }: { onClose(): void }) {
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Room is full" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>
				<F defaultMessage="This room has reached its size limit and changes might no longer be saved. Remove some content or start a new file." />
			</TldrawUiDialogBody>
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
			addDialog({
				component: ({ onClose }: { onClose(): void }) => <RoomSizeLimitDialog onClose={onClose} />,
			})
			setSizeLimitShown(true)
		} else if (!sizeLimitShown && !sizeWarningShown && storageUsedPercentage > 75) {
			trackEvent('room-size-warning-dialog-shown', { source: 'dialog' })
			addDialog({
				component: ({ onClose }: { onClose(): void }) => (
					<RoomSizeWarningDialog onClose={onClose} />
				),
			})
			setSizeWarningShown(true)
		}
	}, [storageUsedPercentage, sizeLimitShown, sizeWarningShown, addDialog, trackEvent])

	return null
}
