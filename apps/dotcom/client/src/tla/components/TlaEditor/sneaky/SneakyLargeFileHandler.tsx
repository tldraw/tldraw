import { useEffect, useState } from 'react'
import {
	TlButton,
	TlButtonLabel,
	TlDialogBody,
	TlDialogCloseButton,
	TlDialogFooter,
	TlDialogHeader,
	TlDialogTitle,
	useDialogs,
	useEditor,
	useValue,
} from 'tldraw'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { F } from '../../../utils/i18n'

function RoomSizeWarningDialog({ onClose }: { onClose(): void }) {
	return (
		<>
			<TlDialogHeader>
				<TlDialogTitle>
					<F defaultMessage="File is getting large" />
				</TlDialogTitle>
				<TlDialogCloseButton />
			</TlDialogHeader>
			<TlDialogBody style={{ maxWidth: 350 }}>
				<F defaultMessage="This file is approaching its size limit. Consider removing some content or starting a new file." />
			</TlDialogBody>
			<TlDialogFooter className="tlui-dialog__footer__actions">
				<TlButton type="primary" onClick={onClose}>
					<TlButtonLabel>
						<F defaultMessage="Got it" />
					</TlButtonLabel>
				</TlButton>
			</TlDialogFooter>
		</>
	)
}

function RoomSizeLimitDialog({ onClose }: { onClose(): void }) {
	return (
		<>
			<TlDialogHeader>
				<TlDialogTitle>
					<F defaultMessage="File is full" />
				</TlDialogTitle>
				<TlDialogCloseButton />
			</TlDialogHeader>
			<TlDialogBody style={{ maxWidth: 350 }}>
				<F defaultMessage="This file has reached its size limit and changes might no longer be saved. Remove some content or start a new file." />
			</TlDialogBody>
			<TlDialogFooter className="tlui-dialog__footer__actions">
				<TlButton type="primary" onClick={onClose}>
					<TlButtonLabel>
						<F defaultMessage="Got it" />
					</TlButtonLabel>
				</TlButton>
			</TlDialogFooter>
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
