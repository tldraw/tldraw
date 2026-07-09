import { TlDialogBody, TlDialogCloseButton, TlDialogHeader, TlDialogTitle } from '@tldraw/ui'
import { sadFaceIcon } from '../../../components/ErrorPage/ErrorPage'
import { F } from '../../utils/i18n'
import { TlaButton } from '../TlaButton/TlaButton'
import styles from './TlaInviteExpiredDialog.module.css'

export function TlaInviteExpiredDialog({ onClose }: { onClose(): void }) {
	return (
		<>
			<TlDialogHeader className={styles.dialogHeader}>
				<TlDialogCloseButton />
			</TlDialogHeader>
			<TlDialogBody className={styles.dialogBody}>
				{sadFaceIcon}
				<TlDialogTitle className={styles.header}>
					<F defaultMessage="This invite link has expired" />
				</TlDialogTitle>
				<p className={styles.message}>
					<F defaultMessage="Ask the workspace owner for a new one." />
				</p>
				<TlaButton variant="cta" className={styles.okButton} onClick={onClose}>
					<F defaultMessage="OK" />
				</TlaButton>
			</TlDialogBody>
		</>
	)
}
