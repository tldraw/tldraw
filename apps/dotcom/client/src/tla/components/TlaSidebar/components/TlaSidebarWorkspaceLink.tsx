import styles from '../sidebar.module.css'

export function TlaSidebarWorkspaceLink() {
	return (
		<div className={styles.sidebarWorkspaceButton} data-testid="tla-sidebar-workspace-link">
			<div style={{ display: 'block', height: '100%', paddingLeft: 6, paddingTop: 10 }}>
				<img src="/sidebar_logo_svg.svg" />
			</div>
		</div>
	)
}
