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
} from 'tldraw'
import { useTldrawAppUiEvents } from './app-ui-events'
import { F } from './i18n'

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

/**
 * Custom hook that creates room size message handlers
 * @returns onMessage callback that handles room size warnings and limits
 */
export function useRoomSizeMessageHandler() {
	const { addDialog } = useDialogs()
	const trackEvent = useTldrawAppUiEvents()

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
