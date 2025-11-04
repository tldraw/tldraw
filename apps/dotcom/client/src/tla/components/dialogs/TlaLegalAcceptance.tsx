import { useUser } from '@clerk/clerk-react'
import { useState } from 'react'
import { useAnalyticsConsent } from '../../hooks/useAnalyticsConsent'
import styles from './auth.module.css'
import { TlaTermsAcceptance } from './TlaSignInDialog'

export function TlaLegalAcceptance({ onClose }: { onClose(): void }) {
	const { user } = useUser()
	const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false)
	const [analyticsOptIn, setAnalyticsOptIn] = useState(false)
	const [, updateAnalyticsConsent] = useAnalyticsConsent()

	const handleAcceptTerms = async () => {
		if (!user || !hasAcceptedTerms) return

		// Persist analytics choice before redirecting
		updateAnalyticsConsent(analyticsOptIn)

		// Store acceptance in user metadata
		await user.update({
			unsafeMetadata: {
				...user.unsafeMetadata,
				legal_accepted_at: new Date().toISOString(),
			},
		})

		onClose?.()
	}

	return (
		<div className={styles.authContainer}>
			<TlaTermsAcceptance
				hasAccepted={hasAcceptedTerms}
				onAcceptedChange={setHasAcceptedTerms}
				analyticsOptIn={analyticsOptIn}
				onAnalyticsChange={setAnalyticsOptIn}
				onContinue={handleAcceptTerms}
				onClose={onClose}
			/>
		</div>
	)
}
