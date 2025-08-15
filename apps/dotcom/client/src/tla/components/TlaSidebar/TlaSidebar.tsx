import {
	DndContext,
	DragEndEvent,
	DragOverEvent,
	DragStartEvent,
	PointerSensor,
	useSensor,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { memo, MouseEvent, useCallback, useEffect, useRef } from 'react'
import { Box, getIndexBetween, IndexKey, preventDefault, useValue } from 'tldraw'
import { SidebarFileContext } from '../../app/TldrawApp'
import { useApp } from '../../hooks/useAppState'
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
import { TlaSidebarDragOverlay } from './components/TlaSidebarDragOverlay'
import { TlaSidebarHelpMenu } from './components/TlaSidebarHelpMenu'
import { TlaSidebarRecentFiles } from './components/TlaSidebarRecentFiles'
import { TlaSidebarRecentFilesNew } from './components/TlaSidebarRecentFilesNew'
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

	const hasGroups = useHasFlag('groups')

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

export type DraggableItemData =
	| {
			type: 'group'
			groupId: string
			currentIndex: string
	  }
	| {
			type: 'file'
			fileId: string
			context: SidebarFileContext
	  }

function getNearestDivs(mouseY: number): [HTMLElement | undefined, HTMLElement | undefined] {
	const groupDivs = document.querySelectorAll('[data-group-id]') as NodeListOf<HTMLElement>

	let minDistance = Infinity
	let closestDivIndex = -1
	let insertType = 'before' as 'before' | 'after'

	for (let i = 0; i < groupDivs.length; i++) {
		const groupDiv = groupDivs[i]
		const groupDivRect = groupDiv.getBoundingClientRect()
		const centerY = groupDivRect.top + groupDivRect.height / 2
		const distance = Math.abs(centerY - mouseY)
		if (distance < minDistance) {
			minDistance = distance
			closestDivIndex = i
			insertType = centerY > mouseY ? 'before' : 'after'
		}
	}

	const closestDiv = groupDivs[closestDivIndex]
	const neighborDiv = groupDivs[closestDivIndex + (insertType === 'before' ? -1 : 1)]

	return insertType === 'before' ? [neighborDiv, closestDiv] : [closestDiv, neighborDiv]
}

function getDragState(
	groupId: string,
	mouseY: number
): { cursorLineY: number | null; nextIndex: IndexKey | null } {
	const [before, after] = getNearestDivs(mouseY)
	// if dropping here would not change the group's index, don't show the drag state
	if (
		before?.getAttribute('data-group-id') === groupId ||
		after?.getAttribute('data-group-id') === groupId
	) {
		return {
			cursorLineY: null,
			nextIndex: null,
		}
	}
	const nextIndex = getIndexBetween(
		before?.getAttribute('data-group-index') as IndexKey | undefined,
		after?.getAttribute('data-group-index') as IndexKey | undefined
	)
	const beforeRect = before?.getBoundingClientRect()
	const afterRect = after?.getBoundingClientRect()
	const margin = 2
	const cursorLineY = !before
		? afterRect!.top - margin
		: !after
			? beforeRect!.bottom + margin
			: (beforeRect!.bottom + afterRect!.top) / 2

	return {
		cursorLineY,
		nextIndex,
	}
}

function NewSidebarLayout() {
	const app = useApp()

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const { active } = event
			const data = active.data.current as DraggableItemData
			if (!('clientX' in event.activatorEvent)) {
				throw new Error('Drag start event must have clientX and clientY')
			}

			// Check if this is a group drag (vs a file drag)
			if (data.type === 'group') {
				app.sidebarState.update((state) => ({
					...state,
					groupDragState: {
						groupId: data.groupId,
						...getDragState(data.groupId, (event.activatorEvent as any).clientY),
					},
				}))
				return
			}

			// Handle file drags
			const [fileId, context] = active.id.toString().split(':') as [string, SidebarFileContext]

			// Validate that the user can move this file
			const file = app.getFile(fileId)
			if (!file) {
				app.toasts?.addToast({
					severity: 'error',
					title: 'File not found',
				})
				return
			}

			// Check if user has permission to move this file
			const canUpdateFile = app.canUpdateFile(fileId)
			if (!canUpdateFile) {
				app.toasts?.addToast({
					severity: 'error',
					title: 'Cannot move file',
					description: 'You do not have permission to move this file',
				})
				return
			}

			// Find the drop zone that the drag started in
			let originDropZoneId: string | undefined
			const activeElement = event.activatorEvent.target as HTMLElement
			if (activeElement) {
				// Find the closest parent drop zone element
				const dropZoneElement = activeElement.closest('[data-dnd-kit-droppable-id]')
				if (dropZoneElement) {
					originDropZoneId = dropZoneElement.getAttribute('data-dnd-kit-droppable-id') || undefined
				}
			}

			app.sidebarState.update((state) => ({
				...state,
				fileDragState: {
					fileId,
					context: context as SidebarFileContext,
					originDropZoneId,
				},
			}))
		},
		[app]
	)

	const handleDragMove = useCallback(
		(_event: DragOverEvent) => {
			// We don't want to show the drop zone overlay on the originating drop zone until we've left it
			// and come back.
			const fileDragState = app.sidebarState.get().fileDragState
			const groupDragState = app.sidebarState.get().groupDragState
			if (groupDragState) {
				return
			}
			if (!fileDragState?.originDropZoneId) {
				return
			}
			const dropZoneElement = document.querySelector(
				`[data-dnd-kit-droppable-id="${fileDragState.originDropZoneId}"]`
			)
			const draggableElement = document.querySelector(
				`[data-dnd-kit-draggable-id="${fileDragState.fileId}:${fileDragState.context}"]`
			)
			if (!dropZoneElement || !draggableElement) {
				return
			}
			const dropZoneRect = dropZoneElement.getBoundingClientRect()
			const draggableRect = draggableElement.getBoundingClientRect()
			if (
				!new Box(
					dropZoneRect.left,
					dropZoneRect.top,
					dropZoneRect.width,
					dropZoneRect.height
				).collides(
					new Box(draggableRect.left, draggableRect.top, draggableRect.width, draggableRect.height)
				)
			) {
				// If we are no longer over the origin drop zone, clear it
				app.sidebarState.update((state) => ({
					...state,
					fileDragState: state.fileDragState
						? {
								...state.fileDragState,
								originDropZoneId: undefined,
							}
						: null,
				}))
			}
		},
		[app]
	)

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event

			const groupDragState = app.sidebarState.get().groupDragState
			if (groupDragState) {
				// Clear drag state
				app.sidebarState.update((state) => ({
					...state,
					groupDragState: null,
				}))

				if (!groupDragState.nextIndex) {
					return
				}

				app.z.mutate.group.updateIndex({
					groupId: groupDragState.groupId,
					index: groupDragState.nextIndex,
				})

				return
			}

			// Clear drag state
			app.sidebarState.update((state) => ({
				...state,
				fileDragState: null,
			}))

			if (!over) return

			const [fileId, context] = active.id.toString().split(':') as [string, SidebarFileContext]
			const dropZoneId = over.id.toString()

			// Handle file movement logic
			if (dropZoneId === 'my-files-drop-zone') {
				// Moving file to "My files"
				if (context === 'group-files') {
					// File is being moved from a group to "My files"
					app.z.mutate.group.ungroupFile({ fileId })
				} else if (context === 'my-files') {
					// File is already in "My files" - no action needed
					app.toasts?.addToast({
						severity: 'info',
						title: 'File is already in My files',
					})
				}
			} else if (dropZoneId.startsWith('group-') && dropZoneId.endsWith('-drop-zone')) {
				// Moving file to a group
				const targetGroupId = dropZoneId.replace('group-', '').replace('-drop-zone', '')

				// Validate target group exists
				const targetGroup = app.getGroupMembership(targetGroupId)
				if (!targetGroup) {
					app.toasts?.addToast({
						severity: 'error',
						title: 'Group not found',
						description: 'The target group no longer exists',
					})
					return
				}

				if (context === 'my-files' || context === 'group-files') {
					// Check if file is already in the target group
					const file = app.getFile(fileId)
					if (!file || file?.owningGroupId === targetGroupId) {
						// app.toasts?.addToast({
						// 	severity: 'info',
						// 	title: 'File is already in this group',
						// })
						return
					}

					const wasOnlyGroupFile =
						app.getGroupMembership(file.owningGroupId!)?.groupFiles.length === 1 &&
						app.getGroupMembership(file.owningGroupId!)?.groupFiles[0].fileId === fileId

					if (wasOnlyGroupFile) {
						// make the closed state permanent
						app.sidebarState.update((state) => ({
							...state,
							expandedGroups: new Set(
								[...state.expandedGroups].filter((g) => g !== file.owningGroupId)
							),
						}))
					}

					// File is being moved from "My files" to a group, or from one group to another
					await app.z.mutate.group.moveFileToGroup({ fileId, groupId: targetGroupId })
					app.sidebarState.update((state) => ({
						...state,
						expandedGroups: new Set([...state.expandedGroups, targetGroupId]),
					}))
				}
			} else if (dropZoneId === 'my-files-pinned-drop-zone') {
				// Moving file to "Favorites"
				if (!app.getFileState(fileId)?.isPinned) {
					app.pinOrUnpinFile(fileId)
				}
			} else {
				// Invalid drop zone - this shouldn't happen but handle gracefully
				app.toasts?.addToast({
					severity: 'error',
					title: 'Invalid drop target',
					description: 'Cannot drop files here',
				})
			}
		},
		[app]
	)

	const handleDragCancel = useCallback(() => {
		// Clear drag state when drag is cancelled
		app.sidebarState.update((state) => ({
			...state,
			dragState: null,
		}))
	}, [app])

	const pointerSensor = useSensor(PointerSensor, {
		activationConstraint: {
			distance: 5, // Only start dragging after moving 5px
		},
	})

	return (
		<DndContext
			modifiers={[restrictToVerticalAxis]}
			sensors={[pointerSensor]}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onDragCancel={handleDragCancel}
			onDragMove={handleDragMove}
		>
			<HandleGroupDragging />
			<TlaSidebarRecentFilesNew />
			<TlaSidebarDragOverlay />
		</DndContext>
	)
}

