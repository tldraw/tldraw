import { useEffect } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useDialogs,
} from 'tldraw'
import { F } from '../../../utils/i18n'
import styles from './sneaky-legacy-modal.module.css'

function LegacyChangesModal({ onClose }: { onClose(): void }) {
	return (
		<div className={styles.dialog}>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="This room will soon be read-only" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody>
				<p>
					<F defaultMessage="After July 1st, 2025 this anonymous tldraw multiplayer room will become read-only. To continue editing in the future please sign in and copy it to your files." />
				</p>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className={styles.footer}>
				<TldrawUiButton type="normal" onClick={onClose} onTouchEnd={onClose}>
					<TldrawUiButtonLabel>
						<F defaultMessage="Close" />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</div>
	)
}

export function SneakyLegacyModal() {
	const { addDialog, removeDialog } = useDialogs()

	useEffect(() => {
		const id = addDialog({
			component: ({ onClose }) => <LegacyChangesModal onClose={onClose} />,
			preventBackgroundClose: true,
		})
		return () => {
			removeDialog(id)
		}
	}, [addDialog, removeDialog])
	return null
}
