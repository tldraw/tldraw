import { ExternalLink } from '../../ExternalLink/ExternalLink'
import { TlaLogo } from '../../TlaLogo/TlaLogo'
import styles from '../sidebar.module.css'

export function TlaSidebarWorkspaceLink() {
	return (
		<ExternalLink
			to="https://tldraw.dev?utm_source=dotcom&utm_medium=organic&utm_campaign=top-left-logo"
			eventName="sidebar-logo-clicked"
			aria-label="tldraw.dev"
			className={styles.sidebarWorkspaceButton}
			data-testid="tla-sidebar-workspace-link"
		>
			<TlaLogo data-testid="tla-sidebar-logo-icon" />
		</ExternalLink>
	)
}
