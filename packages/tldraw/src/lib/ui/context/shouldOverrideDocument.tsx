import { TldrawUiButton } from '../components/primitives/Button/TldrawUiButton'
import { TldrawUiButtonLabel } from '../components/primitives/Button/TldrawUiButtonLabel'
import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from '../components/primitives/TldrawUiDialog'
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
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>{msg('file-system.confirm-open.title')}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>
				{msg('file-system.confirm-open.description')}
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onCancel}>
					<TldrawUiButtonLabel>{msg('file-system.confirm-open.cancel')}</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton type="primary" onClick={async () => onContinue()}>
					<TldrawUiButtonLabel>{msg('file-system.confirm-open.open')}</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
