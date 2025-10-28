import { useClerk, useSignIn, useUser } from '@clerk/clerk-react'
import * as Clerk from '@clerk/elements/common'
import { ReactNode, useEffect, useState, type FormEvent } from 'react'
import {
	TldrawUiButton,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'
import { F, defineMessages, useMsg } from '../../utils/i18n'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import styles from './auth.module.css'

const messages = defineMessages({
	enterEmailAddress: { defaultMessage: 'Enter your email address' },
})

export function TlaSignInDialog({ onClose }: { onClose?(): void }) {
	const { user, isLoaded } = useUser()
	const [showTerms, setShowTerms] = useState(false)
	const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false)

	// Check if user has accepted legal terms
	useEffect(() => {
		if (isLoaded && user) {
			const hasAcceptedLegal = user.unsafeMetadata?.legal_accepted_at

			if (!hasAcceptedLegal) {
				setShowTerms(true)
			} else {
				// User already accepted terms
				onClose?.()
			}
		}
	}, [isLoaded, user, onClose])

	const handleAcceptTerms = async () => {
		if (!user || !hasAcceptedTerms) return

		// Store acceptance in user metadata
		await user.update({
			unsafeMetadata: {
				...user.unsafeMetadata,
				legal_accepted_at: new Date().toISOString(),
			},
		})

		onClose?.()
	}

	// If user just signed up and hasn't accepted terms, show terms screen
	if (showTerms && user) {
		return (
			<div className={styles.authContainer}>
				<TlaTermsAcceptance
					hasAccepted={hasAcceptedTerms}
					onAcceptedChange={setHasAcceptedTerms}
					onContinue={handleAcceptTerms}
					onClose={onClose}
				/>
			</div>
		)
	}

	return (
		<div className={styles.authContainer}>
			<TlaLoginFlow onClose={onClose} />
		</div>
	)
}

