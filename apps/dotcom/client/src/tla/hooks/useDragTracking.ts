import { DragFileOperation, DragGroupOperation, DragReorderOperation } from '@tldraw/dotcom-shared'
import { getIndexAbove, getIndexBetween, IndexKey } from '@tldraw/utils'
import assert from 'assert'
import { useCallback, useEffect, useRef } from 'react'
import { Vec } from 'tldraw'
import { TldrawApp } from '../app/TldrawApp'
import { useApp } from './useAppState'

export interface DropTarget {
	id: string
	element: HTMLElement
	rect: DOMRect
}

function detectDragOperations(
	elements: DragElements,
	mousePosition: { x: number; y: number },
	dragType: 'file' | 'group',
	dragId: string
): DragFileOperation | DragGroupOperation {
	if (dragType === 'file') {
		return detectFileOperations(elements, mousePosition)
	} else {
		return detectGroupOperation(elements.groupItems ?? [], mousePosition, dragId)
	}
}

function detectFileOperations(
	elements: DragElements,
	mousePosition: { x: number; y: number }
): DragFileOperation {
	const operations: DragFileOperation = {}

	// Check for move operation - mouse over different group
	const hoveredGroupId = findHoveredGroupId(elements, mousePosition)
	const group =
		hoveredGroupId === elements.myFiles.id
			? elements.myFiles
			: elements.groups.find((g) => g.id === hoveredGroupId)!
	const isPinned = elements.draggedElement.getAttribute('data-is-pinned') === 'true'
	const containsDraggedElement = group?.element.contains(elements.draggedElement)
	if (hoveredGroupId && !containsDraggedElement) {
		operations.move = { targetId: hoveredGroupId }
	}

	// Check for reorder operation

	if (containsDraggedElement) {
		const reorderOp = detectFileReorderOperation(
			hoveredGroupId === elements.myFiles.id
				? elements.myFiles
				: elements.groups.find((g) => g.id === hoveredGroupId)!,
			mousePosition
		)
		if (reorderOp) {
			operations.reorder = reorderOp
		} else if (isPinned) {
			// unpin the file
			operations.move = { targetId: hoveredGroupId! }
		}
	}

	return operations
}

function detectGroupOperation(
	groupItems: Array<{ id: string; element: HTMLElement }>,
	mousePosition: { x: number; y: number },
	draggedGroupId: string
): DragGroupOperation {
	if (groupItems.filter((g) => g.id !== draggedGroupId).length === 0) {
		return {}
	}

	const startTop = groupItems[0].element.getBoundingClientRect().top

	let insertBeforeId = null as null | string
	let indicatorY = null as null | number
	let prevBottom = startTop - REORDER_BOUNDARY_INDICATOR_OFFSET * 2

	for (const target of groupItems) {
		const rect = target.element.getBoundingClientRect()
		const midY = rect.top + rect.height / 2
		if (mousePosition.y < midY) {
			insertBeforeId = target.id
			indicatorY = (rect.top + prevBottom) / 2
			break
		}
		prevBottom = rect.bottom
	}

	return {
		reorder: {
			insertBeforeId,
			indicatorY: indicatorY ?? prevBottom + REORDER_BOUNDARY_INDICATOR_OFFSET,
		},
	}
}

function findHoveredGroupId(
	elements: DragElements,
	mousePosition: { x: number; y: number }
): string | null {
	// Find group or home group target that contains the mouse
	if (isPointInRect(mousePosition, elements.myFiles.element.getBoundingClientRect())) {
		return elements.myFiles.id
	}

	return (
		elements.groups.find((target) => {
			return isPointInRect(mousePosition, target.element.getBoundingClientRect())
		})?.id ?? null
	)
}

// This adds a little bit of an offset to the indicator
// so it doesn't hug the top or bottom edge of the adjacent
// item too closely if it's at the top or bottom of the list.
const REORDER_BOUNDARY_INDICATOR_OFFSET = 2
// This cuts off the reorder operation for pinned files if the mouse
// strays too far above or below the pinned file section.
const REORDER_PINNED_BOUNDARY_INDICATOR_THRESHOLD = 15

