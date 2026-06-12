import { memo, useCallback, useEffect } from 'react'
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
import { TlaSidebarHelpMenu } from './components/TlaSidebarHelpMenu'
import { TlaSidebarRecentFiles } from './components/TlaSidebarRecentFiles'
import { TlaSidebarRecentFilesNew } from './components/TlaSidebarRecentFilesNew'
import { TlaUserSettingsMenu } from './components/TlaSidebarUserSettingsMenu'
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
		updateLocalSessionState(() => ({ isSidebarOpenMobile: false }))
	}, [])

	const { onDrop, onDragOver, onDragEnter, onDragLeave } = useTldrFileDrop()

	const workspacesEnabled = useHasFlag('groups_frontend')

	return (
		<nav aria-hidden={!isSidebarOpen} style={{ visibility: isSidebarOpen ? 'visible' : 'hidden' }}>
			<button
				className={styles.sidebarOverlayMobile}
				data-visiblemobile={isSidebarOpenMobile}
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
				<div className={styles.sidebarContent}>
					<div className={styles.sidebarContentInner}>
						{workspacesEnabled ? <TlaSidebarRecentFilesNew /> : <TlaSidebarRecentFiles />}
					</div>
				</div>
				<div className={styles.sidebarBottomArea}>
					<TlaSidebarDotDevLink />
					{workspacesEnabled && (
						<>
							<div className={styles.sidebarDivider} />
							<TlaSidebarFeedbackButton />
						</>
					)}
					<div className={styles.sidebarBottomRow}>
						<TlaUserSettingsMenu />
						<TlaSidebarHelpMenu />
					</div>
				</div>
			</div>
		</nav>
	)
})