function TlaLoginFlow({ onClose }: { onClose?(): void }) {
	const { signIn, isLoaded: isSignInLoaded } = useSignIn()
	const { setActive, client } = useClerk()
	const enterEmailAddressMsg = useMsg(messages.enterEmailAddress)

	const [stage, setStage] = useState<'enterEmail' | 'terms' | 'enterCode'>('enterEmail')
	const [identifier, setIdentifier] = useState('')
	const [code, setCode] = useState('')
	const [emailAddressId, setEmailAddressId] = useState<string | undefined>(undefined)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [isSignUpFlow, setIsSignUpFlow] = useState(false)
	const [isCodeFocused, setIsCodeFocused] = useState(false)
	const [termsChecked, setTermsChecked] = useState(false)

	async function handleEmailSubmit(e: FormEvent) {
		e.preventDefault()
		if (!isSignInLoaded || !signIn || !identifier) return
		setIsSubmitting(true)
		setError(null)
		try {
			const res = await signIn.create({ identifier })
			if (res.status === 'complete') {
				await setActive({ session: res.createdSessionId })
				onClose?.()
				return
			}
			// Prepare email code and move to code stage
			const emailCodeFactor = (res as any).supportedFirstFactors?.find(
				(ff: any) => ff.strategy === 'email_code'
			)
			const id = emailCodeFactor?.emailAddressId as string | undefined
			if (!id) {
				setError('Email verification is not available for this account.')
				return
			}
			setEmailAddressId(id)
			await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: id })
			setIsSignUpFlow(false)
			setStage('enterCode')
		} catch (err: any) {
			const apiErrors = err?.errors as Array<{
				code?: string
				message?: string
				longMessage?: string
			}>
			const notFound = apiErrors?.find(
				(e) => e.code === 'form_identifier_not_found' || e.code === 'invitation_account_not_exists'
			)
			if (notFound) {
				try {
					setIsSignUpFlow(true)
					// Initialize sign up with the email before preparing verification
					await client.signUp.create({ emailAddress: identifier })
					// Always prepare & go to code first; legal acceptance handled after verification if required
					await client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
					setStage('enterCode')
				} catch (e: any) {
					setError(e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || 'Something went wrong')
				}
			} else {
				setError(apiErrors?.[0]?.longMessage || apiErrors?.[0]?.message || 'Something went wrong')
			}
		} finally {
			setIsSubmitting(false)
		}
	}

	async function handleCodeSubmit(e: FormEvent) {
		e.preventDefault()
		setIsSubmitting(true)
		setError(null)
		try {
			if (isSignUpFlow) {
				const s: any = await client.signUp.attemptEmailAddressVerification({ code })
				// If legal acceptance is still required, show terms now
				const needsLegal = (s?.missingFields || s?.missing_fields || []).includes?.(
					'legal_accepted'
				)
				if (needsLegal) {
					setStage('terms')
					return
				}
				if (s.status === 'complete') {
					await setActive({ session: s.createdSessionId })
					onClose?.()
					return
				}
			} else if (signIn) {
				const r = await signIn.attemptFirstFactor({ strategy: 'email_code', code })
				if (r.status === 'complete') {
					await setActive({ session: r.createdSessionId })
					onClose?.()
					return
				}
			}
		} catch (_e: any) {
			const e = _e as any
			setError(e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || 'Invalid code')
		} finally {
			setIsSubmitting(false)
		}
	}

	async function handleResend() {
		try {
			if (isSignUpFlow) {
				// Ensure email is set on signUp in case the client lost state
				if (!(client.signUp as any)?.emailAddress && identifier) {
					await client.signUp.update({ emailAddress: identifier } as any)
				}
				await client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
			} else if (signIn && emailAddressId) {
				await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId })
			}
		} catch (_e) {
			// noop
		}
	}

	if (stage === 'enterEmail') {
		return (
			<TlaAuthStep onClose={onClose} showDescription>
				<div className={styles.authGoogleButtonWrapper}>
					{/* @ts-ignore this is fine */}
					<Clerk.Connection name="google">
						<>
							<Clerk.Icon icon="google" />
							<F defaultMessage="Continue with Google" />
						</>
					</Clerk.Connection>
				</div>

				<div className={styles.authDivider}>
					<span>
						<F defaultMessage="or" />
					</span>
				</div>

				<form onSubmit={handleEmailSubmit}>
					<div className={styles.authField}>
						<label htmlFor="tla-identifier" className={styles.authLabel}>
							<F defaultMessage="Email address" />
						</label>
						<input
							id="tla-identifier"
							name="identifier"
							type="email"
							value={identifier}
							onChange={(e) => setIdentifier(e.target.value)}
							placeholder={enterEmailAddressMsg}
							className={styles.authInput}
							required
							disabled={isSubmitting}
						/>
						{error && <div className={styles.authError}>{error}</div>}
					</div>

					<TldrawUiButton
						type="primary"
						htmlButtonType="submit"
						className={styles.authContinueButton}
						disabled={isSubmitting || !identifier}
					>
						<F defaultMessage="Continue" />
					</TldrawUiButton>
				</form>
			</TlaAuthStep>
		)
	}

	if (stage === 'terms') {
		return (
			<TlaTermsAcceptance
				hasAccepted={termsChecked}
				onAcceptedChange={setTermsChecked}
				onContinue={async () => {
					if (!termsChecked) return
					try {
						const su: any = await client.signUp.update({ legalAccepted: true } as any)
						if (su?.status === 'complete' && su?.createdSessionId) {
							await setActive({ session: su.createdSessionId })
							onClose?.()
							return
						}
						const needsEmail = (su?.missingFields || su?.missing_fields || []).includes?.(
							'email_address'
						)
						if (needsEmail) {
							if (!(client.signUp as any)?.emailAddress && identifier) {
								await client.signUp.update({ emailAddress: identifier } as any)
							}
							await client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
						}
						setStage('enterCode')
						setError(null)
					} catch (_e: any) {
						const e = _e as any
						setError(
							e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || 'Something went wrong'
						)
					}
				}}
				onClose={onClose}
			/>
		)
	}

	return (
		<TlaAuthStep onClose={onClose}>
			<p className={styles.authDescription}>
				<F defaultMessage="Enter the verification code sent to your email" />
			</p>

			<div
				className={styles.authVerificationWrapper}
				onClick={() => {
					const el = document.getElementById('tla-verification-code') as HTMLInputElement | null
					el?.focus()
				}}
			>
				<div className={styles.authOtpBoxes} aria-hidden>
					{Array.from({ length: 6 }).map((_, i) => (
						<div
							key={i}
							className={
								code[i] ? `${styles.authOtpBox} ${styles.authOtpBoxFilled}` : styles.authOtpBox
							}
						>
							{code[i] || ''}
							{isCodeFocused && code.length < 6 && i === code.length ? (
								<span className={styles.authOtpCaret} />
							) : null}
						</div>
					))}
				</div>
				<input
					id="tla-verification-code"
					type="text"
					inputMode="numeric"
					autoFocus
					className={styles.authOtpHiddenInput}
					value={code}
					onChange={(e) => {
						const next = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
						setCode(next)
					}}
					onFocus={() => setIsCodeFocused(true)}
					onBlur={() => setIsCodeFocused(false)}
					maxLength={6}
				/>
			</div>

			{error && <div className={styles.authError}>{error}</div>}

			<div className={styles.authResendWrapper}>
				<span className={styles.authResendText}>
					<F defaultMessage="Didn't receive a code?" />
				</span>
				<button type="button" onClick={handleResend} className={styles.authResendButton}>
					<F defaultMessage="Resend" />
				</button>
			</div>

			<form onSubmit={handleCodeSubmit}>
				<TldrawUiButton
					type="primary"
					htmlButtonType="submit"
					className={styles.authContinueButton}
					disabled={isSubmitting || code.length < 6}
				>
					<F defaultMessage="Continue" />
				</TldrawUiButton>
			</form>
		</TlaAuthStep>
	)
}

