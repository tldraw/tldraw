import classNames from 'classnames'
import { ReactNode } from 'react'
import { useValue } from 'tldraw'
import { TlaSidebar } from '../../components/TlaSidebar/TlaSidebar'
import { useApp } from '../../hooks/useAppState'
import styles from './sidebar-layout.module.css'

export function TlaSidebarLayout({ children }: { children: ReactNode; collapsable?: boolean }) {
	const app = useApp()
	const isSidebarOpen = useValue('sidebar open', () => app.getSessionState().isSidebarOpen, [app])
	const theme = useValue('theme', () => app.getSessionState().theme, [app])
	return (
		<div
			className={classNames(
				`tla tl-container ${theme === 'light' ? 'tla-theme__light tl-theme__light' : 'tla-theme__dark tl-theme__dark'}`,
				styles.layout
			)}
			data-sidebar={isSidebarOpen}
		>
			<TlaSidebar />
			{children}
		</div>
	)
}
