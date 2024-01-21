import {
	Button,
	Dialog,
	TLUiDialogsContextType,
	useLocalStorageState,
	useTranslation,
} from '@tldraw/tldraw'
import { userPreferences } from './userPreferences'

export async function shouldLeaveSharedProject(addDialog: TLUiDialogsContextType['addDialog']) {
	if (userPreferences.showFileOpenWarning.get()) {
		const shouldContinue = await new Promise<boolean>((resolve) => {
			addDialog({
				component: ({ onClose }) => (
					<ConfirmLeaveDialog
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

function ConfirmLeaveDialog({
	onCancel,
	onContinue,
}: {
	onCancel: () => void
	onContinue: () => void
}) {
	const msg = useTranslation()
	const [dontShowAgain, setDontShowAgain] = useLocalStorageState('confirm-leave', false)

	return (
		<>
			<Dialog.Header>
				<Dialog.Title>{msg('sharing.confirm-leave.title')}</Dialog.Title>
				<Dialog.CloseButton />
			</Dialog.Header>
			<Dialog.Body style={{ maxWidth: 350 }}>
				{msg('sharing.confirm-leave.description')}
			</Dialog.Body>
			<Dialog.Footer className="tlui-dialog__footer__actions">
				<Button
					type="normal"
					onClick={() => setDontShowAgain(!dontShowAgain)}
					iconLeft={dontShowAgain ? 'checkbox-checked' : 'checkbox-empty'}
					style={{ marginRight: 'auto' }}
				>
					{msg('sharing.confirm-leave.dont-show-again')}
				</Button>
				<Button type="normal" onClick={onCancel}>
					{msg('sharing.confirm-leave.cancel')}
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
					{msg('sharing.confirm-leave.leave')}
				</Button>
			</Dialog.Footer>
		</>
	)
}
