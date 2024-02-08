import { Button, Dialog, TLUiDialogsContextType, useTranslation } from '@tldraw/tldraw'
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
			<Dialog.Header>
				<Dialog.Title>{msg('file-system.confirm-open.title')}</Dialog.Title>
				<Dialog.CloseButton />
			</Dialog.Header>
			<Dialog.Body style={{ maxWidth: 350 }}>
				{msg('file-system.confirm-open.description')}
			</Dialog.Body>
			<Dialog.Footer className="tlui-dialog__footer__actions">
				<Button
					type="normal"
					onClick={() => setDontShowAgain(!dontShowAgain)}
					iconLeft={dontShowAgain ? 'checkbox-checked' : 'checkbox-empty'}
					style={{ marginRight: 'auto' }}
				>
					{msg('file-system.confirm-open.dont-show-again')}
				</Button>
				<Button type="normal" onClick={onCancel}>
					{msg('file-system.confirm-open.cancel')}
				</Button>
				<Button
					type="primary"
					onClick={async () => {
						if (dontShowAgain) {
							userPreferences.showFileOpenWarning.set(false)
						}
						onContinue()
					}}
				>
					{msg('file-system.confirm-open.open')}
				</Button>
			</Dialog.Footer>
		</>
	)
}