function TlaTermsAcceptance({
	hasAccepted,
	onAcceptedChange,
	onContinue,
	onClose,
}: {
	hasAccepted: boolean
	onAcceptedChange(accepted: boolean): void
	onContinue(): void
	onClose?(): void
}) {
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Welcome to tldraw" />
				</TldrawUiDialogTitle>
				{onClose && <TldrawUiDialogCloseButton />}
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.authBody}>
				<div className={styles.authLogoWrapper}>
					<div className={styles.authLogo}>
						<TlaIcon icon="tldraw" />
					</div>
				</div>

				<p className={styles.authDescription}>
					<F defaultMessage="Before you start, please accept our terms and privacy policy." />
				</p>

				<label className={styles.authCheckboxLabel}>
					<input
						type="checkbox"
						checked={hasAccepted}
						onChange={(e) => onAcceptedChange(e.target.checked)}
						className={styles.authCheckbox}
					/>
					<span>
						<F
							defaultMessage="I agree to the <tos>Terms of Service</tos> and <privacy>Privacy Policy</privacy>"
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
					</span>
				</label>

				<TldrawUiButton
					type="primary"
					onClick={onContinue}
					disabled={!hasAccepted}
					className={styles.authContinueButton}
				>
					<F defaultMessage="Continue to tldraw" />
				</TldrawUiButton>
			</TldrawUiDialogBody>
		</>
	)
}

function TlaAuthStep({
	children,
	onClose,
	showDescription = false,
}: {
	children: ReactNode
	onClose?(): void
	showDescription?: boolean
}) {
	return (
		<>
			<TldrawUiDialogHeader>
				<span style={{ flex: 1 }} />
				{onClose && <TldrawUiDialogCloseButton />}
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.authBody}>
				<div className={styles.authLogoWrapper}>
					<div className={styles.authLogo}>
						<TlaIcon icon="tldraw" />
					</div>
				</div>
				{showDescription && (
					<div className={styles.authDescription}>
						<F defaultMessage="tldraw is a free and instant virtual whiteboarding with online collaboration." />
					</div>
				)}

				{children}
			</TldrawUiDialogBody>
		</>
	)
}