/**
 * Alas dnd-kit doesn't give us mouse positions in the onDragMove handler.
 * It _does_ give the start position + delta, but it doesn't expose scroll position changes I don't think??
 *
 * @returns
 */
function HandleGroupDragging() {
	const app = useApp()
	const isDragging = useValue('isDragging', () => app.sidebarState.get().groupDragState != null, [
		app,
	])

	useEffect(() => {
		if (isDragging) {
			document.body.setAttribute('data-dragging-group', 'true')
		} else {
			document.body.removeAttribute('data-dragging-group')
		}
	}, [isDragging])

	const mousePosition = useRef({ clientX: 0, clientY: 0 })

	useEffect(() => {
		if (!isDragging) return
		const handleMouseMove = (event: MouseEvent) => {
			mousePosition.current = { clientX: event.clientX, clientY: event.clientY }
		}
		window.addEventListener('mousemove', handleMouseMove as any)
		const updateDragState = () => {
			try {
				const groupDragState = app.sidebarState.get().groupDragState
				if (!groupDragState) return
				const nextDragState = getDragState(groupDragState.groupId, mousePosition.current.clientY)
				if (
					nextDragState.cursorLineY === groupDragState.cursorLineY &&
					nextDragState.nextIndex === groupDragState.nextIndex
				) {
					return
				}
				app.sidebarState.update((state) => ({
					...state,
					groupDragState: {
						groupId: groupDragState.groupId,
						...getDragState(groupDragState.groupId, mousePosition.current.clientY),
					},
				}))
			} finally {
				raf = requestAnimationFrame(updateDragState)
			}
		}
		let raf = requestAnimationFrame(updateDragState)
		return () => {
			window.removeEventListener('mousemove', handleMouseMove as any)
			cancelAnimationFrame(raf)
		}
	}, [isDragging, app])

	return null
}
