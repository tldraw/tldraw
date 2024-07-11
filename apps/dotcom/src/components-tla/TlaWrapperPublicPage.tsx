import { Outlet } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { TlaIcon } from './TlaIcon'
import { TlaSidebar } from './TlaSidebar'

export function TlaWrapperPublicPage() {
	const app = useApp()
	const isSidebarOpen = useValue('sidebar open', () => app.getSessionState().isSidebarOpen, [app])
	const auth = useValue('auth', () => app.getSessionState().auth, [app])
	const theme = useValue('theme', () => app.getSessionState().theme, [app])
	return (
		<div
			className={`tla tla_layout ${auth ? 'tla_layout__signedin' : 'tla_layout__signedout'} ${theme === 'light' ? 'tla_theme__light' : 'tla_theme__dark'}`}
			data-sidebar={auth && isSidebarOpen}
		>
			{auth ? (
				<>
					<TlaSidebar />
					<button className="tla_sidebar_toggle" onClick={() => app.toggleSidebar()}>
						<TlaIcon icon="sidebar" />
					</button>
				</>
			) : (
				<button
					className="tla_signin_button"
					onClick={() => {
						// todo
					}}
				/>
			)}
			<Outlet />
		</div>
	)
}
