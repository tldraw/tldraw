import { useUser } from '@clerk/clerk-react'
import { useCallback, useState } from 'react'
import { useAnalyticsConsent } from '../../hooks/useAnalyticsConsent'
import styles from './auth.module.css'
import { TlaAcceptTermsStep } from './TlaSignInDialog'

export function TlaLegalAcceptance({ onClose }: { onClose(): void }) {
	const { user } = useUser()
	const [currentConsent, updateAnalyticsConsent] = useAnalyticsConsent()
	const [analyticsOptIn, setAnalyticsOptIn] = useState(currentConsent)

	const handleAcceptTerms = useCallback(async () => {
		if (!user) return

		// Persist analytics choice before redirecting
		if (analyticsOptIn !== null) {
			updateAnalyticsConsent(analyticsOptIn)
		}

		// Store acceptance in user metadata and mark it on Clerk's canonical field
		await user.update({
			unsafeMetadata: {
				...user.unsafeMetadata,
				legal_accepted_at: new Date().toISOString(),
			},
			legalAccepted: true,
			// Clerk's public types don't yet expose legalAccepted
		} as any)
		await user.reload()

		onClose?.()
	}, [analyticsOptIn, onClose, updateAnalyticsConsent, user])

	return (
		<div className={styles.authContainer}>
			<TlaAcceptTermsStep
				analyticsOptIn={analyticsOptIn}
				onAnalyticsChange={setAnalyticsOptIn}
				onContinue={handleAcceptTerms}
				onClose={onClose}
			/>
		</div>
	)
}
