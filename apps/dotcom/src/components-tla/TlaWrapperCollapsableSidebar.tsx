import { ReactNode } from 'react'
import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { TlaIcon } from './TlaIcon'
import { TlaSidebar } from './TlaSidebar'

export function TlaWrapperCollapsableSidebar({ children }: { children: ReactNode }) {
	const app = useApp()
	const isSidebarOpen = useValue('sidebar open', () => app.getSessionState().isSidebarOpen, [app])
	const theme = useValue('theme', () => app.getSessionState().theme, [app])
	return (
		<div
			className={`tla tla_layout tla_layout__signedin ${theme === 'light' ? 'tla_theme__light' : 'tla_theme__dark'}`}
			data-sidebar={isSidebarOpen}
		>
			<TlaSidebar />
			<button className="tla_top-left-button" onClick={() => app.toggleSidebar()}>
				<TlaIcon icon="sidebar" />
			</button>
			{children}
		</div>
	)
}
