import { useUser } from '@clerk/clerk-react'
import { hasActiveFairyAccess } from '@tldraw/dotcom-shared'
import { useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	fetch,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { useMaybeApp } from '../../hooks/useAppState'
import { F } from '../../utils/i18n'
import { TlaCtaButton } from '../TlaCtaButton/TlaCtaButton'

export function TlaFairyInviteDialog({
	fairyInviteToken,
	onClose,
}: {
	fairyInviteToken: string
	onClose(): void
}) {
	const app = useMaybeApp()
	const { user: clerkUser } = useUser()
	const [isAccepting, setIsAccepting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Check if user already has active fairy access
	const user = app?.getUser()
	const userHasActiveFairyAccess =
		clerkUser && user ? hasActiveFairyAccess(clerkUser, user.fairyAccessExpiresAt) : false

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

				{userHasActiveFairyAccess ? (
					<>
						<div style={{ fontSize: '16px' }}>
							<F defaultMessage="You already have fairy access!" />
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
							<TldrawUiButton type="normal" onClick={() => onClose()}>
								<F defaultMessage="Close" />
							</TldrawUiButton>
						</div>
					</>
				) : (
					<>
						<div style={{ fontSize: '16px' }}>
							<F defaultMessage="You've been invited to join tldraw fairies!" />
						</div>

						{error && (
							<div style={{ color: 'var(--tla-color-warning)', fontSize: 14 }}>{error}</div>
						)}

						<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
							<TlaCtaButton
								disabled={isAccepting}
								onClick={async () => {
									setIsAccepting(true)
									setError(null)
									try {
										const res = await fetch('/api/app/fairy-invite/redeem', {
											method: 'POST',
											headers: { 'Content-Type': 'application/json' },
											body: JSON.stringify({ inviteCode: fairyInviteToken }),
										})
										const data = await res.json()
										if (!res.ok) {
											setError(data.error || 'Failed to redeem invite code')
											return
										}
										onClose()
										window.location.href = routes.tlaRoot()
									} catch (err) {
										setError(err instanceof Error ? err.message : 'Failed to redeem invite code')
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
					</>
				)}
			</TldrawUiDialogBody>
		</>
	)
}
