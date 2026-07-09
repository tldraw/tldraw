import {
	TlButton,
	TlButtonLabel,
	TlDialogBody,
	TlDialogCloseButton,
	TlDialogFooter,
	TlDialogHeader,
	TlDialogTitle,
} from '@tldraw/ui'
import { TLUiDialogsContextType, useTranslation } from 'tldraw'

/** @public */
export async function shouldOverrideDocument(addDialog: TLUiDialogsContextType['addDialog']) {
	const shouldContinue = await new Promise<boolean>((resolve) => {
		addDialog({
			component: ({ onClose }) => (
				<ConfirmOpenDialog
					onCancel={() => {
						resolve(false)
						onClose()
					}}
					onContinue={() => {
						resolve(true)
						onClose()
					}}
				/>
			),
			onClose: () => {
				resolve(false)
			},
		})
	})

	return shouldContinue
}

function ConfirmOpenDialog({ onCancel, onContinue }: { onCancel(): void; onContinue(): void }) {
	const msg = useTranslation()
	return (
		<>
			<TlDialogHeader>
				<TlDialogTitle>{msg('file-system.confirm-open.title')}</TlDialogTitle>
				<TlDialogCloseButton />
			</TlDialogHeader>
			<TlDialogBody style={{ maxWidth: 350 }}>
				{msg('file-system.confirm-open.description')}
			</TlDialogBody>
			<TlDialogFooter className="tlui-dialog__footer__actions">
				<TlButton type="normal" onClick={onCancel}>
					<TlButtonLabel>{msg('file-system.confirm-open.cancel')}</TlButtonLabel>
				</TlButton>
				<TlButton type="primary" onClick={async () => onContinue()}>
					<TlButtonLabel>{msg('file-system.confirm-open.open')}</TlButtonLabel>
				</TlButton>
			</TlDialogFooter>
		</>
	)
}
