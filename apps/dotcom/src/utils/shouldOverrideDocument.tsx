import {
	TLUiDialogsContextType,
	TldrawUiButton,
	TldrawUiButtonCheck,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useTranslation,
} from '@tldraw/tldraw'
import { useState } from 'react'
import { userPreferences } from './userPreferences'

export async function shouldOverrideDocument(addDialog: TLUiDialogsContextType['addDialog']) {
	if (userPreferences.showFileOpenWarning.get()) {
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
	return true
}

function ConfirmOpenDialog({
	onCancel,
	onContinue,
}: {
	onCancel: () => void
	onContinue: () => void
}) {
	const msg = useTranslation()
	const [dontShowAgain, setDontShowAgain] = useState(false)
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>{msg('file-system.confirm-open.title')}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>
				{msg('file-system.confirm-open.description')}
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton
					type="normal"
					onClick={() => setDontShowAgain(!dontShowAgain)}
					style={{ marginRight: 'auto' }}
				>
					<TldrawUiButtonCheck checked={dontShowAgain} />
					<TldrawUiButtonLabel>
						{msg('file-system.confirm-open.dont-show-again')}
					</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton type="normal" onClick={onCancel}>
					<TldrawUiButtonLabel>{msg('file-system.confirm-open.cancel')}</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton
					type="primary"
					onClick={async () => {
						if (dontShowAgain) {
							userPreferences.showFileOpenWarning.set(false)
						}
						onContinue()
					}}
				>
					<TldrawUiButtonLabel>{msg('file-system.confirm-open.open')}</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
