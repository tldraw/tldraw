import { TLServerMessageType } from '@tldraw/sync-core'
import { useCallback } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useDialogs,
	useUiEvents,
} from 'tldraw'
import { F } from './i18n'

function RoomSizeWarningDialog({ onClose }: { onClose(): void }) {
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Room Size Warning" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody>
				<F defaultMessage="This room is getting quite large." />
				<br />
				<F defaultMessage="Consider removing some content to keep it running smoothly." />
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="primary" onClick={onClose}>
					<TldrawUiButtonLabel>
						<F defaultMessage="OK" />
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
					<F defaultMessage="Room Size Limit Reached" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody>
				<F defaultMessage="This room is now full." />
				<br />
				<F defaultMessage="You'll need to remove some content before adding anything new." />
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="primary" onClick={onClose}>
					<TldrawUiButtonLabel>
						<F defaultMessage="OK" />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}

/**
 * Custom hook that creates room size message handlers
 * @returns onMessage callback that handles room size warnings and limits
 */
export function useRoomSizeMessageHandler() {
	const { addDialog } = useDialogs()
	const trackEvent = useUiEvents()

	const onMessage = useCallback(
		(messageType: TLServerMessageType) => {
			switch (messageType) {
				case 'room_size_warning':
					trackEvent('room-size-warning-dialog-shown', { source: 'dialog' })
					addDialog({
						component: ({ onClose }: { onClose(): void }) => (
							<RoomSizeWarningDialog onClose={onClose} />
						),
					})
					break
				case 'room_size_limit_reached':
					trackEvent('room-size-limit-dialog-shown', { source: 'dialog' })
					addDialog({
						component: ({ onClose }: { onClose(): void }) => (
							<RoomSizeLimitDialog onClose={onClose} />
						),
					})
					break
			}
		},
		[addDialog, trackEvent]
	)

	return onMessage
}
