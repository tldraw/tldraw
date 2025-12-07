import { lazy, Suspense, useState } from 'react'
import {
	fetch,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useToasts,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { defineMessages, F, useMsg } from '../../utils/i18n'
import styles from './TlaFairyInviteDialog.module.css'

const FairySprite = lazy(() =>
	import('../../../fairy/fairy-sprite/FairySprite').then((m) => ({ default: m.FairySprite }))
)

const messages = defineMessages({
	alreadyHasAccess: { defaultMessage: 'You already have fairy access!' },
	redemptionError: { defaultMessage: 'Failed to redeem invite code' },
})

export function TlaFairyInviteDialog({
	fairyInviteToken,
	onClose,
}: {
	fairyInviteToken: string
	onClose(): void
}) {
	const { addToast } = useToasts()
	const [isAccepting, setIsAccepting] = useState(false)
	const alreadyHasAccessMsg = useMsg(messages.alreadyHasAccess)
	const redemptionErrorMsg = useMsg(messages.redemptionError)

	return (
		<>
			<TldrawUiDialogHeader className={styles.dialogHeader}>
				<TldrawUiDialogTitle>
					<span />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.dialogBody}>
				<Suspense fallback={<div style={{ height: 44, width: 44 }} />}>
					<FairySprite pose="idle" hatColor="pink" hatType="default" />
				</Suspense>
				<div className={styles.message}>
					<F
						defaultMessage="You've been invited to <strong>tldraw fairies</strong>"
						values={{
							strong: (chunks) => <strong>{chunks}</strong>,
						}}
					/>
				</div>

				<button
					className={styles.acceptButton}
					disabled={isAccepting}
					onClick={async () => {
						setIsAccepting(true)
						try {
							const res = await fetch('/api/app/fairy-invite/redeem', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({ inviteCode: fairyInviteToken }),
							})
							const data = await res.json()
							if (!res.ok) {
								onClose()
								addToast({
									id: 'fairy-invite-error',
									title: data.error || redemptionErrorMsg,
								})
								return
							}
							onClose()
							if (data.alreadyHasAccess) {
								addToast({
									id: 'fairy-invite-already-has-access',
									title: alreadyHasAccessMsg,
								})
							} else {
								window.location.href = routes.tlaRoot()
							}
						} catch (err) {
							onClose()
							addToast({
								id: 'fairy-invite-error',
								title: err instanceof Error ? err.message : redemptionErrorMsg,
							})
						} finally {
							setIsAccepting(false)
						}
					}}
				>
					<F defaultMessage="Accept invite" />
				</button>
				<button className={styles.declineButton} onClick={() => onClose()}>
					<F defaultMessage="No thanks" />
				</button>
			</TldrawUiDialogBody>
		</>
	)
}
