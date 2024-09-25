import { useState } from 'react'
import { TlaButton } from '../components/TlaButton'
import { TlaDivider } from '../components/TlaDivider'
import { TlaInput } from '../components/TlaInput'
import { TlaLabel } from '../components/TlaLabel'
import { TlaSpacer } from '../components/TlaSpacer'
import { TlaWrapperFullPage } from '../components/TlaWrapperFullPage'
import { useApp } from '../hooks/useAppState'
import { TldrawAppUserRecordType } from '../utils/schema/TldrawAppUser'

export function Component() {
	const app = useApp()
	const [state, setState] = useState('sign-in')
	const [loadingState, setLoadingState] = useState<
		{ name: 'ready' } | { name: 'loading' } | { name: 'error' }
	>({ name: 'ready' })

	if (state === 'sign-in') {
		return (
			<TlaWrapperFullPage>
				<div className="tla-auth_container">
					<div className="tla-auth_container_title">
						<h2 className="tla-text_ui__big">Sign in</h2>
					</div>
					<TlaSpacer height="36" />
					<TlaButton className="tla-button__secondary">Sign in with Google</TlaButton>
					<TlaSpacer height="40" />
					<TlaDivider>or</TlaDivider>
					<TlaSpacer height="40" />
					<form
						className="tla-form"
						onSubmit={async (e) => {
							e.preventDefault()
							if (loadingState.name === 'loading') return
							setLoadingState({ name: 'loading' })
							try {
								const user = app.store.get(TldrawAppUserRecordType.createId('0'))!
								await app.signIn(user)
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
						<div className="tla-auth_detail tla-text_ui__small">
							Need an account? <button onClick={() => setState('sign-up')}>Sign up</button>
						</div>
					</form>
				</div>
			</TlaWrapperFullPage>
		)
	}

	if (state === 'sign-up') {
		return (
			<TlaWrapperFullPage>
				<div className="tla-auth_container">
					<div className="tla-auth_container_title">
						<h2 className="tla-text_ui__big">Create your account</h2>
					</div>
					<TlaSpacer height="36" />
					<TlaButton className="tla-button__secondary">Continue with Google</TlaButton>
					<TlaSpacer height="40" />
					<TlaDivider>or</TlaDivider>
					<TlaSpacer height="40" />
					<form
						className="tla-form"
						onSubmit={async (e) => {
							e.preventDefault()
							if (loadingState.name === 'loading') return
							setLoadingState({ name: 'loading' })
							try {
								const user = app.store.get(TldrawAppUserRecordType.createId('0'))!
								await app.signIn(user)
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
						<div className="tla-checkbox">
							<TlaInput name="terms" type="checkbox" required />
							<TlaLabel>
								I agree to the{'  '}
								<a href="/">Terms and Conditions</a>.
							</TlaLabel>
						</div>
						<div className="tla-checkbox">
							<TlaInput name="terms" type="checkbox" />
							<TlaLabel>{'It’s ok to email me news and updates.'}</TlaLabel>
						</div>
						<TlaSpacer height="20" />
						<TlaButton name="submit" type="submit" isLoading={loadingState.name === 'loading'}>
							Continue
						</TlaButton>
						<TlaSpacer height="40" />
						<div className="tla-auth_detail tla-text_ui__small">
							Have an account? <button onClick={() => setState('sign-in')}>Sign in</button>
						</div>
					</form>
				</div>
			</TlaWrapperFullPage>
		)
	}

	throw Error(`Invalid state: ${state}`)
}
