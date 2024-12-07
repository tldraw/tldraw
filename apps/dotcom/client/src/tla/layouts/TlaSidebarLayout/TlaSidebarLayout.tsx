import React, { ReactNode, useCallback, useRef } from 'react'
import { clamp, useQuickReactor, useValue } from 'tldraw'
import { TlaSidebar } from '../../components/TlaSidebar/TlaSidebar'
import { useApp } from '../../hooks/useAppState'
import { usePreventAccidentalDrops } from '../../hooks/usePreventAccidentalDrops'
import {
	getLocalSessionState,
	getLocalSessionStateUnsafe,
	updateLocalSessionState,
} from '../../utils/local-session-state'
import styles from './sidebar-layout.module.css'

const MIN_SIDEBAR_WIDTH = 150
const DEF_SIDEBAR_WIDTH = 260
const MAX_SIDEBAR_WIDTH = 500

export function TlaSidebarLayout({ children }: { children: ReactNode; collapsible?: boolean }) {
	const app = useApp()

	const isSidebarOpen = useValue('sidebar open', () => getLocalSessionState().isSidebarOpen, [app])

	const isSidebarOpenMobile = useValue(
		'sidebar open mobile',
		() => getLocalSessionState().isSidebarOpenMobile,
		[app]
	)

	usePreventAccidentalDrops()

	const rSidebar = useRef<HTMLDivElement>(null)

	// When the local session state sidebar width changes, update the sidebar element's width
	useQuickReactor('update sidebar width', () => {
		if (rSidebar.current) {
			const width = getLocalSessionState().sidebarWidth
			if (typeof width === 'number') {
				rSidebar.current.style.setProperty('--tla-sidebar-width', `${width}px`)
			}
		}
	})

	const rResizeState = useRef<
		| { name: 'idle' }
		| { name: 'pointing'; startWidth: number; startX: number }
		| { name: 'resizing'; startWidth: number; startX: number }
		| { name: 'closing' }
	>({ name: 'idle' })

	const handlePointerDown = useCallback((event: React.PointerEvent) => {
		// Get the current sidebar width as its start width
		const startWidth = rSidebar.current
			? parseInt(getComputedStyle(rSidebar.current).getPropertyValue('--tla-sidebar-width'), 10)
			: 0

		// start pointing
		event.currentTarget.setPointerCapture(event.pointerId)
		rResizeState.current = { name: 'pointing', startX: event.clientX, startWidth }
	}, [])

	const handlePointerMove = useCallback((moveEvent: React.PointerEvent) => {
		if (rResizeState.current.name === 'idle') return

		if (rResizeState.current.name === 'pointing') {
			if (Math.abs(moveEvent.clientX - rResizeState.current.startX) < 5) return // not resizing yet...

			// start resizing
			rResizeState.current = { ...rResizeState.current, name: 'resizing' }
			rSidebar.current?.setAttribute('data-resizing', 'true')
		}

		if (rResizeState.current.name === 'resizing') {
			const { startX, startWidth } = rResizeState.current

			const newWidth = clamp(
				startWidth + (moveEvent.clientX - startX),
				MIN_SIDEBAR_WIDTH,
				MAX_SIDEBAR_WIDTH
			)

			if (newWidth !== getLocalSessionStateUnsafe().sidebarWidth) {
				// Update local sidebar width
				updateLocalSessionState(() => ({ sidebarWidth: newWidth }))
			}
		}
	}, [])

	const rTimeout = useRef<any>(null)

	const handlePointerUp = useCallback((event: React.PointerEvent) => {
		event.currentTarget.releasePointerCapture(event.pointerId)
		rSidebar.current?.removeAttribute('data-resizing')

		if (rResizeState.current.name === 'pointing') {
			// if the menu is at its default size, close it
			if (getLocalSessionStateUnsafe().sidebarWidth === DEF_SIDEBAR_WIDTH) {
				updateLocalSessionState(() => ({ isSidebarOpen: false }))
				rResizeState.current = { name: 'idle' }
				return
			}

			// if it's been resized, the user might be double clicking to reset its width
			rResizeState.current = { name: 'closing' }
			rTimeout.current = setTimeout(() => {
				// close the menu after 200ms unless a double click happens
				if (rResizeState.current.name === 'closing') {
					updateLocalSessionState(() => ({ isSidebarOpen: false }))
					rResizeState.current = { name: 'idle' }
				}
			}, 200)
			return
		}

		// return to idle
		rResizeState.current = { name: 'idle' }
	}, [])

	const handleDoubleClick = useCallback(() => {
		rResizeState.current = { name: 'idle' }
		clearTimeout(rTimeout.current)
		updateLocalSessionState(() => ({ sidebarWidth: DEF_SIDEBAR_WIDTH }))
	}, [])

	return (
		<div
			ref={rSidebar}
			className={styles.layout}
			data-sidebar={isSidebarOpen}
			data-sidebarmobile={isSidebarOpenMobile}
			data-testid="tla-sidebar-layout"
		>
			<TlaSidebar />
			{children}
			{isSidebarOpen && (
				<div
					className={styles.resizeHandle}
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onDoubleClick={handleDoubleClick}
				>
					<div className={styles.resizeHandleIndicator}></div>
				</div>
			)}
		</div>
	)
}
