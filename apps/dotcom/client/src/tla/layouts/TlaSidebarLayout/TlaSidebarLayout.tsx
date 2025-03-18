import React, { ReactNode, useCallback, useLayoutEffect, useRef } from 'react'
import { clamp, tltime, useQuickReactor } from 'tldraw'
import { TlaSidebar } from '../../components/TlaSidebar/TlaSidebar'
import { TlaSidebarToggle } from '../../components/TlaSidebar/components/TlaSidebarToggle'
import { TlaSidebarToggleMobile } from '../../components/TlaSidebar/components/TlaSidebarToggleMobile'
import { usePreventAccidentalDrops } from '../../hooks/usePreventAccidentalDrops'
import {
	getLocalSessionState,
	getLocalSessionStateUnsafe,
	toggleSidebar,
	updateLocalSessionState,
	useIsSidebarOpen,
	useIsSidebarOpenMobile,
} from '../../utils/local-session-state'
import styles from './sidebar-layout.module.css'

const MIN_SIDEBAR_WIDTH = 150
const DEF_SIDEBAR_WIDTH = 260
const MAX_SIDEBAR_WIDTH = 500

export function TlaSidebarLayout({
	isEmbed,
	children,
}: {
	isEmbed?: boolean
	children: ReactNode
	collapsible?: boolean
}) {
	const isSidebarOpen = useIsSidebarOpen()
	const isSidebarOpenMobile = useIsSidebarOpenMobile()

	usePreventAccidentalDrops()

	const rLayoutContainer = useRef<HTMLDivElement>(null)

	const updateSidebarWidth = useCallback(() => {
		if (!rLayoutContainer.current) return
		const width = getLocalSessionState().sidebarWidth
		if (typeof width !== 'number') return
		rLayoutContainer.current.style.setProperty('--tla-sidebar-width', `${width}px`)
	}, [])

	// When the local session state sidebar width changes, update the sidebar element's width
	useQuickReactor('update sidebar width', updateSidebarWidth)
	// also update before initial paint to avoid flicker when the width is not default
	useLayoutEffect(updateSidebarWidth, [updateSidebarWidth])

	const rResizeState = useRef<
		| { name: 'idle' }
		| { name: 'pointing'; startWidth: number; startX: number }
		| { name: 'resizing'; startWidth: number; startX: number }
		| { name: 'closing' }
	>({ name: 'idle' })

	const handlePointerDown = useCallback((event: React.PointerEvent) => {
		// start pointing
		event.currentTarget.setPointerCapture(event.pointerId)

		// Get the current sidebar width as its start width
		const startWidth = rLayoutContainer.current
			? parseInt(
					getComputedStyle(rLayoutContainer.current).getPropertyValue('--tla-sidebar-width'),
					10
				)
			: 0

		rResizeState.current = { name: 'pointing', startX: event.clientX, startWidth }
	}, [])

	const handlePointerMove = useCallback((moveEvent: React.PointerEvent) => {
		if (rResizeState.current.name === 'idle') return

		if (rResizeState.current.name === 'pointing') {
			if (Math.abs(moveEvent.clientX - rResizeState.current.startX) < 5) return // not resizing yet...

			// start resizing
			rResizeState.current = { ...rResizeState.current, name: 'resizing' }
			rLayoutContainer.current?.setAttribute('data-resizing', 'true')
		}

		if (rResizeState.current.name === 'resizing') {
			const { startX, startWidth } = rResizeState.current

			const newWidth = Math.floor(
				clamp(startWidth + (moveEvent.clientX - startX), MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH)
			)

			if (newWidth !== getLocalSessionStateUnsafe().sidebarWidth) {
				// Update local sidebar width
				updateLocalSessionState(() => ({ sidebarWidth: newWidth }))
			}
		}
	}, [])

	const rTimeout = useRef<any>(null)

	const handlePointerUp = useCallback((event: React.PointerEvent) => {
		// regardless of whether we're in pointing or resizing, remove capture and the resizing attribute
		event.currentTarget.releasePointerCapture(event.pointerId)

		if (rResizeState.current.name === 'idle') {
			// noop
			return
		}

		if (rResizeState.current.name === 'resizing') {
			// we're done, go to idle
			rResizeState.current = { name: 'idle' }
			rLayoutContainer.current?.removeAttribute('data-resizing')
		}

		function closeSidebar() {
			toggleSidebar(false)
			rLayoutContainer.current?.removeAttribute('data-resizing')
			rResizeState.current = { name: 'idle' }
		}

		if (rResizeState.current.name === 'pointing') {
			// if the menu is at its default size, close it
			if (getLocalSessionStateUnsafe().sidebarWidth === DEF_SIDEBAR_WIDTH) {
				closeSidebar()
				return
			}

			// if it's been resized, the user might be double clicking to reset its width
			rResizeState.current = { name: 'closing' }
			rTimeout.current = tltime.setTimeout(
				'close sidebar on click if not a double click',
				() => {
					// close the menu after 200ms unless a double click happens
					if (rResizeState.current.name === 'closing') {
						closeSidebar()
					}
				},
				200
			)
			return
		}
	}, [])

	const handleDoubleClick = useCallback(() => {
		// reset the sidebar width to its default width on double click

		// cancel the "close sidebar on click if not a double click" timeout since its a double click
		clearTimeout(rTimeout.current)

		// prevent animation by adding resizing and then removing it after a moment
		rLayoutContainer.current?.setAttribute('data-resizing', 'true')
		rTimeout.current = tltime.setTimeout(
			'sidebar resizing variable after animation ends',
			() => rLayoutContainer.current?.removeAttribute('data-resizing'),
			200
		)

		// resize and return to idle
		updateLocalSessionState(() => ({ sidebarWidth: DEF_SIDEBAR_WIDTH }))
		rResizeState.current = { name: 'idle' }
	}, [])

	return (
		<div
			ref={rLayoutContainer}
			className={styles.layout}
			data-sidebar={!isEmbed && isSidebarOpen}
			data-sidebarmobile={!isEmbed && isSidebarOpenMobile}
			data-testid="tla-sidebar-layout"
		>
			{isEmbed ? (
				children
			) : (
				<>
					<TlaSidebar />
					{children}
					<div className={styles.toggleContainer}>
						<TlaSidebarToggle />
						<TlaSidebarToggleMobile />
					</div>
					{isSidebarOpen && (
						<div
							className={styles.resizeHandle}
							onPointerDown={handlePointerDown}
							onPointerMove={handlePointerMove}
							draggable={false}
							onDoubleClick={handleDoubleClick}
							onLostPointerCapture={handlePointerUp}
						>
							<div className={styles.resizeHandleIndicator}></div>
						</div>
					)}
				</>
			)}
		</div>
	)
}
