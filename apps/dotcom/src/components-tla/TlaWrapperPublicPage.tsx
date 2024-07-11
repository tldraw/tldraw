import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { TlaIcon } from './TlaIcon'
import { TlaSidebar } from './TlaSidebar'

export function TlaWrapperPublicPage() {
	const app = useApp()
	// const isSidebarOpen = useValue('sidebar open', () => app.getSessionState().isSidebarOpen, [app])
	const auth = useValue('auth', () => app.getSessionState().auth, [app])
	const theme = useValue('theme', () => app.getSessionState().theme, [app])
	const location = useLocation()
	const navigate = useNavigate()
	return (
		<div
			className={`tla tla_layout tla_layout__signedin ${auth ? 'tla_layout__signedin' : 'tla_layout__signedout'} ${theme === 'light' ? 'tla_theme__light' : 'tla_theme__dark'}`}
			data-sidebar={false}
			// className={`tla tla_layout ${auth ? 'tla_layout__signedin' : 'tla_layout__signedout'} ${theme === 'light' ? 'tla_theme__light' : 'tla_theme__dark'}`}
			// data-sidebar={auth && isSidebarOpen}
		>
			{auth ? (
				<>
					<TlaSidebar />
					<button
						className="tla_top-left-button"
						onClick={() =>
							navigate('/w', {
								state: location.state,
							})
						}
					>
						<TlaIcon icon="home" />
					</button>
				</>
			) : (
				<button
					className="tla_signin_button"
					onClick={() => {
						navigate('/auth', {
							state: location.state,
						})
					}}
				/>
			)}
			<Outlet />
		</div>
	)
}
