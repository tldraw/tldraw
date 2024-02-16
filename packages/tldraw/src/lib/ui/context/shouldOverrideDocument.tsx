import { Button } from '../components/primitives/Button'
import {
	DialogBody,
	DialogCloseButton,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '../components/primitives/Dialog'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { TLUiDialogsContextType } from './dialogs'

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

function ConfirmOpenDialog({
	onCancel,
	onContinue,
}: {
	onCancel: () => void
	onContinue: () => void
}) {
	const msg = useTranslation()

	return (
		<>
			<DialogHeader>
				<DialogTitle>{msg('file-system.confirm-open.title')}</DialogTitle>
				<DialogCloseButton />
			</DialogHeader>
			<DialogBody style={{ maxWidth: 350 }}>
				{msg('file-system.confirm-open.description')}
			</DialogBody>
			<DialogFooter className="tlui-dialog__footer__actions">
				<Button type="normal" onClick={onCancel}>
					{msg('file-system.confirm-open.cancel')}
				</Button>
				<Button type="primary" onClick={async () => onContinue()}>
					{msg('file-system.confirm-open.open')}
				</Button>
			</DialogFooter>
		</>
	)
}
