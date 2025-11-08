import { useClerk, useSignIn } from '@clerk/clerk-react'
import * as Clerk from '@clerk/elements/common'
import * as SignIn from '@clerk/elements/sign-in'
import classNames from 'classnames'
import { ChangeEvent, ReactNode, useCallback, useState, type FormEvent } from 'react'
import {
	TldrawUiButton,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'
import { useAnalyticsConsent } from '../../hooks/useAnalyticsConsent'
import { F, defineMessages, useMsg } from '../../utils/i18n'
import { TlaMenuSwitch } from '../tla-menu/tla-menu'
import { TlaLogo } from '../TlaLogo/TlaLogo'
import styles from './auth.module.css'

const messages = defineMessages({
	enterEmailAddress: { defaultMessage: 'Enter your email address' },
	termsAcceptance: {
		defaultMessage:
			'Before you start, please accept our <tos>terms of use</tos> and <privacy>privacy policy</privacy>.',
	},
	allowAnalytics: {
		defaultMessage: 'Allow <cookies>analytics</cookies> to help us improve tldraw.',
	},
	didNotReceiveCode: {
		defaultMessage: "Didn't receive a code? <resend>Resend</resend>.",
	},
})

export function TlaSignInDialog({ onClose }: { onClose?(): void }) {
	return (
		<div className={styles.authContainer}>
			<TlaLoginFlow onClose={onClose} />
		</div>
	)
}

type AuthState =
	| {
			name: 'enterEmail'
			identifier: string
			isSubmitting: boolean
			error: string | null
	  }
	| {
			name: 'enterCode'
			identifier: string
			code: string
			isCodeFocused: boolean
			emailAddressId?: string
			isSignUpFlow: boolean
			isSubmitting: boolean
			error: string | null
	  }
	| {
			name: 'terms'
			identifier: string
			code: string
			error: string | null
	  }

function TlaLoginFlow({ onClose }: { onClose?(): void }) {
	const { signIn, isLoaded: isSignInLoaded } = useSignIn()
	const { setActive, client } = useClerk()

	const [analyticsOptIn, updateAnalyticsConsent] = useAnalyticsConsent()

	const [state, setState] = useState<AuthState>({
		name: 'enterEmail',
		identifier: '',
		isSubmitting: false,
		error: null,
	})

	const handleEmailSubmit = useCallback(
		async (e: FormEvent) => {
			e.preventDefault()
			if (state.name !== 'enterEmail') return
			if (!isSignInLoaded || !signIn || !state.identifier) return

			setState({ ...state, isSubmitting: true, error: null })

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
					setState({
						...state,
						isSubmitting: false,
						error: 'Email verification is not available for this account.',
					})
					return
				}
				await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: id })
				setState({
					name: 'enterCode',
					identifier: state.identifier,
					code: '',
					isCodeFocused: false,
					emailAddressId: id,
					isSignUpFlow: false,
					isSubmitting: false,
					error: null,
				})
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
						setState({
							name: 'enterCode',
							identifier: state.identifier,
							code: '',
							isCodeFocused: false,
							isSignUpFlow: true,
							isSubmitting: false,
							error: null,
						})
					} catch (e: any) {
						setState({
							...state,
							isSubmitting: false,
							error:
								e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || 'Something went wrong',
						})
					}
				} else {
					setState({
						...state,
						isSubmitting: false,
						error: apiErrors?.[0]?.longMessage || apiErrors?.[0]?.message || 'Something went wrong',
					})
				}
			}
		},
		[state, client.signUp, signIn, onClose, setActive, isSignInLoaded]
	)

	const handleCodeChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			if (state.name !== 'enterCode') return
			const next = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
			if (next.length > 6) return

			setState({ ...state, code: next })

			// If the length is 6, we need to submit the code
			if (next.length === 6) {
				if (state.name !== 'enterCode') return
				if (state.isSubmitting) return

				setState((s) => ({ ...s, isSubmitting: true, error: null }))

				if (state.isSignUpFlow) {
					client.signUp
						.attemptEmailAddressVerification({
							code: state.code,
						})
						.then((s) => {
							if (s.status === 'complete') {
								setActive({ session: s.createdSessionId })
								onClose?.()
								return
							}
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

				if (signIn) {
					signIn
						.attemptFirstFactor({
							strategy: 'email_code',
							code: state.code,
						})
						.then((r) => {
							if (r.status === 'complete') {
								setActive({ session: r.createdSessionId })
								onClose?.()
								return
							}
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
		[state, client.signUp, signIn, onClose, setActive]
	)

	const handleResend = useCallback(async () => {
		if (state.name !== 'enterCode') return

		try {
			if (state.isSignUpFlow) {
				// Ensure email is set on signUp in case the client lost state
				if (!(client.signUp as any)?.emailAddress && state.identifier) {
					await client.signUp.update({ emailAddress: state.identifier } as any)
				}
				await client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
			} else if (signIn && state.emailAddressId) {
				await signIn.prepareFirstFactor({
					strategy: 'email_code',
					emailAddressId: state.emailAddressId,
				})
			}
		} catch (_e) {
			// noop
		}
	}, [state, client.signUp, signIn])

	const handleTermsSubmit = useCallback(async () => {
		if (state.name !== 'terms') return

		try {
			const su: any = await client.signUp.update({ legalAccepted: true } as any)
			if (su?.status === 'complete' && su?.createdSessionId) {
				await setActive({ session: su.createdSessionId })
				onClose?.()
				return
			}
			const needsEmail = (su?.missingFields || su?.missing_fields || []).includes?.('email_address')
			if (needsEmail) {
				if (!(client.signUp as any)?.emailAddress && state.identifier) {
					await client.signUp.update({ emailAddress: state.identifier } as any)
				}
				await client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
			}
			setState({
				name: 'enterCode',
				identifier: state.identifier,
				code: state.code,
				isCodeFocused: false,
				isSignUpFlow: true,
				isSubmitting: false,
				error: null,
			})
		} catch (_e: any) {
			const e = _e as any
			setState({
				...state,
				error: e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || 'Something went wrong',
			})
		}
	}, [state, client.signUp, onClose, setActive])

	if (state.name === 'enterEmail') {
		return (
			<TlaEnterEmailStep
				state={state}
				onClose={onClose}
				onIdentifierChange={(e) => setState((s) => ({ ...s, identifier: e.target.value }))}
				handleEmailSubmit={handleEmailSubmit}
			/>
		)
	}

	if (state.name === 'terms') {
		return (
			<TlaAcceptTermsStep
				onContinue={handleTermsSubmit}
				analyticsOptIn={analyticsOptIn}
				onAnalyticsChange={(checked) => {
					updateAnalyticsConsent(checked)
				}}
				onClose={onClose}
			/>
		)
	}

	// Default to enterCode stage
	if (state.name === 'enterCode') {
		return (
			<TlaVerificationCodeStep
				onClose={onClose}
				state={state}
				handleCodeChange={handleCodeChange}
				setState={setState}
				handleResend={handleResend}
			/>
		)
	}

	// Wrong state...
	return null
}

export function TlaAcceptTermsStep({
	onContinue,
	onClose,
	analyticsOptIn,
	onAnalyticsChange,
}: {
	onContinue(): void
	onClose?(): void
	analyticsOptIn: boolean | null
	onAnalyticsChange(accepted: boolean): void
}) {
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<span />
				</TldrawUiDialogTitle>
				{onClose && <TldrawUiDialogCloseButton />}
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.authBody}>
				<div className={styles.authLogoWrapper}>
					<div className={styles.authLogo}>
						<TlaLogo />
					</div>
				</div>

				<p className={styles.authDescription}>
					<F
						{...messages.termsAcceptance}
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

				{analyticsOptIn !== true && (
					<label className={styles.authCheckboxLabel}>
						<span>
							<F
								{...messages.allowAnalytics}
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
							onChange={(checked) => onAnalyticsChange(checked)}
						/>
					</label>
				)}
				<TldrawUiButton type="normal" onClick={onContinue} className={styles.authContinueButton}>
					<F defaultMessage="Accept and continue" />
				</TldrawUiButton>
			</TldrawUiDialogBody>
		</>
	)
}

function TlaEnterEmailStep({
	state,
	onClose,
	onIdentifierChange,
	handleEmailSubmit,
}: {
	state: AuthState & { name: 'enterEmail' }
	onClose?(): void
	onIdentifierChange(e: ChangeEvent<HTMLInputElement>): void
	handleEmailSubmit(e: FormEvent): void
}) {
	const enterEmailAddressMsg = useMsg(messages.enterEmailAddress)
	return (
		<TlaAuthStep onClose={onClose}>
			<div className={styles.authDescription}>
				<F defaultMessage="Create a free account to save your work, collaborate in real-time, and more." />
			</div>
			<SignIn.Root routing="virtual">
				<SignIn.Step name="start">
					<div className={styles.authGoogleButtonWrapper}>
						{/* @ts-ignore this is fine */}
						<Clerk.Connection name="google">
							<>
								<Clerk.Icon icon="google" style={{ width: '16px', height: '16px' }} />
								<F defaultMessage="Continue with Google" />
							</>
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
						value={state.identifier}
						onChange={onIdentifierChange}
						placeholder={enterEmailAddressMsg}
						className={styles.authInput}
						required
						disabled={state.isSubmitting}
					/>
					{state.error && <div className={styles.authError}>{state.error}</div>}
				</div>

				<TldrawUiButton type="normal" htmlButtonType="submit" className={styles.authContinueButton}>
					<F defaultMessage="Continue with email" />
				</TldrawUiButton>
			</form>
		</TlaAuthStep>
	)
}

function TlaVerificationCodeStep({
	onClose,
	state,
	handleCodeChange,
	setState,
	handleResend,
}: {
	onClose?(): void
	state: AuthState & { name: 'enterCode' }
	handleCodeChange(e: ChangeEvent<HTMLInputElement>): void
	setState(state: AuthState): void
	handleResend(): void
}) {
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<span />
				</TldrawUiDialogTitle>
				{onClose && <TldrawUiDialogCloseButton />}
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.authBody}>
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
						type="text"
						inputMode="numeric"
						autoFocus
						className={styles.authOtpHiddenInput}
						value={state.code}
						onChange={handleCodeChange}
						onFocus={() => setState({ ...state, isCodeFocused: true })}
						onBlur={() => setState({ ...state, isCodeFocused: false })}
						disabled={state.isSubmitting}
						maxLength={6}
					/>
				</div>

				{state.error && <div className={styles.authError}>{state.error}</div>}

				<div className={styles.authResendWrapper}>
					<span className={styles.authResendText}>
						<F
							{...messages.didNotReceiveCode}
							values={{
								resend: (chunks) => (
									<button type="button" onClick={handleResend} className={styles.authResendButton}>
										{chunks}
									</button>
								),
							}}
						/>
					</span>
				</div>
			</TldrawUiDialogBody>
		</>
	)
}

function TlaAuthStep({ children, onClose }: { children: ReactNode; onClose?(): void }) {
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<span />
				</TldrawUiDialogTitle>
				{onClose && <TldrawUiDialogCloseButton />}
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.authBody}>
				<div className={styles.authLogoWrapper}>
					<div className={styles.authLogo}>
						<TlaLogo />
					</div>
				</div>
				{children}
			</TldrawUiDialogBody>
		</>
	)
}