function detectFileReorderOperation(
	groupElements: GroupElements,
	mousePosition: { x: number; y: number }
): DragReorderOperation | null {
	if (groupElements.pinnedFiles.length === 0 && !groupElements.topUnpinnedFile) {
		// don't offer pinning if the group is empty
		return null
	}
	const startTop = (
		groupElements.pinnedFiles[0]?.element ?? groupElements.topUnpinnedFile!.element
	).getBoundingClientRect().top
	const endBottom =
		groupElements.pinnedFiles[groupElements.pinnedFiles.length - 1]?.element.getBoundingClientRect()
			.bottom ?? groupElements.topUnpinnedFile!.element.getBoundingClientRect().top

	if (
		mousePosition.y < startTop - REORDER_PINNED_BOUNDARY_INDICATOR_THRESHOLD ||
		mousePosition.y > endBottom + REORDER_PINNED_BOUNDARY_INDICATOR_THRESHOLD
	) {
		return null
	}

	let insertBeforeId = null as null | string
	let indicatorY = null as null | number
	let prevBottom = startTop - REORDER_BOUNDARY_INDICATOR_OFFSET

	for (const target of groupElements.pinnedFiles) {
		const rect = target.element.getBoundingClientRect()
		const midY = rect.top + rect.height / 2
		if (mousePosition.y < midY) {
			insertBeforeId = target.id
			indicatorY = (rect.top + prevBottom) / 2
			break
		}
		prevBottom = rect.bottom
	}

	return {
		insertBeforeId,
		indicatorY: indicatorY ?? prevBottom + REORDER_BOUNDARY_INDICATOR_OFFSET,
	}
}

function isPointInRect(point: { x: number; y: number }, rect: DOMRect): boolean {
	return (
		point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
	)
}

async function executeFileOperations(
	app: TldrawApp,
	fileId: string,
	groupId: string,
	operation: DragFileOperation
) {
	if (operation.move || operation.reorder) {
		app.z.mutate.handleFileDragOperation({
			fileId,
			groupId,
			operation,
		})

		// Expand the target group if it's collapsed
		if (operation.move) {
			const targetGroupId = operation.move.targetId
			const homeGroupId = app.getHomeGroupId()
			if (targetGroupId !== homeGroupId) {
				app.ensureSidebarGroupExpanded(targetGroupId)
			}
		}
	}
}

async function executeGroupOperations(app: TldrawApp, groupId: string, operation: any) {
	if (operation.reorder) {
		const { insertBeforeId } = operation.reorder

		// Get all group memberships sorted by current index
		const allGroups = app.getGroupMemberships()
		const sortedGroups = allGroups.filter((g) => g.groupId !== app.getHomeGroupId())

		// Calculate the new index for the group
		let newIndex: IndexKey

		if (insertBeforeId === null) {
			// Insert at end - get index above the last group
			const lastGroup = sortedGroups[sortedGroups.length - 1]
			newIndex = lastGroup?.index ? getIndexAbove(lastGroup.index) : ('a0' as IndexKey)
		} else {
			// Insert before specific group
			const targetIdx = sortedGroups.findIndex((g) => g.groupId === insertBeforeId)
			const afterGroup = sortedGroups[targetIdx]
			const beforeGroup = sortedGroups[targetIdx - 1]
			newIndex = getIndexBetween(beforeGroup?.index, afterGroup?.index)
		}

		await app.z.mutate.updateOwnGroupUser({ groupId, index: newIndex }).client
	}
}

interface GroupElements {
	id: string
	element: HTMLElement
	pinnedFiles: Array<{ id: string; element: HTMLElement }>
	topUnpinnedFile: { id: string; element: HTMLElement } | null
}
interface DragElements {
	draggedElement: HTMLElement
	groupId: string
	myFiles: GroupElements
	groups: GroupElements[]
	groupItems?: Array<{ id: string; element: HTMLElement }>
}

