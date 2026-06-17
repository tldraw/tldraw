import { GetInviteInfoResponseBody } from '@tldraw/dotcom-shared'
import { useState } from 'react'
import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'
import { defineMessages, F } from '../../utils/i18n'
import styles from './TlaInviteDialog.module.css'

const messages = defineMessages({
	inviteDialogTitle: {
		defaultMessage: 'Join workspace',
	},
	inviteDialogDescription: {
		defaultMessage: 'You have been invited to join <strong>{workspaceName}</strong>.',
	},
})

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
			<TldrawUiDialogHeader className={styles.dialogHeader}>
				<TldrawUiDialogTitle>
					<span />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.dialogBody}>
				<div className={styles.message}>
					<F
						{...messages.inviteDialogDescription}
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
			</TldrawUiDialogBody>
		</>
	)
}
