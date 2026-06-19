import { memo, useCallback, useEffect } from 'react'
import { tlmenus } from 'tldraw'
import { useActiveWorkspaceId } from '../../hooks/useActiveWorkspaceId'
import { useHasFlag } from '../../hooks/useHasFlag'
import { useTldrFileDrop } from '../../hooks/useTldrFileDrop'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import {
	getIsSidebarOpen,
	toggleSidebar,
	updateLocalSessionState,
	useIsSidebarOpen,
	useIsSidebarOpenMobile,
} from '../../utils/local-session-state'
import { TlaSidebarCreateFileButton } from './components/TlaSidebarCreateFileButton'
import { TlaSidebarDotDevLink } from './components/TlaSidebarDotDevLink'
import { TlaSidebarFeedbackButton } from './components/TlaSidebarFeedbackButton'
import { TlaSidebarRecentFiles } from './components/TlaSidebarRecentFiles'
import { TlaSidebarRecentFilesNew } from './components/TlaSidebarRecentFilesNew'
import { TlaUserSettingsMenu } from './components/TlaSidebarUserSettingsMenu'
import { TlaSidebarWorkspaceActions } from './components/TlaSidebarWorkspaceActions'
import { TlaSidebarWorkspaceLink } from './components/TlaSidebarWorkspaceLink'
import { TlaSidebarWorkspaceSwitcher } from './components/TlaSidebarWorkspaceSwitcher'
import styles from './sidebar.module.css'

export const TlaSidebar = memo(function TlaSidebar() {
	const isSidebarOpen = useIsSidebarOpen()
	const isSidebarOpenMobile = useIsSidebarOpenMobile()
	const trackEvent = useTldrawAppUiEvents()

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === '\\' && (e.ctrlKey || e.metaKey)) {
				toggleSidebar()
				trackEvent('sidebar-toggle', {
					value: getIsSidebarOpen(),
					source: 'sidebar',
				})
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [trackEvent])

	const handleOverlayClick = useCallback(() => {
		// The sidebar only hides (CSS transform), it doesn't unmount, so its open menus
		// (workspace switcher, file menus) would otherwise stay open behind the closed
		// sidebar. Clear them as the mobile sidebar closes.
		tlmenus.clearOpenMenus()
		updateLocalSessionState(() => ({ isSidebarOpenMobile: false }))
	}, [])

	const { onDrop, onDragOver, onDragEnter, onDragLeave } = useTldrFileDrop()

	const workspacesEnabled = useHasFlag('groups_frontend')
	const activeWorkspaceId = useActiveWorkspaceId()

	return (
		<nav aria-hidden={!isSidebarOpen} style={{ visibility: isSidebarOpen ? 'visible' : 'hidden' }}>
			<button
				className={styles.sidebarOverlayMobile}
				data-visiblemobile={isSidebarOpenMobile}
				data-testid="tla-sidebar-overlay-mobile"
				onClick={handleOverlayClick}
			/>
			<div
				className={styles.sidebar}
				data-visible={isSidebarOpen}
				data-workspaces={workspacesEnabled}
				data-visiblemobile={isSidebarOpenMobile}
				data-testid="tla-sidebar"
				onDropCapture={onDrop}
				onDragOver={onDragOver}
				onDragEnter={onDragEnter}
				onDragLeave={onDragLeave}
			>
				<div className={styles.sidebarTopRow}>
					<TlaSidebarWorkspaceLink />
					<TlaSidebarCreateFileButton />
				</div>
				{/* The workspace switcher is fixed; only the file list below it scrolls. */}
				{workspacesEnabled && <TlaSidebarWorkspaceSwitcher />}
				{workspacesEnabled && <div className={styles.sidebarDivider} />}
				{workspacesEnabled && <TlaSidebarWorkspaceActions workspaceId={activeWorkspaceId} />}
				{workspacesEnabled && <div className={styles.sidebarDivider} />}
				<div className={styles.sidebarContent} data-sidebar-scroll-container>
					<div className={styles.sidebarContentInner}>
						{workspacesEnabled ? <TlaSidebarRecentFilesNew /> : <TlaSidebarRecentFiles />}
					</div>
				</div>
				<div className={styles.sidebarBottomArea}>
					<div className={styles.sidebarDivider} />
					<TlaSidebarDotDevLink />
					<TlaSidebarFeedbackButton />
					<div className={styles.sidebarBottomRow}>
						<TlaUserSettingsMenu />
					</div>
				</div>
			</div>
		</nav>
	)
})
