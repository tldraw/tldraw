import { SignInButton } from '@clerk/clerk-react'
import { GetInviteInfoResponseBody } from '@tldraw/dotcom-shared'
import { useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { useMaybeApp } from '../../hooks/useAppState'
import { defineMessages, F } from '../../utils/i18n'
import { TlaCtaButton } from '../TlaCtaButton/TlaCtaButton'

const messages = defineMessages({
	inviteDialogTitle: {
		defaultMessage: "You've been invited to group:",
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
	const redirectUrl = routes.tlaInvite(inviteInfo.inviteSecret, {
		asUrl: true,
		searchParams: { accept: 'true' },
	})

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
					role="presentation"
				/>

				<div style={{ fontSize: '16px' }}>
					<F {...messages.inviteDialogTitle} /> {inviteInfo.groupName}
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
					{!isSignedIn ? (
						<SignInButton
							mode="modal"
							forceRedirectUrl={redirectUrl}
							signUpForceRedirectUrl={redirectUrl}
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
