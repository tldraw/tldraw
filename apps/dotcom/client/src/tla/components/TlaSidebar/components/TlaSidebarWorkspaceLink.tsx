import { TlaLogo } from '../../TlaLogo/TlaLogo'
import styles from '../sidebar.module.css'

export function TlaSidebarWorkspaceLink() {
	return (
		<div className={styles.sidebarWorkspaceButton} data-testid="tla-sidebar-workspace-link">
			<TlaLogo />
		</div>
	)
}
