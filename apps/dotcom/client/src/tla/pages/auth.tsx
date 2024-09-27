import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TlaButton } from '../components/TlaButton/TlaButton'
import {
	TlaForm,
	TlaFormCheckbox,
	TlaFormDivider,
	TlaFormGroup,
	TlaFormInput,
	TlaFormItem,
	TlaFormLabel,
} from '../components/TlaForm/TlaForm'
import { TlaSpacer } from '../components/TlaSpacer/TlaSpacer'
import { useApp } from '../hooks/useAppState'
import { TlaWrapperCentered } from '../layouts/TlaWrapperCentered'
import { TldrawAppUserRecordType } from '../utils/schema/TldrawAppUser'

export function Component() {
	const app = useApp()
	const [state, setState] = useState('sign-in')
	const [loadingState, setLoadingState] = useState<
		{ name: 'ready' } | { name: 'loading' } | { name: 'error' }
	>({ name: 'ready' })
	const navigate = useNavigate()

	if (state === 'sign-in') {
		return (
			<TlaWrapperCentered>
				<div style={{ display: 'flex', flexDirection: 'column', width: 320 }}>
					<h2 className="tla-text_ui__big" style={{ textAlign: 'center' }}>
						Sign in
					</h2>
					<TlaSpacer height={32} />
					<TlaButton variant="secondary">Sign in with Google</TlaButton>
					<TlaSpacer height={12} />
					<TlaFormDivider>or</TlaFormDivider>
					<TlaSpacer height={12} />
					<TlaForm
						onSubmit={async (e) => {
							e.preventDefault()
							if (loadingState.name === 'loading') return
							setLoadingState({ name: 'loading' })
							try {
								const user = app.store.get(TldrawAppUserRecordType.createId('0'))!
								await app.signIn(user)
								navigate(`/q`)
							} catch (e) {
								setLoadingState({ name: 'error' })
							}
						}}
					>
						<TlaFormItem>
							<TlaFormLabel>Email address</TlaFormLabel>
							<TlaFormInput name="email" type="email" required />
						</TlaFormItem>
						<TlaSpacer height={12} />
						<TlaFormItem>
							<TlaButton name="submit" type="submit" isLoading={loadingState.name === 'loading'}>
								Continue
							</TlaButton>
							<TlaSpacer height="32" />
							<div className="tla-auth_detail tla-text_ui__small">
								Need an account? <button onClick={() => setState('sign-up')}>Sign up</button>
							</div>
						</TlaFormItem>
					</TlaForm>
				</div>
			</TlaWrapperCentered>
		)
	}

	if (state === 'sign-up') {
		return (
			<TlaWrapperCentered>
				<div style={{ display: 'flex', flexDirection: 'column', width: 320 }}>
					<h2 className="tla-text_ui__big" style={{ textAlign: 'center' }}>
						Create your account
					</h2>
					<TlaSpacer height={32} />
					<TlaButton variant="secondary">Continue with Google</TlaButton>
					<TlaSpacer height={12} />
					<TlaFormDivider>or</TlaFormDivider>
					<TlaSpacer height={12} />
					<TlaForm
						onSubmit={async (e) => {
							e.preventDefault()
							if (loadingState.name === 'loading') return
							setLoadingState({ name: 'loading' })
							try {
								const user = app.store.get(TldrawAppUserRecordType.createId('0'))!
								await app.signIn(user)
								navigate(`/q`)
							} catch (e) {
								setLoadingState({ name: 'error' })
							}
						}}
					>
						<TlaFormGroup>
							<TlaFormItem>
								<TlaFormLabel>Name</TlaFormLabel>
								<TlaFormInput name="name" type="text" required />
							</TlaFormItem>
							<TlaFormItem>
								<TlaFormLabel>Email address</TlaFormLabel>
								<TlaFormInput name="email" type="email" required />
							</TlaFormItem>
							<TlaFormItem>
								<TlaFormLabel>Password</TlaFormLabel>
								<TlaFormInput name="password" type="password" required />
							</TlaFormItem>
						</TlaFormGroup>
						<TlaFormGroup>
							<TlaFormCheckbox name="terms" required>
								I agree to the{'  '}
								<a href="/">Terms and Conditions</a>.
							</TlaFormCheckbox>
							<TlaFormCheckbox name="contact">
								{'It’s ok to email me news and updates.'}
							</TlaFormCheckbox>
						</TlaFormGroup>
						<TlaFormGroup>
							<TlaFormItem>
								<TlaButton name="submit" type="submit" isLoading={loadingState.name === 'loading'}>
									Continue
								</TlaButton>
							</TlaFormItem>
						</TlaFormGroup>
						<TlaSpacer height="32" />
						<div className="tla-auth_detail tla-text_ui__small">
							Have an account? <button onClick={() => setState('sign-in')}>Sign in</button>
						</div>
					</TlaForm>
				</div>
			</TlaWrapperCentered>
		)
	}

	throw Error(`Invalid state: ${state}`)
}
