import { ReactNode } from 'react'
import { useAppState } from '../hooks/useAppState'
import { TlaIcon } from './TlaIcon'
import { TlaSidebar } from './TlaSidebar'

export function TlaSidebarWrapper({ children }: { children: ReactNode }) {
	const { isSidebarOpen, toggleSidebar } = useAppState()
	return (
		<div className="tla_layout" data-sidebar={isSidebarOpen}>
			<TlaSidebar />
			<button className="tla_sidebar_toggle" onClick={toggleSidebar}>
				<TlaIcon icon="sidebar" />
			</button>
			<div className="tla_content">{children}</div>
		</div>
	)
}
