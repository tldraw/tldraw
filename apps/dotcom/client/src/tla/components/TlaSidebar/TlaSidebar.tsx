import { memo, useCallback, useEffect, useRef } from 'react'
import { preventDefault } from 'tldraw'
import { useTldrFileDrop } from '../../hooks/useTldrFileDrop'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { F } from '../../utils/i18n'
import {
	getIsSidebarOpen,
	toggleSidebar,
	updateLocalSessionState,
	useIsSidebarOpen,
	useIsSidebarOpenMobile,
} from '../../utils/local-session-state'
import { TlaSidebarCreateFileButton } from './components/TlaSidebarCreateFileButton'
import { TlaSidebarHelpMenu } from './components/TlaSidebarHelpMenu'
import { TlaSidebarRecentFiles } from './components/TlaSidebarRecentFiles'
import { TlaUserSettingsMenu } from './components/TlaSidebarUserSettingsMenu'
import { TlaSidebarWorkspaceLink } from './components/TlaSidebarWorkspaceLink'
import styles from './sidebar.module.css'

export const TlaSidebar = memo(function TlaSidebar() {
	const isSidebarOpen = useIsSidebarOpen()
	const isSidebarOpenMobile = useIsSidebarOpenMobile()
	const sidebarRef = useRef<HTMLDivElement>(null)
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

	useEffect(() => {
		const sidebarEl = sidebarRef.current
		if (!sidebarEl) return

		function handleWheel(e: WheelEvent) {
			if (!sidebarEl) return
			// Ctrl/Meta key indicates a pinch event (funny, eh?)
			if (sidebarEl.contains(e.target as Node) && (e.ctrlKey || e.metaKey)) {
				preventDefault(e)
			}
		}

		sidebarEl.addEventListener('wheel', handleWheel, { passive: false })
		return () => sidebarEl.removeEventListener('wheel', handleWheel)
	}, [sidebarRef])

	const handleOverlayClick = useCallback(() => {
		updateLocalSessionState(() => ({ isSidebarOpenMobile: false }))
	}, [])

	const { onDrop, onDragOver, onDragEnter, onDragLeave, isDraggingOver } = useTldrFileDrop()

	return (
		<nav
			ref={sidebarRef}
			aria-hidden={!isSidebarOpen}
			style={{ visibility: isSidebarOpen ? 'visible' : 'hidden' }}
		>
			<button
				className={styles.sidebarOverlayMobile}
				data-visiblemobile={isSidebarOpenMobile}
				onClick={handleOverlayClick}
			/>
			<div
				className={styles.sidebar}
				data-visible={isSidebarOpen}
				data-visiblemobile={isSidebarOpenMobile}
				data-testid="tla-sidebar"
				onDropCapture={onDrop}
				onDragOver={onDragOver}
				onDragEnter={onDragEnter}
				onDragLeave={onDragLeave}
			>
				{isDraggingOver && (
					<div className={styles.sidebarDragOverlay}>
						<F defaultMessage="Upload .tldr files" />
					</div>
				)}
				<div className={styles.sidebarTopRow}>
					<TlaSidebarWorkspaceLink />
					<TlaSidebarCreateFileButton />
				</div>
				<div className={styles.sidebarContent}>
					<TlaSidebarRecentFiles />
				</div>
				<div className={styles.sidebarBottomArea}>
					<div className={styles.sidebarBottomRow}>
						<TlaUserSettingsMenu />
						<TlaSidebarHelpMenu />
					</div>
				</div>
			</div>
		</nav>
	)
})
