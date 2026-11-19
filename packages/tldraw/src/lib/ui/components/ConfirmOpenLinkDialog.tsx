import { openWindow } from '@tldraw/editor'
import { useCallback } from 'react'
import { TLUiDialogProps } from '../context/dialogs'
import { F } from '../context/i18n'
import { TldrawUiButton } from './primitives/Button/TldrawUiButton'
import { TldrawUiButtonLabel } from './primitives/Button/TldrawUiButtonLabel'
import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from './primitives/TldrawUiDialog'

/** @internal */
export function ConfirmOpenLinkDialog({ url, onClose }: TLUiDialogProps & { url: string }) {
	const handleOpen = useCallback(() => {
		openWindow(url, '_blank')
		onClose()
	}, [url, onClose])

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Open external link?" id="confirm-open-link-dialog.title" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>
				<p>
					<F
						defaultMessage="This link opens another app on your device. Only continue if you trust where it came from."
						id="confirm-open-link-dialog.detail"
					/>
				</p>
				<p className="tlui-confirm-open-link-dialog__url">{url}</p>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onClose}>
					<TldrawUiButtonLabel>
						<F defaultMessage="Cancel" id="confirm-open-link-dialog.cancel" />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton type="primary" onClick={handleOpen}>
					<TldrawUiButtonLabel>
						<F defaultMessage="Open link" id="confirm-open-link-dialog.open" />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
