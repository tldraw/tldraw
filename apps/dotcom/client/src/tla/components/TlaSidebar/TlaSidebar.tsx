import { memo, useCallback, useEffect } from 'react'
import { useHasFlag } from '../../hooks/useHasFlag'
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
import { TlaSidebarCookieConsent } from './components/TlaSidebarCookieConsent'
import { TlaSidebarCreateFileButton } from './components/TlaSidebarCreateFileButton'
import { TlaSidebarHelpMenu } from './components/TlaSidebarHelpMenu'
import { TlaSidebarRecentFiles } from './components/TlaSidebarRecentFiles'
import { TlaSidebarRecentFilesNew } from './components/TlaSidebarRecentFilesNew'
import { TlaUserSettingsMenu } from './components/TlaSidebarUserSettingsMenu'
import { TlaSidebarWorkspaceLink } from './components/TlaSidebarWorkspaceLink'
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

	const { onDrop, onDragOver, onDragEnter, onDragLeave, isDraggingOver } = useTldrFileDrop()

	const hasGroups = useHasFlag('groups')
	const addDialog = useDialogs().addDialog
	const app = useApp()

	const handleCreateGroup = () => {
		// Use dialog if flag is set or on mobile
		addDialog({
			component: ({ onClose }) => (
				<CreateGroupDialog
					onClose={onClose}
					onCreate={(name) => {
						const id = uniqueId()
						app.z.mutate.group.create({ id, name })
						app.ensureSidebarGroupExpanded(id)
					}}
				/>
			),
		})
	}

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
					{hasGroups && (
						<button
							className={styles.sidebarCreateFileButton}
							onClick={handleCreateGroup}
							data-testid="tla-create-file"
							style={{ marginRight: -8, color: 'var(--tla-color-text-1)' }}
						>
							<TlaIcon icon="folder-new" />
						</button>
					)}
					<TlaSidebarCreateFileButton />
				</div>
				<div className={styles.sidebarContent}>
					<div className={styles.sidebarContentInner}>
						{hasGroups ? <NewSidebarLayout /> : <LegacySidebarLayout />}
					</div>
				</div>

				<div className={styles.sidebarBottomArea}>
					<TlaSidebarCookieConsent />
					<div className={styles.sidebarBottomRow}>
						<TlaUserSettingsMenu />
						<TlaSidebarHelpMenu />
					</div>
				</div>
			</div>
		</nav>
	)
})

function LegacySidebarLayout() {
	return <TlaSidebarRecentFiles />
}

import { uniqueId, useDialogs } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { CreateGroupDialog } from '../dialogs/CreateGroupDialog'
import { TlaIcon } from '../TlaIcon/TlaIcon'

function NewSidebarLayout() {
	return (
		<>
			<TlaSidebarRecentFilesNew />
		</>
	)
}
