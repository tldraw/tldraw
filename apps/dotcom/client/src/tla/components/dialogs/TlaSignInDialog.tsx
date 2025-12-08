import { useClerk, useSignIn } from '@clerk/clerk-react'
import * as Clerk from '@clerk/elements/common'
import * as SignIn from '@clerk/elements/sign-in'
import { GetInviteInfoResponseBody } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { ChangeEvent, ReactNode, useCallback, useEffect, useState, type FormEvent } from 'react'
import {
	exhaustiveSwitchError,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'
import { defineMessages, F, useMsg } from '../../utils/i18n'
import { setRedirectOnSignIn } from '../../utils/redirect'
import { TlaCtaButton } from '../TlaCtaButton/TlaCtaButton'
import { TlaLogo } from '../TlaLogo/TlaLogo'
import styles from './auth.module.css'

const messages = defineMessages({
	enterEmailAddress: { defaultMessage: 'Enter your email address' },
	inviteMessage: {
		defaultMessage: 'You have been invited to join group:',
	},
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
	const { signIn, isLoaded: isSignInLoaded } = useSignIn()
	const { setActive, client } = useClerk()

	const enterEmailAddressMsg = useMsg(messages.enterEmailAddress)

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

	return (
		<>
			<div className={styles.authLogoWrapper}>
				<div className={styles.authLogo}>
					<TlaLogo />
				</div>
			</div>
			<div className={styles.authDescription}>
				{inviteInfo ? (
					<>
						<F {...messages.inviteMessage} /> {inviteInfo.groupName}
						<br />
						<br />
						<F defaultMessage="tldraw is a free online whiteboard. Create an account to save your files and work with your friends." />
					</>
				) : (
					<>
						<F defaultMessage="tldraw is a free online whiteboard. Create an account to save your files and work with your friends." />
					</>
				)}
			</div>
			<SignIn.Root routing="virtual">
				<SignIn.Step name="start">
					<div className={styles.authGoogleButtonWrapper}>
						{/* @ts-ignore this is fine */}
						<Clerk.Connection name="google" asChild>
							<TlaCtaButton
								data-testid="tla-google-sign-in-button"
								className={styles.authCtaButton}
								onClick={() => {
									if (!skipRedirect) {
										setRedirectOnSignIn()
									}
								}}
							>
								<Clerk.Icon icon="google" />
								<F defaultMessage="Sign in with Google" />
							</TlaCtaButton>
						</Clerk.Connection>
					</div>
				</SignIn.Step>
			</SignIn.Root>

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
						placeholder={enterEmailAddressMsg}
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
					<a href="/tos.html" target="_blank" rel="noopener noreferrer">
						<F defaultMessage="Terms of Use" />
					</a>
					{/* eslint-disable-next-line react/jsx-no-literals */}
					{' · '}
					<a href="/privacy.html" target="_blank" rel="noopener noreferrer">
						<F defaultMessage="Privacy Policy" />
					</a>
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

	useEffect(() => {
		if (resendCooldown <= 0 || typeof window === 'undefined') return
		const timer = window.setInterval(() => {
			setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1))
		}, 1000)
		return () => window.clearInterval(timer)
	}, [resendCooldown])

	const handleCodeChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const next = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
			if (next.length > 6) return
			if (state.isSubmitting) return

			setState((s) => ({ ...s, error: '', code: next }))

			// If the length is 6, we need to submit the code
			if (next.length === 6) {
				if (state.isSubmitting) return

				setState((s) => ({ ...s, isSubmitting: true, error: null }))

				if (isSignUpFlow) {
					client.signUp
						.attemptEmailAddressVerification({
							code: next,
						})
						.then(async (s) => {
							if (s.status === 'complete') {
								await setActive({ session: s.createdSessionId })
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
					return
				}

				if (client.signIn) {
					client.signIn
						.attemptFirstFactor({
							strategy: 'email_code',
							code: next,
						})
						.then(async (r: any) => {
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
				}
			}
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
		} catch (_e: any) {
			const e = _e as any
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

			<div
				className={styles.authVerificationWrapper}
				onClick={() => {
					const el = document.getElementById('tla-verification-code') as HTMLInputElement | null
					el?.focus()
				}}
			>
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
											{/* eslint-disable-next-line react/jsx-no-literals */}
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
