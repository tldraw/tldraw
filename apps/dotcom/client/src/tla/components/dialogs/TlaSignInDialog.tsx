import { useClerk } from '@clerk/react'
import { useSignIn } from '@clerk/react/legacy'
import { GetInviteInfoResponseBody } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import {
	ChangeEvent,
	ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
	type FormEvent,
} from 'react'
import {
	defineMessages,
	exhaustiveSwitchError,
	F,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useTranslation,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { setRedirectOnSignIn } from '../../utils/redirect'
import { ExternalLink } from '../ExternalLink/ExternalLink'
import { TlaCtaButton } from '../TlaCtaButton/TlaCtaButton'
import { TlaLogo } from '../TlaLogo/TlaLogo'
import styles from './auth.module.css'

const messages = defineMessages({
	enterEmailAddress: { defaultMessage: 'Enter your email address' },
})

export function TlaSignInDialog({
	onClose,
	inviteInfo,
	onInviteAccepted,
	skipRedirect,
}: {
	onClose?(): void
	inviteInfo?: Extract<GetInviteInfoResponseBody, { error: false }>
	onInviteAccepted?(): void
	skipRedirect?: boolean
}) {
	const [stage, setStage] = useState<'enterEmail' | 'enterCode'>('enterEmail')
	const [identifier, setIdentifier] = useState('')
	const [isSignUpFlow, setIsSignUpFlow] = useState(false)
	const [emailAddressId, setEmailAddressId] = useState<string | undefined>(undefined)

	let innerContent: ReactNode

	switch (stage) {
		case 'enterEmail':
			innerContent = (
				<TlaEnterEmailStep
					onClose={onClose}
					inviteInfo={inviteInfo}
					skipRedirect={skipRedirect}
					onComplete={(identifier, isSignUp, emailId) => {
						setIdentifier(identifier)
						setIsSignUpFlow(isSignUp)
						setEmailAddressId(emailId)
						setStage('enterCode')
					}}
				/>
			)
			break
		case 'enterCode':
			innerContent = (
				<TlaVerificationCodeStep
					identifier={identifier}
					isSignUpFlow={isSignUpFlow}
					emailAddressId={emailAddressId}
					onComplete={() => {
						onInviteAccepted?.()
						onClose?.()
					}}
					onClose={onClose}
				/>
			)
			break
		default:
			throw exhaustiveSwitchError(stage)
	}

	return (
		<div className={styles.authContainer}>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<span />
				</TldrawUiDialogTitle>
				{onClose && <TldrawUiDialogCloseButton />}
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.authDialogBody}>
				<div className={styles.authBody}>{innerContent}</div>

				{/* Clerk's CAPTCHA widget */}
				<div id="clerk-captcha" className={styles.clerkCaptcha} />
			</TldrawUiDialogBody>
		</div>
	)
}

