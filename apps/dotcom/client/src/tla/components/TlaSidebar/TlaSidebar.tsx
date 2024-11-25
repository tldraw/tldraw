import { memo, useCallback, useEffect, useRef } from 'react'
import { preventDefault, useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useTldrFileDrop } from '../../hooks/useTldrFileDrop'
import { getLocalSessionState, updateLocalSessionState } from '../../utils/local-session-state'
import { TlaSidebarCreateFileButton } from './components/TlaSidebarCreateFileButton'
import { TlaSidebarRecentFiles } from './components/TlaSidebarRecentFiles'
import { TlaSidebarUserLink } from './components/TlaSidebarUserLink'
import { TlaSidebarWorkspaceLink } from './components/TlaSidebarWorkspaceLink'
import styles from './sidebar.module.css'

export const TlaSidebar = memo(function TlaSidebar() {
	const app = useApp()
	const isSidebarOpen = useValue('sidebar open', () => getLocalSessionState().isSidebarOpen, [app])
	const isSidebarOpenMobile = useValue(
		'sidebar open mobile',
		() => getLocalSessionState().isSidebarOpenMobile,
		[app]
	)
	const sidebarRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === '\\' && (e.ctrlKey || e.metaKey)) {
				updateLocalSessionState((state) => ({ isSidebarOpen: !state.isSidebarOpen }))
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [])

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
		<div ref={sidebarRef}>
			<button
				className={styles.sidebarOverlayMobile}
				data-visiblemobile={isSidebarOpenMobile}
				onClick={handleOverlayClick}
			/>
			<div
				className={styles.sidebar}
				data-visible={isSidebarOpen}
				data-visiblemobile={isSidebarOpenMobile}
				data-test-id="tla-sidebar"
				onDropCapture={onDrop}
				onDragOver={onDragOver}
				onDragEnter={onDragEnter}
				onDragLeave={onDragLeave}
				data-dragging={isDraggingOver}
			>
				<div className={styles.top}>
					<TlaSidebarWorkspaceLink />
					<TlaSidebarCreateFileButton />
				</div>
				<div className={styles.content}>
					<TlaSidebarRecentFiles />
				</div>
				<div className={styles.bottom} data-testid="tla-sidebar-bottom">
					<TlaSidebarUserLink />
				</div>
			</div>
		</div>
	)
})
