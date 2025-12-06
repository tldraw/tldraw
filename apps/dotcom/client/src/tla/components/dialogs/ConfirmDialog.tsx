import { ReactNode } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'

export function ConfirmDialog({
	title,
	description,
	confirmLabel,
	cancelLabel,
	confirmType = 'primary',
	onConfirm,
	onClose,
}: {
	title: ReactNode
	description: ReactNode
	confirmLabel: ReactNode
	cancelLabel: ReactNode
	confirmType?: 'primary' | 'danger' | 'normal'
	onConfirm(): void | Promise<void>
	onClose(): void
}) {
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>{title}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 300 }}>
				<p>{description}</p>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onClose}>
					<TldrawUiButtonLabel>{cancelLabel}</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton
					type={confirmType}
					onClick={async () => {
						await onConfirm()
						onClose()
					}}
				>
					<TldrawUiButtonLabel>{confirmLabel}</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
