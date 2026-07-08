import { GetInviteInfoResponseBody } from '@tldraw/dotcom-shared'
import { useState } from 'react'
import { TlDialogBody, TlDialogCloseButton, TlDialogHeader, TlDialogTitle } from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'
import { F } from '../../utils/i18n'
import styles from './TlaInviteDialog.module.css'

export function TlaInviteDialog({
	inviteInfo,
	onClose,
}: {
	inviteInfo: Extract<GetInviteInfoResponseBody, { error: false }>
	onClose(): void
}) {
	const app = useMaybeApp()
	const [isAccepting, setIsAccepting] = useState(false)

	return (
		<>
			<TlDialogHeader className={styles.dialogHeader}>
				<TlDialogTitle>
					<span />
				</TlDialogTitle>
				<TlDialogCloseButton />
			</TlDialogHeader>
			<TlDialogBody className={styles.dialogBody}>
				<div className={styles.message}>
					<F
						defaultMessage="You have been invited to join <strong>{workspaceName}</strong>."
						values={{
							workspaceName: inviteInfo.workspaceName,
							strong: (chunks) => (
								<strong>
									<br />
									{chunks}
								</strong>
							),
						}}
					/>
				</div>

				<button
					className={styles.acceptButton}
					disabled={isAccepting}
					onClick={async () => {
						if (!app) return
						setIsAccepting(true)
						await app.acceptWorkspaceInvite(inviteInfo.inviteSecret).finally(() => {
							setIsAccepting(false)
						})
						onClose()
					}}
				>
					<F defaultMessage="Accept invitation" />
				</button>
			</TlDialogBody>
		</>
	)
}