function TlaEnterEmailStep({
	onClose,
	onComplete,
	inviteInfo,
	skipRedirect,
}: {
	onClose?(): void
	onComplete(identifier: string, isSignUpFlow: boolean, emailAddressId?: string): void
	inviteInfo?: Extract<GetInviteInfoResponseBody, { error: false }>
	skipRedirect?: boolean
}) {
	const msg = useTranslation()
	const { signIn, isLoaded: isSignInLoaded } = useSignIn()
	const { setActive, client } = useClerk()

	const [state, setState] = useState<{
		identifier: string
		isSubmitting: boolean
		error: string | null
	}>({
		identifier: '',
		isSubmitting: false,
		error: null,
	})

	const handleEmailSubmit = useCallback(
		async (e: FormEvent) => {
			e.preventDefault()
			if (!isSignInLoaded || !signIn || !state.identifier || state.isSubmitting) return

			setState((s) => ({ ...s, isSubmitting: true, error: null }))

			try {
				const res = await signIn.create({ identifier: state.identifier })
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
					setState((s) => ({
						...s,
						isSubmitting: false,
						error: 'Email verification is not available for this account.',
					}))
					return
				}
				await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: id })
				onComplete(state.identifier, false, id)
			} catch (err: any) {
				const apiErrors = err?.errors as Array<{
					code?: string
					message?: string
					longMessage?: string
				}>
				const notFound = apiErrors?.find(
					(e) =>
						e.code === 'form_identifier_not_found' || e.code === 'invitation_account_not_exists'
				)
				if (notFound) {
					try {
						// Initialize sign up with the email before preparing verification
						await client.signUp.create({ emailAddress: state.identifier })
						// Always prepare & go to code first; legal acceptance handled after verification if required
						await client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
						onComplete(state.identifier, true, undefined)
					} catch (e: any) {
						setState((s) => ({
							...s,
							isSubmitting: false,
							error:
								e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || 'Something went wrong',
						}))
					}
				} else {
					setState((s) => ({
						...s,
						isSubmitting: false,
						error: apiErrors?.[0]?.longMessage || apiErrors?.[0]?.message || 'Something went wrong',
					}))
				}
			}
		},
		[state, client.signUp, signIn, onClose, setActive, isSignInLoaded, onComplete]
	)

	const [isGoogleRedirecting, setIsGoogleRedirecting] = useState(false)
	const handleGoogleSignIn = useCallback(async () => {
		if (!isSignInLoaded || !signIn) return
		if (!skipRedirect) setRedirectOnSignIn()
		setIsGoogleRedirecting(true)
		try {
			await signIn.authenticateWithRedirect({
				strategy: 'oauth_google',
				redirectUrl: routes.tlaSsoCallback({ asUrl: true }),
				redirectUrlComplete: routes.tlaRoot({ asUrl: true }),
			})
		} catch (err: any) {
			setIsGoogleRedirecting(false)
			setState((s) => ({
				...s,
				error: err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Something went wrong',
			}))
		}
	}, [isSignInLoaded, signIn, skipRedirect])

	return (
		<>
			<div className={styles.authLogoWrapper}>
				<div className={styles.authLogo}>
					<TlaLogo />
				</div>
			</div>
			<div className={styles.authDescription}>
				{inviteInfo ? (
					<F
						defaultMessage="You have been invited to join <strong>{workspaceName}</strong>. Create a free account to continue."
						values={{
							workspaceName: inviteInfo.workspaceName,
							strong: (chunks) => <strong>{chunks}</strong>,
						}}
					/>
				) : (
					<F defaultMessage="Create a free account to save your files and tldraw with your teammates." />
				)}
			</div>
			<div className={styles.authGoogleButtonWrapper}>
				<TlaCtaButton
					data-testid="tla-google-sign-in-button"
					className={styles.authCtaButton}
					onClick={handleGoogleSignIn}
					disabled={!isSignInLoaded || isGoogleRedirecting}
				>
					<GoogleIcon />
					<F defaultMessage="Sign in with Google" />
				</TlaCtaButton>
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
						data-testid="tla-identifier-input"
						value={state.identifier}
						onChange={(e) => setState((s) => ({ ...s, identifier: e.target.value }))}
						placeholder={msg(messages.enterEmailAddress)}
						className={styles.authInput}
						required
						disabled={state.isSubmitting}
					/>
					{state.error && <div className={styles.authError}>{state.error}</div>}
				</div>

				<TlaCtaButton
					data-testid="tla-continue-with-email-button"
					className={classNames(styles.authContinueWithEmailButton, styles.authCtaButton)}
					disabled={state.isSubmitting}
					secondary
					type="submit"
				>
					<F defaultMessage="Continue with email" />
				</TlaCtaButton>

				<p className={styles.authTermsOfUse}>
					<ExternalLink to="/tos.html">
						<F defaultMessage="Terms of Use" />
					</ExternalLink>
					{/* eslint-disable-next-line tldraw/jsx-no-literals */}
					{' · '}
					<ExternalLink to="/privacy.html">
						<F defaultMessage="Privacy Policy" />
					</ExternalLink>
				</p>
			</form>
		</>
	)
}

