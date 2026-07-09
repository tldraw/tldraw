import {
	TlButton,
	TlButtonLabel,
	TlDialogBody,
	TlDialogCloseButton,
	TlDialogFooter,
	TlDialogHeader,
	TlDialogTitle,
} from '@tldraw/ui'
import { ReactNode } from 'react'

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
			<TlDialogHeader>
				<TlDialogTitle>{title}</TlDialogTitle>
				<TlDialogCloseButton />
			</TlDialogHeader>
			<TlDialogBody style={{ maxWidth: 300 }}>
				<p>{description}</p>
			</TlDialogBody>
			<TlDialogFooter className="tlui-dialog__footer__actions">
				<TlButton type="normal" onClick={onClose}>
					<TlButtonLabel>{cancelLabel}</TlButtonLabel>
				</TlButton>
				<TlButton
					type={confirmType}
					onClick={async () => {
						await onConfirm()
						onClose()
					}}
				>
					<TlButtonLabel>{confirmLabel}</TlButtonLabel>
				</TlButton>
			</TlDialogFooter>
		</>
	)
}
