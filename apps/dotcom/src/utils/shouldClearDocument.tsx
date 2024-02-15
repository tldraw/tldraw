import {
	DialogBody,
	DialogCloseButton,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	TLUiDialogsContextType,
	TldrawUiButton,
	TldrawUiButtonCheck,
	TldrawUiButtonLabel,
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
			<DialogHeader>
				<DialogTitle>{msg('file-system.confirm-clear.title')}</DialogTitle>
				<DialogCloseButton />
			</DialogHeader>
			<DialogBody style={{ maxWidth: 350 }}>
				{msg('file-system.confirm-clear.description')}
			</DialogBody>
			<DialogFooter className="tlui-dialog__footer__actions">
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
			</DialogFooter>
		</>
	)
}
