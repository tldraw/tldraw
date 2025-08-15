import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { useCallback } from 'react'
import { Box } from 'tldraw'
import { SidebarFileContext } from '../app/TldrawApp'
import { createReorderingSystem } from '../utils/reordering'
import { useApp } from './useAppState'

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
	| {
			type: 'pinned'
			fileId: string
	  }

// Create reordering systems for both groups and pinned files
const groupsReordering = createReorderingSystem({
	itemSelector: '[data-group-id]',
	itemIdAttribute: 'data-group-id',
	itemIndexAttribute: 'data-group-index',
	updateIndex: () => {}, // Will be set in the component
})

const pinnedReordering = createReorderingSystem({
	itemSelector: '[data-pinned-file-id]',
	itemIdAttribute: 'data-pinned-file-id',
	itemIndexAttribute: 'data-pinned-index',
	updateIndex: () => {}, // Will be set in the component
})

export function useSidebarDragHandling() {
	const app = useApp()

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const { active } = event
			const data = active.data.current as DraggableItemData
			if (!('clientX' in event.activatorEvent)) {
				throw new Error('Drag start event must have clientX and clientY')
			}

			// Check if this is a group drag
			if (data.type === 'group') {
				app.sidebarState.update((state) => ({
					...state,
					dragState: {
						type: 'group',
						itemId: data.groupId,
						...groupsReordering.calculateDragState(
							data.groupId,
							(event.activatorEvent as any).clientY
						),
					},
				}))
				return
			}

			// Check if this is a pinned file drag
			if (data.type === 'pinned') {
				app.sidebarState.update((state) => ({
					...state,
					dragState: {
						type: 'pinned',
						itemId: data.fileId,
						...pinnedReordering.calculateDragState(
							data.fileId,
							(event.activatorEvent as any).clientY
						),
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
				dragState: {
					type: 'file',
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
			const dragState = app.sidebarState.get().dragState
			if (!dragState || dragState.type !== 'file') {
				return
			}
			if (!dragState.originDropZoneId) {
				return
			}
			const dropZoneElement = document.querySelector(
				`[data-dnd-kit-droppable-id="${dragState.originDropZoneId}"]`
			)
			const draggableElement = document.querySelector(
				`[data-dnd-kit-draggable-id="${dragState.fileId}:${dragState.context}"]`
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
					dragState:
						state.dragState && state.dragState.type === 'file'
							? {
									...state.dragState,
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
			const { over } = event
			const dragState = app.sidebarState.get().dragState

			if (!dragState) return

			// Handle group reordering
			if (dragState.type === 'group') {
				// Clear drag state
				app.sidebarState.update((state) => ({
					...state,
					dragState: null,
				}))

				if (!dragState.nextIndex) {
					return
				}

				app.z.mutate.group.updateIndex({
					groupId: dragState.itemId,
					index: dragState.nextIndex,
				})

				return
			}

			// Handle pinned file reordering
			if (dragState.type === 'pinned') {
				// Clear drag state
				app.sidebarState.update((state) => ({
					...state,
					dragState: null,
				}))

				if (!dragState.nextIndex) {
					return
				}

				app.z.mutate.file_state.updatePinnedIndex({
					fileId: dragState.itemId,
					index: dragState.nextIndex,
				})

				return
			}

			// Handle file drag to drop zones (existing logic)
			if (dragState.type === 'file') {
				// Clear drag state
				app.sidebarState.update((state) => ({
					...state,
					dragState: null,
				}))
			}

			if (!over) return
			if (dragState.type !== 'file') return

			const fileId = dragState.fileId
			const context = dragState.context
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
				// Moving file to "Pinned files"
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

	return {
		handleDragStart,
		handleDragMove,
		handleDragEnd,
		handleDragCancel,
	}
}
