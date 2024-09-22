import { ReactNode } from 'react'
import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { TlaSidebar } from './TlaSidebar'

export function TlaWrapperCollapsableSidebar({ children }: { children: ReactNode }) {
	const app = useApp()
	const isSidebarOpen = useValue('sidebar open', () => app.getSessionState().isSidebarOpen, [app])
	const theme = useValue('theme', () => app.getSessionState().theme, [app])
	return (
		<div
			className={`tla tla-layout tl-container tla-layout__signedin ${theme === 'light' ? 'tla-theme__light tl-theme__light' : 'tla-theme__dark tl-theme__dark'}`}
			data-sidebar={isSidebarOpen}
		>
			<TlaSidebar />
			{/* <button className="tla-top-left-button" onClick={() => app.toggleSidebar()}>
				<TlaIcon icon="sidebar" />
			</button> */}
			{children}
		</div>
	)
}