function TlaVerificationCodeStep({
	isSignUpFlow,
	identifier,
	emailAddressId,
	onClose,
	onComplete,
}: {
	isSignUpFlow: boolean
	onClose?(): void
	identifier: string
	emailAddressId: string | undefined
	onComplete(): void
}) {
	const [state, setState] = useState<{
		code: string
		isCodeFocused: boolean
		isSubmitting: boolean
		error: string | null
	}>({
		code: '',
		isCodeFocused: false,
		isSubmitting: false,
		error: null,
	})

	const { setActive, client } = useClerk()
	const [resendCooldown, setResendCooldown] = useState(0)
	const [resendError, setResendError] = useState<string | null>(null)
	const codeInputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (resendCooldown <= 0) return
		const timer = window.setInterval(() => {
			setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1))
		}, 1000)
		return () => window.clearInterval(timer)
	}, [resendCooldown])

	const handleCodeChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const next = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
			if (state.isSubmitting) return

			setState((s) => ({ ...s, error: '', code: next }))

			// If the length is 6, we need to submit the code
			if (next.length < 6) return

			setState((s) => ({ ...s, isSubmitting: true, error: null }))

			const attempt:
				| Promise<{ status: string | null; createdSessionId: string | null }>
				| undefined = isSignUpFlow
				? client.signUp.attemptEmailAddressVerification({ code: next })
				: client.signIn?.attemptFirstFactor({ strategy: 'email_code', code: next })
			if (!attempt) return

			attempt
				.then(async (r) => {
					if (r.status === 'complete') {
						await setActive({ session: r.createdSessionId })
						onComplete()
						return
					}
					setState((prev) => ({ ...prev, isSubmitting: false }))
					onClose?.()
				})
				.catch((e) => {
					const error = e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || 'Invalid code'
					setState((s) => ({
						...s,
						code: '',
						isSubmitting: false,
						error,
					}))
				})
		},
		[state, client, isSignUpFlow, setActive, onComplete, onClose]
	)

	const handleResend = useCallback(async () => {
		if (resendCooldown > 0 || state.isSubmitting) return
		setResendError(null)
		try {
			if (isSignUpFlow) {
				// Ensure email is set on signUp in case the client lost state
				if (!(client.signUp as any)?.emailAddress && identifier) {
					await client.signUp.update({ emailAddress: identifier } as any)
				}
				await client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
			} else if (client.signIn && emailAddressId) {
				await client.signIn.prepareFirstFactor({
					strategy: 'email_code',
					emailAddressId,
				})
			}
			setResendCooldown(30)
		} catch (e: any) {
			setResendError(
				e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || 'Unable to resend code'
			)
		}
	}, [client, emailAddressId, identifier, isSignUpFlow, resendCooldown, state.isSubmitting])

	return (
		<>
			<p className={styles.authDescription}>
				<F defaultMessage="Check your email for a verification code." />
			</p>

			<div className={styles.authVerificationWrapper} onClick={() => codeInputRef.current?.focus()}>
				<div className={styles.authOtpBoxes} aria-hidden>
					{Array.from({ length: 6 }).map((_, i) => {
						const isFilled = state.code[i]
						const isFocused =
							state.isCodeFocused && state.code.length < 6 && i === state.code.length

						return (
							<div
								key={i}
								className={classNames(styles.authOtpBox, {
									[styles.authOtpBoxFilled]: isFilled,
									[styles.authOtpBoxFocused]: isFocused,
								})}
							>
								{isFilled || ''}
								{isFocused ? <span className={styles.authOtpCaret} /> : null}
							</div>
						)
					})}
				</div>
				<input
					ref={codeInputRef}
					id="tla-verification-code"
					data-testid="tla-verification-code-input"
					type="text"
					inputMode="numeric"
					autoFocus
					className={styles.authOtpHiddenInput}
					value={state.code}
					onChange={handleCodeChange}
					onFocus={() => setState((s) => ({ ...s, isCodeFocused: true }))}
					onBlur={() => setState((s) => ({ ...s, isCodeFocused: false }))}
					disabled={state.isSubmitting}
					maxLength={6}
				/>
			</div>

			{state.error && <div className={styles.authError}>{state.error}</div>}
			{resendError && <div className={styles.authError}>{resendError}</div>}

			<div className={styles.authResendWrapper}>
				<span className={styles.authResendText}>
					<F
						defaultMessage="Didn’t receive a code? <resend>Resend</resend>."
						values={{
							resend: (chunks) => (
								<button
									type="button"
									data-testid="tla-resend-code-button"
									onClick={handleResend}
									className={styles.authResendButton}
									disabled={resendCooldown > 0 || state.isSubmitting}
								>
									{resendCooldown > 0 ? (
										<>
											{/* eslint-disable-next-line tldraw/jsx-no-literals */}
											{chunks} ({resendCooldown})
										</>
									) : (
										chunks
									)}
								</button>
							),
						}}
					/>
				</span>
			</div>
		</>
	)
}

// The auth CSS styles the button's icon as an `img`.
const GOOGLE_ICON_URL = `data:image/svg+xml,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>'
)}`

function GoogleIcon() {
	return <img src={GOOGLE_ICON_URL} alt="" />
}
