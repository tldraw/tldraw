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
import { F } from '../../utils/i18n'
import styles from './sneaky-legacy-modal.module.css'

function LegacyChangesModal({ onClose }: { onClose(): void }) {
	return (
		<div className={styles.dialog}>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Upcoming changes to old rooms" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody>
				<p>
					<F
						defaultMessage="Editing of old multiplayer rooms is going away on the <important>1st of July 2025</important>. To continue editing this room past this date please sign in and copy it to your files. Viewing the rooms will remain unchanged."
						values={{
							important: (msg) => <strong>{msg}</strong>,
						}}
					/>
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
