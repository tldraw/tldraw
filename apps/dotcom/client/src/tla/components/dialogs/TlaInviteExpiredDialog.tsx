import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'
import { sadFaceIcon } from '../../../components/ErrorPage/ErrorPage'
import { F } from '../../utils/i18n'
import styles from './TlaInviteExpiredDialog.module.css'

export function TlaInviteExpiredDialog({ onClose }: { onClose(): void }) {
	return (
		<>
			<TldrawUiDialogHeader className={styles.dialogHeader}>
				<TldrawUiDialogTitle>
					<span />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.dialogBody}>
				{sadFaceIcon}
				<h1 className={styles.header}>
					<F defaultMessage="This invite link has expired" />
				</h1>
				<p className={styles.message}>
					<F defaultMessage="Ask the workspace owner for a new one." />
				</p>
				<button className={styles.okButton} onClick={onClose}>
					<F defaultMessage="OK" />
				</button>
			</TldrawUiDialogBody>
		</>
	)
}
