import { Outlet } from 'react-router-dom'
import { useAppState } from '../hooks/useAppState'
import { TlaIcon } from './TlaIcon'
import { TlaSidebar } from './TlaSidebar'

export function TlaWapper() {
	const { isSidebarOpen, toggleSidebar } = useAppState()

	return (
		<div className="tla tla_layout" data-sidebar={isSidebarOpen}>
			<TlaSidebar />
			<button className="tla_sidebar_toggle" onClick={toggleSidebar}>
				<TlaIcon icon="sidebar" />
			</button>
			<Outlet />
		</div>
	)
}
