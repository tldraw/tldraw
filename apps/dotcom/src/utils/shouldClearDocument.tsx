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

export async function shouldClearDocument(addDialog: TLUiDialogsContextType['addDialog']) {
	if (userPreferences.showFileClearWarning.get()) {
		const shouldContinue = await new Promise<boolean>((resolve) => {
			addDialog({
				component: ({ onClose }) => (
					<ConfirmClearDialog
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

function ConfirmClearDialog({
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
				<TldrawUiDialogTitle>{msg('file-system.confirm-clear.title')}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>
				{msg('file-system.confirm-clear.description')}
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton
					type="normal"
					onClick={() => setDontShowAgain(!dontShowAgain)}
					style={{ marginRight: 'auto' }}
				>
					<TldrawUiButtonCheck checked={dontShowAgain} />
					<TldrawUiButtonLabel>
						{msg('file-system.confirm-clear.dont-show-again')}
					</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton type="normal" onClick={onCancel}>
					<TldrawUiButtonLabel>{msg('file-system.confirm-clear.cancel')}</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton
					type="primary"
					onClick={async () => {
						if (dontShowAgain) {
							userPreferences.showFileClearWarning.set(false)
						}
						onContinue()
					}}
				>
					<TldrawUiButtonLabel>{msg('file-system.confirm-clear.continue')}</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
