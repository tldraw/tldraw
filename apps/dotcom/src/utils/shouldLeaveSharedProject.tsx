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
			<DialogHeader>
				<DialogTitle>{msg('sharing.confirm-leave.title')}</DialogTitle>
				<DialogCloseButton />
			</DialogHeader>
			<DialogBody style={{ maxWidth: 350 }}>{msg('sharing.confirm-leave.description')}</DialogBody>
			<DialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton
					type="normal"
					style={{ marginRight: 'auto' }}
					onClick={() => setDontShowAgain(!dontShowAgain)}
				>
					<TldrawUiButtonCheck checked={dontShowAgain} />
					<TldrawUiButtonLabel>{msg('sharing.confirm-leave.dont-show-again')}</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton type="normal" onClick={onCancel}>
					<TldrawUiButtonLabel>{msg('sharing.confirm-leave.cancel')}</TldrawUiButtonLabel>
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
					<TldrawUiButtonLabel>{msg('sharing.confirm-leave.leave')}</TldrawUiButtonLabel>
				</TldrawUiButton>
			</DialogFooter>
		</>
	)
}
