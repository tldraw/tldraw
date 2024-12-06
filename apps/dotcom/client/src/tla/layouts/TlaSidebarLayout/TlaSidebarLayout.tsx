import React, { ReactNode, useCallback, useRef } from 'react'
import { clamp, useQuickReactor, useValue } from 'tldraw'
import { TlaSidebar } from '../../components/TlaSidebar/TlaSidebar'
import { useApp } from '../../hooks/useAppState'
import { usePreventAccidentalDrops } from '../../hooks/usePreventAccidentalDrops'
import { getLocalSessionState, updateLocalSessionState } from '../../utils/local-session-state'
import styles from './sidebar-layout.module.css'

export function TlaSidebarLayout({ children }: { children: ReactNode; collapsible?: boolean }) {
	const app = useApp()
	const isSidebarOpen = useValue('sidebar open', () => getLocalSessionState().isSidebarOpen, [app])
	const isSidebarOpenMobile = useValue(
		'sidebar open mobile',
		() => getLocalSessionState().isSidebarOpenMobile,
		[app]
	)
	usePreventAccidentalDrops()
	const layoutRef = useRef<HTMLDivElement>(null)

	useQuickReactor('update sidebar width', () => {
		if (layoutRef.current) {
			const width = getLocalSessionState().sidebarWidth
			if (typeof width === 'number') {
				layoutRef.current.style.setProperty('--tla-sidebar-width', `${width}px`)
			}
		}
	})

	return (
		<div
			ref={layoutRef}
			className={styles.layout}
			data-sidebar={isSidebarOpen}
			data-sidebarmobile={isSidebarOpenMobile}
			data-testid="tla-sidebar-layout"
		>
			<TlaSidebar />
			{children}
			{isSidebarOpen && (
				<SidebarResizeHandle
					layoutRef={layoutRef}
					onResize={(sidebarWidth) => {
						updateLocalSessionState(() => ({ sidebarWidth }))
					}}
					onClose={() => {
						updateLocalSessionState(() => ({ isSidebarOpen: false }))
					}}
				/>
			)}
		</div>
	)
}

const MIN_SIDEBAR_WIDTH = 150
const MAX_SIDEBAR_WIDTH = 500
function SidebarResizeHandle({
	onResize,
	onClose,
	layoutRef,
}: {
	onResize(width: number): void
	onClose(): void
	layoutRef: React.RefObject<HTMLDivElement>
}) {
	const handlePointerDown = useCallback(
		(event: React.PointerEvent) => {
			const startX = event.clientX
			const startWidth = layoutRef.current
				? parseInt(getComputedStyle(layoutRef.current).getPropertyValue('--tla-sidebar-width'), 10)
				: 0
			let didMove = false
			const handlePointerMove = (moveEvent: PointerEvent) => {
				const dx = moveEvent.clientX - startX
				if (!didMove && Math.abs(dx) < 5) return
				if (!didMove) {
					didMove = true
					layoutRef.current?.setAttribute('data-resizing', 'true')
				}
				const newWidth = clamp(
					startWidth + (moveEvent.clientX - startX),
					MIN_SIDEBAR_WIDTH,
					MAX_SIDEBAR_WIDTH
				)
				onResize(newWidth)
			}
			const handlePointerUp = () => {
				document.removeEventListener('pointermove', handlePointerMove)
				document.removeEventListener('pointerup', handlePointerUp)
				layoutRef.current?.removeAttribute('data-resizing')
			}
			document.addEventListener('pointermove', handlePointerMove)
			document.addEventListener('pointerup', handlePointerUp)
		},
		[layoutRef, onResize]
	)

	return (
		<div
			className={styles.resizeHandle}
			onPointerDown={handlePointerDown}
			onClick={() => {
				onClose()
			}}
		>
			<div className={styles.resizeHandleIndicator}></div>
		</div>
	)
}
