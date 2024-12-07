import React, { ReactNode, useCallback, useRef } from 'react'
import { clamp, stopEventPropagation, useQuickReactor, useValue } from 'tldraw'
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
	const rResizeState = useRef({ name: 'idle' } as
		| { name: 'idle' }
		| { name: 'pointing'; startWidth: number; startX: number }
		| { name: 'resizing'; startWidth: number; startX: number })

	const handlePointerDown = useCallback(
		(event: React.PointerEvent) => {
			const startWidth = layoutRef.current
				? parseInt(getComputedStyle(layoutRef.current).getPropertyValue('--tla-sidebar-width'), 10)
				: 0

			event.currentTarget.setPointerCapture(event.pointerId)
			rResizeState.current = { name: 'pointing', startX: event.clientX, startWidth }
		},
		[layoutRef]
	)

	const handlePointerMove = useCallback(
		(moveEvent: React.PointerEvent) => {
			if (rResizeState.current.name === 'idle') return

			if (rResizeState.current.name === 'pointing') {
				const dx = moveEvent.clientX - rResizeState.current.startX
				if (Math.abs(dx) < 5) return
				rResizeState.current = { ...rResizeState.current, name: 'resizing' }
				layoutRef.current?.setAttribute('data-resizing', 'true')
			}

			if (rResizeState.current.name === 'resizing') {
				const newWidth = clamp(
					rResizeState.current.startWidth + (moveEvent.clientX - rResizeState.current.startX),
					MIN_SIDEBAR_WIDTH,
					MAX_SIDEBAR_WIDTH
				)
				onResize(newWidth)
			}
		},
		[onResize, layoutRef]
	)

	const handlePointerUp = useCallback(
		(event: React.PointerEvent) => {
			layoutRef.current?.removeAttribute('data-resizing')
			event.currentTarget.releasePointerCapture(event.pointerId)

			if (rResizeState.current.name === 'resizing') {
				stopEventPropagation(event)
			} else {
				onClose()
			}

			rResizeState.current = { name: 'idle' }
		},
		[layoutRef, onClose]
	)

	return (
		<div
			className={styles.resizeHandle}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
		>
			<div className={styles.resizeHandleIndicator}></div>
		</div>
	)
}
