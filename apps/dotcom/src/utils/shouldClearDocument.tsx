import {
	Button,
	DialogBody,
	DialogCloseButton,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	TLUiDialogsContextType,
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
				<Button
					type="normal"
					onClick={() => setDontShowAgain(!dontShowAgain)}
					iconLeft={dontShowAgain ? 'checkbox-checked' : 'checkbox-empty'}
					style={{ marginRight: 'auto' }}
				>
					{msg('file-system.confirm-clear.dont-show-again')}
				</Button>
				<Button type="normal" onClick={onCancel}>
					{msg('file-system.confirm-clear.cancel')}
				</Button>
				<Button
					type="primary"
					onClick={async () => {
						if (dontShowAgain) {
							userPreferences.showFileClearWarning.set(false)
						}
						onContinue()
					}}
				>
					{msg('file-system.confirm-clear.continue')}
				</Button>
			</DialogFooter>
		</>
	)
}
