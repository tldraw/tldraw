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
 * Custom hook that creates reusable callbacks for room size warnings and limits
 * @returns Object containing onRoomSizeWarning and onRoomSizeLimitReached callbacks
 */
export function useRoomSizeCallbacks() {
	const { addDialog } = useDialogs()

	const onRoomSizeWarning = useCallback(() => {
		addDialog({
			component: ({ onClose }) => <RoomSizeWarningDialog onClose={onClose} />,
			onClose: () => {
				// Dialog closed
			},
		})
	}, [addDialog])

	const onRoomSizeLimitReached = useCallback(() => {
		addDialog({
			component: ({ onClose }) => <RoomSizeLimitDialog onClose={onClose} />,
			onClose: () => {
				// Dialog closed
			},
		})
	}, [addDialog])

	return {
		onRoomSizeWarning,
		onRoomSizeLimitReached,
	}
}
