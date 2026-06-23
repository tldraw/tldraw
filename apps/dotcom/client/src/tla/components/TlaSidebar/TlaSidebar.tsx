import { memo, useCallback, useEffect, useLayoutEffect } from 'react'
import { tlmenus } from 'tldraw'
import { globalEditor } from '../../../utils/globalEditor'
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

	// Dismiss the sidebar's open menus whenever it hides — they're rendered by the (still-mounted)
	// sidebar, so they'd otherwise hang over the canvas. One effect per visibility flag covers every
	// close path (the toggle button, Cmd+\, focus mode, the mobile overlay tap). Each runs only when
	// its own flag changes, so opening a menu — which changes neither flag — never trips them. The
	// clear is scoped like a manual dismiss so open SDK dialogs (which share the tlmenus registry
	// under the 'tla' context) keep their entry.
	const dismissSidebarMenus = useCallback(() => {
		// Read the editor statically, not via a hook dep: a workspace switch remounts the editor, and a
		// dep here would re-create this callback and re-fire the effects below mid-switch (on desktop
		// the mobile branch is always "hidden"), dismissing the switcher the user just opened.
		const editor = globalEditor.get()
		if (editor) tlmenus.clearOpenMenus(editor.contextId)
		tlmenus.deleteOpenMenu('sidebar-workspace-switcher')
	}, [])
	useLayoutEffect(() => {
		if (!isSidebarOpen) dismissSidebarMenus()
	}, [isSidebarOpen, dismissSidebarMenus])
	useLayoutEffect(() => {
		if (!isSidebarOpenMobile) dismissSidebarMenus()
	}, [isSidebarOpenMobile, dismissSidebarMenus])

	const handleOverlayClick = useCallback(() => {
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
