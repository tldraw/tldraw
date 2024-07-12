import { useNavigate } from 'react-router-dom'
import '../../styles/globals.css'
import { TlaSpacer } from '../components-tla/TlaSpacer'
import { useApp } from '../hooks/useAppState'
import { useFlags } from '../tla-hooks/useFlags'
import { TldrawAppUserId, TldrawAppUserRecordType } from '../utils/tla/schema/TldrawAppUser'

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
		navigate('/w/')
	}

	return (
		<div className="tla_content tla_page">
			<div className="tla_page__header">
				<h2 className="tla_text_ui__big">Debug</h2>
			</div>
			<TlaSpacer height={40} />
			<div className="tla_page__list">
				<button
					className="tla_button"
					onClick={() => {
						handleSignInAsUser(TldrawAppUserRecordType.createId('0')) // steve
					}}
				>
					Sign in as Steve
				</button>
				<button
					className="tla_button"
					onClick={() => {
						handleSignInAsUser(TldrawAppUserRecordType.createId('1')) // david
					}}
				>
					Sign in as David
				</button>
				<button
					className="tla_button"
					onClick={() => {
						handleSignInAsUser(TldrawAppUserRecordType.createId('2')) // alex
					}}
				>
					Sign in as Alex
				</button>
				<button
					className="tla_button"
					onClick={async () => {
						await app.resetDatabase()
						window.location.reload()
					}}
				>
					Reset database
				</button>
				<TlaSpacer height={40} />
				<button
					className="tla_button"
					onClick={async () => {
						await app.resetDatabase()
						window.location.reload()
					}}
				>
					Reset database
				</button>
			</div>
			<TlaSpacer height="20" />
			<Flags />
		</div>
	)
}

function Flags() {
	const app = useApp()
	const flags = useFlags()

	return Object.entries(flags).map(([key, value]) => (
		<div key={key}>
			<label htmlFor={key}>{key}</label>
			<input
				name={key}
				type="checkbox"
				checked={value}
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
		</div>
	))
}
