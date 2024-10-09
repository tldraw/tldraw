import { SignOutButton } from '@clerk/clerk-react'
import { Fragment } from 'react'
import { useValue } from 'tldraw'
import { TlaButton } from '../components/TlaButton/TlaButton'
import { TlaSpacer } from '../components/TlaSpacer/TlaSpacer'
import { TlaFormDivider } from '../components/tla-form/tla-form'
import { useRaw } from '../hooks/useRaw'
import { TlaPageLayout } from '../layouts/TlaPageLayout/TlaPageLayout'
import { getLocalSessionState, updateLocalSessionState } from '../providers/SessionProvider'

export function Component() {
	const raw = useRaw()
	return (
		<TlaPageLayout>
			<div className="tla-page__header">
				<h2 className="tla-text_ui__big">{raw('Debug')}</h2>
			</div>
			<TlaSpacer height={40} />
			<h2>{raw('Users')}</h2>
			<TlaSpacer height={20} />
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 'fit-content' }}>
				<SignOutButton redirectUrl="/q">
					<TlaButton variant="warning">{raw('Sign out')}</TlaButton>
				</SignOutButton>
			</div>
			<TlaSpacer height={40} />
			<TlaFormDivider />
			<TlaSpacer height={40} />
			<h2>{raw('Flags')}</h2>
			<TlaSpacer height={20} />
			<Flags />
			<TlaSpacer height={40} />
			<TlaFormDivider />
			<TlaSpacer height={40} />
			<h2>{raw('Theme')}</h2>
			<TlaSpacer height={20} />
			<DarkMode />
		</TlaPageLayout>
	)
}

function Flags() {
	// const raw = useRaw()
	const flags = useValue('flags', () => getLocalSessionState().flags, [])

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
							updateLocalSessionState((state) => ({
								flags: {
									...state.flags,
									[key]: !value,
								},
							}))
						}}
					/>
				</Fragment>
			))}
			{/* <TlaButton
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
				{raw('Reset defaults')}
			</TlaButton> */}
		</div>
	)
}

function DarkMode() {
	const raw = useRaw()
	const isDarkMode = useValue('dark mode', () => getLocalSessionState().theme === 'dark', [])
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
			<label htmlFor="dark mode">{raw('Dark mode')}</label>
			<input
				name="dark mode"
				type="checkbox"
				checked={isDarkMode}
				onChange={(value) => {
					updateLocalSessionState(() => ({ theme: value ? 'dark' : 'light' }))
				}}
			/>
		</div>
	)
}
