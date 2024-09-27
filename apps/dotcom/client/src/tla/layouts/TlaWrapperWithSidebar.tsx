import { ReactNode } from 'react'
import { useValue } from 'tldraw'
import { TlaSidebar } from '../components/TlaSidebar'
import { useApp } from '../hooks/useAppState'

export function TlaWrapperWithSidebar({
	children,
	collapsable,
}: {
	children: ReactNode
	collapsable?: boolean
}) {
	const app = useApp()
	const isSidebarOpen = useValue('sidebar open', () => app.getSessionState().isSidebarOpen, [app])
	const theme = useValue('theme', () => app.getSessionState().theme, [app])
	return (
		<div
			className={`tla tla-layout tl-container ${theme === 'light' ? 'tla-theme__light tl-theme__light' : 'tla-theme__dark tl-theme__dark'}`}
			data-sidebar={collapsable ? isSidebarOpen : true}
		>
			<TlaSidebar />
			{children}
		</div>
	)
}
