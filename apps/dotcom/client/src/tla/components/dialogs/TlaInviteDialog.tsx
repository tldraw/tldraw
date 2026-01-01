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
		defaultMessage: 'You have been invited to join group:',
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
				<img
					className={styles.icon}
					src="/tldraw-white-on-black.svg"
					loading="lazy"
					role="presentation"
				/>
				<div className={styles.message}>
					<F {...messages.inviteDialogTitle} /> {inviteInfo.groupName}
				</div>

				<button
					className={styles.acceptButton}
					disabled={isAccepting}
					onClick={async () => {
						if (!app) return
						setIsAccepting(true)
						await app.acceptGroupInvite(inviteInfo.inviteSecret).finally(() => {
							setIsAccepting(false)
						})
						onClose()
					}}
				>
					<F defaultMessage="Accept and join group" />
				</button>
				<button className={styles.declineButton} onClick={onClose}>
					<F defaultMessage="No thanks" />
				</button>
			</TldrawUiDialogBody>
		</>
	)
}
