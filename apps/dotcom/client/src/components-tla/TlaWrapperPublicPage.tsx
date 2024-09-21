import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
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
			className={`tla tla-layout tla-layout__signedin ${auth ? 'tla-layout__signedin' : 'tla-layout__signedout'} ${theme === 'light' ? 'tla-theme__light' : 'tla-theme__dark'}`}
			data-sidebar={false}
			// className={`tla tla-layout ${auth ? 'tla-layout__signedin' : 'tla-layout__signedout'} ${theme === 'light' ? 'tla-theme__light' : 'tla-theme__dark'}`}
			// data-sidebar={auth && isSidebarOpen}
		>
			{auth ? (
				<>
					<TlaSidebar />
					{/* <button
						className="tla-top-left-button"
						onClick={() =>
							navigate('/w', {
								state: location.state,
							})
						}
					>
						<TlaIcon icon="home" />
					</button> */}
				</>
			) : (
				<button
					className="tla-signin_button"
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
