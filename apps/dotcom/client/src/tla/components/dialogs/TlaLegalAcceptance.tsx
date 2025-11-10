import { useUser } from '@clerk/clerk-react'
import classNames from 'classnames'
import { useCallback, useRef, useState } from 'react'
import { TldrawUiDialogBody, TldrawUiDialogHeader, TldrawUiDialogTitle } from 'tldraw'
import { useAnalyticsConsent } from '../../hooks/useAnalyticsConsent'
import { F } from '../../utils/i18n'
import { TlaMenuSwitch } from '../tla-menu/tla-menu'
import { TlaCtaButton } from '../TlaCtaButton/TlaCtaButton'
import { TlaLogo } from '../TlaLogo/TlaLogo'
import styles from './auth.module.css'

export function TlaLegalAcceptance({ onClose }: { onClose(): void }) {
	const { user } = useUser()
	const [currentConsent, updateAnalyticsConsent] = useAnalyticsConsent()
	const [analyticsOptIn, setAnalyticsOptIn] = useState(currentConsent)
	const initialAnalyticsOptIn = useRef(analyticsOptIn)
	const showAnalyticsToggle = initialAnalyticsOptIn.current !== true

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleContinue = useCallback(async () => {
		if (isSubmitting) return

		setIsSubmitting(true)
		setError(null)

		try {
			if (!user) return

			// Persist analytics choice before redirecting
			if (analyticsOptIn !== null) {
				updateAnalyticsConsent(analyticsOptIn)
			}

			// Store acceptance in user metadata
			await user.update({
				unsafeMetadata: {
					...user.unsafeMetadata,
					legal_accepted_at: new Date().toISOString(),
				},
			} as any)
			await user.reload()

			onClose()
		} catch (_e: any) {
			const e = _e as any
			setError(
				e?.errors?.[0]?.longMessage ||
					e?.errors?.[0]?.message ||
					e?.message ||
					'Something went wrong'
			)
		} finally {
			setIsSubmitting(false)
		}
	}, [isSubmitting, onClose, analyticsOptIn, updateAnalyticsConsent, user])

	return (
		<div className={styles.authContainer}>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<span />
				</TldrawUiDialogTitle>
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.authBody}>
				<div className={styles.authLogoWrapper}>
					<div className={styles.authLogo}>
						<TlaLogo />
					</div>
				</div>

				<p className={styles.authDescription}>
					<F
						defaultMessage="Before you start, please accept our <tos>terms of use</tos> and <privacy>privacy policy</privacy>."
						values={{
							tos: (chunks) => (
								<a href="/tos.html" target="_blank" rel="noopener noreferrer">
									{chunks}
								</a>
							),
							privacy: (chunks) => (
								<a href="/privacy.html" target="_blank" rel="noopener noreferrer">
									{chunks}
								</a>
							),
						}}
					/>
				</p>

				{showAnalyticsToggle && (
					<label className={styles.authCheckboxLabel}>
						<span>
							<F
								defaultMessage="Allow <cookies>analytics</cookies> to help us improve tldraw."
								values={{
									cookies: (chunks) => (
										<a href="/cookies.html" target="_blank" rel="noopener noreferrer">
											{chunks}
										</a>
									),
								}}
							/>
						</span>
						<TlaMenuSwitch
							id="tla-analytics-switch"
							checked={!!analyticsOptIn}
							onChange={(checked) => setAnalyticsOptIn(checked)}
						/>
					</label>
				)}

				{error && <div className={styles.authError}>{error}</div>}
				<TlaCtaButton
					data-testid="tla-accept-and-continue-button"
					onClick={handleContinue}
					disabled={isSubmitting}
					className={classNames(styles.authCtaButton, styles.authTermsAcceptAndContinueButton)}
				>
					<F defaultMessage="Accept and continue" />
				</TlaCtaButton>
			</TldrawUiDialogBody>
		</div>
	)
}
