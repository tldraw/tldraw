import { useUser } from '@clerk/clerk-react'
import classNames from 'classnames'
import { useCallback, useState } from 'react'
import { TlDialogBody, TlDialogHeader, TlDialogTitle } from 'tldraw'
import { F } from '../../utils/i18n'
import { ExternalLink } from '../ExternalLink/ExternalLink'
import { TlaCtaButton } from '../TlaCtaButton/TlaCtaButton'
import styles from './auth.module.css'

export function TlaLegalAcceptance({ onClose }: { onClose(): void }) {
	const { user } = useUser()

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleContinue = useCallback(async () => {
		if (isSubmitting) return

		setIsSubmitting(true)
		setError(null)

		try {
			if (!user) return

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
	}, [isSubmitting, onClose, user])

	return (
		<div className={styles.legalContainer}>
			<TlDialogHeader className={styles.legalDialogHeader}>
				<TlDialogTitle>
					<F defaultMessage="Accept terms of use" />
				</TlDialogTitle>
			</TlDialogHeader>
			<TlDialogBody className={styles.legalBody}>
				<p className={styles.legalDescription}>
					<F
						defaultMessage="Before you start, please accept our <tos>terms of use</tos> and <privacy>privacy policy</privacy>."
						values={{
							tos: (chunks) => <ExternalLink to="/tos.html">{chunks}</ExternalLink>,
							privacy: (chunks) => <ExternalLink to="/privacy.html">{chunks}</ExternalLink>,
						}}
					/>
				</p>

				{error && <div className={styles.authError}>{error}</div>}
				<TlaCtaButton
					data-testid="tla-accept-and-continue-button"
					onClick={handleContinue}
					disabled={isSubmitting}
					className={classNames(styles.authCtaButton, styles.legalCtaButton)}
				>
					<F defaultMessage="Accept and continue" />
				</TlaCtaButton>
			</TlDialogBody>
		</div>
	)
}
