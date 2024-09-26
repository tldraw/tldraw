import { useApp } from '../hooks/useAppState'
import { TlaIcon } from './TlaIcon'

export function TlaSidebarToggle() {
	const app = useApp()
	return (
		<button className="tla-sidebar__toggle" onClick={() => app.toggleSidebar()}>
			<TlaIcon icon="sidebar" />
		</button>
	)
}