export function useDragTracking() {
	const app = useApp()
	const cleanupRef = useRef(null as null | ((cancel: boolean) => void))

	const startDragTracking = useCallback(
		({
			groupId,
			fileId,
			clientX,
			clientY,
		}: {
			groupId: string
			fileId?: string
			clientX: number
			clientY: number
		}) => {
			const dragType = fileId ? 'file' : 'group'
			const dragId = fileId ?? groupId
			assert(!cleanupRef.current, 'Drag tracking already started')

			// Query all drop target elements
			const groupElements = document.querySelectorAll('[data-drop-target-id^="group:"]')
			const homeGroupId = app.getHomeGroupId()
			const myFilesElement = document.querySelector(`[data-drop-target-id="${homeGroupId}"]`)

			assert(myFilesElement, 'myFilesElement not found')

			function getGroupElements(id: string, element: HTMLElement) {
				const topUnpinnedFile = element.querySelector('[data-is-pinned="false"]')
				return {
					id,
					element,
					pinnedFiles: [...element.querySelectorAll('[data-is-pinned="true"]')].map((element) => ({
						id: element.getAttribute('data-drop-target-id')!.replace('file:', ''),
						element: element as HTMLElement,
					})),
					topUnpinnedFile: topUnpinnedFile
						? {
								id: topUnpinnedFile.getAttribute('data-drop-target-id')!.replace('file:', ''),
								element: topUnpinnedFile as HTMLElement,
							}
						: null,
				}
			}

			const elements: DragElements = {
				draggedElement: document.querySelector(
					`[data-drop-target-id="${dragType}:${dragId}"]`
				) as HTMLElement,
				groupId,
				myFiles: getGroupElements(app.getHomeGroupId(), myFilesElement as HTMLElement),
				groups: [...groupElements].map((element) =>
					getGroupElements(element.getAttribute('data-group-id')!, element as HTMLElement)
				),
				// For group dragging, collect all group item elements for reordering
				groupItems:
					dragType === 'group'
						? [...groupElements].map((element) => ({
								id: element.getAttribute('data-group-id')!,
								element: element as HTMLElement,
							}))
						: undefined,
			}
			const mousePosition = { x: clientX, y: clientY }
			const startMousePosition = { x: clientX, y: clientY }
			let hasDragStarted = false

			// Add global mouse move listener to track mouse position
			const handleMouseMove = (e: MouseEvent) => {
				mousePosition.x = e.clientX
				mousePosition.y = e.clientY
				if (Vec.Dist(startMousePosition, mousePosition) > 5) {
					hasDragStarted = true
				}
			}

			window.addEventListener('drag', handleMouseMove)
			let animationFrame = 0

			// Start the measurement loop
			const onFrame = () => {
				if (!cleanupRef.current) return

				// Update bounding boxes for all drop targets
				// Detect operations and update app state
				const operation = detectDragOperations(elements, mousePosition, dragType, dragId)

				// Update app state with detected operations
				app.sidebarState.set({
					...app.sidebarState.get(),
					dragState: {
						hasDragStarted,
						type: dragType,
						id: dragId,
						operation,
					},
				})

				// Schedule next frame
				animationFrame = requestAnimationFrame(onFrame)
			}

			document.body.setAttribute('data-is-dragging', 'true')
			const onDone = () => {
				cleanupRef.current?.(false)
			}
			const onCancel = () => {
				cleanupRef.current?.(true)
			}
			window.addEventListener('dragend', onDone)
			window.addEventListener('pointerup', onDone)
			window.addEventListener('blur', onDone)
			window.addEventListener('keydown', onCancel)

			cleanupRef.current = (cancel: boolean) => {
				cleanupRef.current = null
				cancelAnimationFrame(animationFrame)
				window.removeEventListener('drag', handleMouseMove)
				window.removeEventListener('dragend', onDone)
				window.removeEventListener('pointerup', onDone)
				window.removeEventListener('blur', onDone)
				window.removeEventListener('keydown', onCancel)
				document.body.removeAttribute('data-is-dragging')
				const dragState = app.sidebarState.get().dragState
				app.sidebarState.set({
					...app.sidebarState.get(),
					dragState: null,
				})
				if (!cancel) {
					// Execute operations before clearing drag state
					if (dragState && fileId) {
						executeFileOperations(app, fileId, groupId, dragState.operation)
					} else if (dragState && dragState.type === 'group') {
						executeGroupOperations(app, dragState.id, dragState.operation)
					}
				}
			}

			onFrame()
		},
		[app]
	)

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			cleanupRef.current?.(true)
		}
	}, [])

	return {
		startDragTracking,
	}
}
