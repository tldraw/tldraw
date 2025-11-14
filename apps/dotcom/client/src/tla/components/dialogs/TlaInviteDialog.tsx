import { SignInButton } from '@clerk/clerk-react'
import { GetInviteInfoResponseBody } from '@tldraw/dotcom-shared'
import { useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
} from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'
import { defineMessages, F } from '../../utils/i18n'
import { TlaCtaButton } from '../TlaCtaButton/TlaCtaButton'

const messages = defineMessages({
	inviteDialogTitle: {
		defaultMessage: "You've been invited to group <br></br><groupName></groupName>",
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
	const isSignedIn = !!app
	const [isAccepting, setIsAccepting] = useState(false)

	return (
		<>
			<TldrawUiDialogHeader>
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
					role="presentation"
				/>

				<div style={{ fontSize: '16px' }}>
					<F
						{...messages.inviteDialogTitle}
						values={{ groupName: () => <strong>{inviteInfo.groupName}</strong>, br: () => <br /> }}
					/>
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
					{!isSignedIn ? (
						<SignInButton
							mode="modal"
							forceRedirectUrl={`${window.location.origin}/invite/${inviteInfo.inviteSecret}?accept=true`}
							signUpForceRedirectUrl={`${window.location.origin}/invite/${inviteInfo.inviteSecret}?accept=true`}
						>
							<TlaCtaButton
								onClick={() => {
									setTimeout(() => onClose(), 100)
								}}
							>
								<F defaultMessage="Sign in to accept invitation" />
							</TlaCtaButton>
						</SignInButton>
					) : (
						<TlaCtaButton
							disabled={isAccepting}
							onClick={async () => {
								setIsAccepting(true)
								await app.acceptGroupInvite(inviteInfo.inviteSecret).finally(() => {
									setIsAccepting(false)
								})
								onClose()
							}}
						>
							<F defaultMessage="Accept and join group" />
						</TlaCtaButton>
					)}
					<TldrawUiButton type="normal" onClick={() => onClose()}>
						<F defaultMessage="No thanks" />
					</TldrawUiButton>
				</div>
			</TldrawUiDialogBody>
		</>
	)
}
