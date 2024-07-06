import { useState } from 'react'
import { TlaButton } from '../components-tla/TlaButton'
import { TlaCloseButton } from '../components-tla/TlaCloseButton'
import { TlaDivider } from '../components-tla/TlaDivider'
import { TlaInput } from '../components-tla/TlaInput'
import { TlaLabel } from '../components-tla/TlaLabel'
import { TlaSpacer } from '../components-tla/TlaSpacer'
import { useAuth } from '../hooks/useAuth'

export function AuthPage({
	initialState = 'sign-in',
	onClose,
}: {
	initialState?: 'sign-in' | 'sign-up'
	onClose: () => void
}) {
	const { signIn } = useAuth()
	const [state, setState] = useState(initialState)
	const [loadingState, setLoadingState] = useState<
		{ name: 'ready' } | { name: 'loading' } | { name: 'error' }
	>({ name: 'ready' })

	if (state === 'sign-in') {
		return (
			<div className="tla_full">
				<TlaCloseButton onClose={onClose} />
				<div className="tla_auth_container">
					<div className="tla_auth_container_title">
						<h2 className="tla_text_ui__big">Sign in</h2>
					</div>
					<TlaSpacer height="36" />
					<TlaButton className="tla_button__secondary">Sign in with Google</TlaButton>
					<TlaSpacer height="40" />
					<TlaDivider>or</TlaDivider>
					<TlaSpacer height="40" />
					<form
						className="tla_form"
						onSubmit={async (e) => {
							e.preventDefault()
							if (loadingState.name === 'loading') return
							setLoadingState({ name: 'loading' })
							const data = Object.fromEntries(new FormData(e.currentTarget))
							try {
								await signIn({ id: '1', email: data.email as string, name: 'User Nameson' })
							} catch (e) {
								setLoadingState({ name: 'error' })
							}
						}}
					>
						<TlaLabel>Email address</TlaLabel>
						<TlaInput name="email" type="email" required />
						<TlaSpacer height="20" />
						<TlaButton name="submit" type="submit" isLoading={loadingState.name === 'loading'}>
							Continue
						</TlaButton>
						<TlaSpacer height="40" />
						<div className="tla_auth_detail">
							Need an account? <button onClick={() => setState('sign-up')}>Sign up</button>
						</div>
					</form>
				</div>
			</div>
		)
	}

	if (state === 'sign-up') {
		return (
			<div className="tla_full">
				<TlaCloseButton onClose={onClose} />
				<div className="tla_full_inner">
					<div className="tla_full_content">
						<div className="tla_auth_container">
							<div className="tla_auth_container_title">
								<h2 className="tla_text_ui__big">Create your account</h2>
							</div>
							<TlaSpacer height="36" />
							<TlaButton className="tla_button__secondary">Continue with Google</TlaButton>
							<TlaSpacer height="40" />
							<TlaDivider>or</TlaDivider>
							<TlaSpacer height="40" />
							<form
								className="tla_form"
								onSubmit={async (e) => {
									e.preventDefault()
									if (loadingState.name === 'loading') return
									setLoadingState({ name: 'loading' })
									const data = Object.fromEntries(new FormData(e.currentTarget))
									try {
										await signIn({ id: '1', email: data.email as string, name: 'User Nameson' })
									} catch (e) {
										setLoadingState({ name: 'error' })
									}
								}}
							>
								<TlaLabel>Name</TlaLabel>
								<TlaInput name="name" type="text" required />
								<TlaLabel>Email address</TlaLabel>
								<TlaInput name="email" type="email" required />
								<TlaLabel>Password</TlaLabel>
								<TlaInput name="password" type="password" required />
								<TlaSpacer height="20" />
								<div className="tla_checkbox">
									<TlaInput name="terms" type="checkbox" required />
									<TlaLabel>
										I agree to the{'  '}
										<a href="/">Terms and Conditions</a>.
									</TlaLabel>
								</div>
								<div className="tla_checkbox">
									<TlaInput name="terms" type="checkbox" />
									<TlaLabel>{'It’s ok to email me news and updates.'}</TlaLabel>
								</div>
								<TlaSpacer height="20" />
								<TlaButton name="submit" type="submit" isLoading={loadingState.name === 'loading'}>
									Continue
								</TlaButton>
								<TlaSpacer height="40" />
								<div className="tla_auth_detail">
									Have an account? <button onClick={() => setState('sign-in')}>Sign in</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			</div>
		)
	}

	throw Error(`Invalid state: ${state}`)
}
