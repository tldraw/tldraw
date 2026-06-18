import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'
import { sadFaceIcon } from '../../../components/ErrorPage/ErrorPage'
import { F } from '../../utils/i18n'
import { TlaButton } from '../TlaButton/TlaButton'
import styles from './TlaInviteExpiredDialog.module.css'

export function TlaInviteExpiredDialog({ onClose }: { onClose(): void }) {
	return (
		<>
			<TldrawUiDialogHeader className={styles.dialogHeader}>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.dialogBody}>
				{sadFaceIcon}
				<TldrawUiDialogTitle className={styles.header}>
					<F defaultMessage="This invite link has expired" />
				</TldrawUiDialogTitle>
				<p className={styles.message}>
					<F defaultMessage="Ask the workspace owner for a new one." />
				</p>
				<TlaButton variant="cta" className={styles.okButton} onClick={onClose}>
					<F defaultMessage="OK" />
				</TlaButton>
			</TldrawUiDialogBody>
		</>
	)
}
