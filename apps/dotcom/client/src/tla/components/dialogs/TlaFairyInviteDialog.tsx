import { useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	fetch,
	useToasts,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { F, defineMessages, useMsg } from '../../utils/i18n'
import { TlaCtaButton } from '../TlaCtaButton/TlaCtaButton'

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
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<span />
				</TldrawUiDialogTitle>
				<div style={{ flex: 1 }} />
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody
				style={{
					textAlign: 'center',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: '16px',
				}}
			>
				<img
					width={36}
					height={36}
					src="/tldraw-white-on-black.svg"
					loading="lazy"
					alt="tldraw logo"
				/>

				<div style={{ fontSize: '16px' }}>
					<F defaultMessage="You've been invited to join tldraw fairies!" />
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
					<TlaCtaButton
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
						<F defaultMessage="Accept invitation" />
					</TlaCtaButton>
					<TldrawUiButton type="normal" onClick={() => onClose()}>
						<F defaultMessage="No thanks" />
					</TldrawUiButton>
				</div>
			</TldrawUiDialogBody>
		</>
	)
}
