import { Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { TlaButton } from '../components/TlaButton/TlaButton'
import { TlaSpacer } from '../components/TlaSpacer/TlaSpacer'
import { TlaFormDivider } from '../components/tla-form/tla-form'
import { useApp } from '../hooks/useAppState'
import { useFlags } from '../hooks/useFlags'
import { useSessionState } from '../hooks/useSessionState'
import { TlaPageLayout } from '../layouts/TlaPageLayout/TlaPageLayout'
import { TldrawAppUserId, TldrawAppUserRecordType } from '../utils/schema/TldrawAppUser'

export function Component() {
	const app = useApp()
	const navigate = useNavigate()

	function handleSignInAsUser(userId: TldrawAppUserId) {
		const current = app.getSessionState()
		if (!current.auth) throw Error('No auth')
		app.setSessionState({
			...current,
			auth: {
				...current.auth,
				userId,
			},
		})
		navigate('/q')
	}

	return (
		<TlaPageLayout>
			<div className="tla-page__header">
				<h2 className="tla-text_ui__big">Debug</h2>
			</div>
			<TlaSpacer height={40} />
			<h2>Users</h2>
			<TlaSpacer height={20} />
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 'fit-content' }}>
				<TlaButton
					variant="primary"
					onClick={() => {
						handleSignInAsUser(TldrawAppUserRecordType.createId('0')) // steve
					}}
				>
					Sign in as Steve
				</TlaButton>
				<TlaButton
					variant="primary"
					onClick={() => {
						handleSignInAsUser(TldrawAppUserRecordType.createId('1')) // david
					}}
				>
					Sign in as David
				</TlaButton>
				<TlaButton
					variant="primary"
					onClick={() => {
						handleSignInAsUser(TldrawAppUserRecordType.createId('2')) // alex
					}}
				>
					Sign in as Alex
				</TlaButton>
				<TlaButton
					variant="warning"
					onClick={async () => {
						await app.resetDatabase()
						window.location.reload()
					}}
				>
					Reset database
				</TlaButton>
			</div>
			<TlaSpacer height={40} />
			<TlaFormDivider />
			<TlaSpacer height={40} />
			<h2>Flags</h2>
			<TlaSpacer height={20} />
			<Flags />
			<TlaSpacer height={40} />
			<TlaFormDivider />
			<TlaSpacer height={40} />
			<h2>Theme</h2>
			<TlaSpacer height={20} />
			<DarkMode />
		</TlaPageLayout>
	)
}

function Flags() {
	const app = useApp()
	const flags = useFlags()

	return (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: '1fr auto',
				width: 'fit-content',
				columnGap: 20,
				rowGap: 4,
			}}
		>
			{Object.entries(flags).map(([key, value]) => (
				<Fragment key={key}>
					<label htmlFor={key}>{key}</label>
					<input
						name={key}
						type="checkbox"
						checked={!!value}
						onChange={() => {
							const current = app.getSessionState()
							if (!current.auth) throw Error('No auth')
							const user = app.store.get(current.auth.userId)
							if (!user) throw Error('No user')

							app.store.put([
								{
									...user,
									flags: {
										...user.flags,
										[key]: !value,
									},
								},
							])
						}}
					/>
				</Fragment>
			))}
			<TlaButton
				onClick={() => {
					const defaultUser = TldrawAppUserRecordType.createDefaultProperties()
					const current = app.getSessionState()
					if (!current.auth) throw Error('No auth')
					const user = app.store.get(current.auth.userId)
					if (!user) throw Error('No user')

					app.store.put([
						{
							...user,
							flags: defaultUser.flags,
						},
					])
				}}
			>
				Reset defaults
			</TlaButton>
		</div>
	)
}

function DarkMode() {
	const app = useApp()
	const isDarkMode = useSessionState().theme === 'dark'
	return (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: '1fr auto',
				width: 'fit-content',
				columnGap: 20,
				rowGap: 4,
			}}
		>
			<label htmlFor="dark mode">Dark mode</label>
			<input
				name="dark mode"
				type="checkbox"
				checked={isDarkMode}
				onChange={() => {
					const current = app.getSessionState()
					if (!current.auth) throw Error('No auth')
					const user = app.store.get(current.auth.userId)
					if (!user) throw Error('No user')
					app.setSessionState({
						...app.getSessionState(),
						theme: isDarkMode ? 'light' : 'dark',
					})
				}}
			/>
		</div>
	)
}
