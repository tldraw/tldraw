import { ReactNode } from 'react'
import { useValue } from 'tldraw'
import { TlaSidebar } from '../../components/TlaSidebar/TlaSidebar'
import { useApp } from '../../hooks/useAppState'
import { usePreventAccidentalDrops } from '../../hooks/usePreventAccidentalDrops'
import { getLocalSessionState } from '../../utils/local-session-state'
import styles from './sidebar-layout.module.css'

export function TlaSidebarLayout({ children }: { children: ReactNode; collapsible?: boolean }) {
	const app = useApp()
	const isSidebarOpen = useValue('sidebar open', () => getLocalSessionState().isSidebarOpen, [app])
	const isSidebarOpenMobile = useValue(
		'sidebar open mobile',
		() => getLocalSessionState().isSidebarOpenMobile,
		[app]
	)
	usePreventAccidentalDrops()
	return (
		<div
			className={styles.layout}
			data-sidebar={isSidebarOpen}
			data-sidebarmobile={isSidebarOpenMobile}
		>
			<TlaSidebar />
			{children}
		</div>
	)
}
