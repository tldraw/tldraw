import assert from 'assert'
import { DragFileOperation, DragReorderOperation } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useRef } from 'react'
import { Vec } from 'tldraw'
import { TldrawApp } from '../app/TldrawApp'
import { useApp } from './useAppState'

function detectFileOperations(
	elements: DragElements,
	mousePosition: { x: number; y: number }
): DragFileOperation {
	const operations: DragFileOperation = {}

	// Only the active workspace's file list is a drop target. Moving files to
	// another workspace by dragging isn't possible since the workspace
	// switcher became a dropdown; moving happens through the file menu.
	if (!isPointInRect(mousePosition, elements.activeWorkspace.element.getBoundingClientRect())) {
		return operations
	}

	const reorderOp = detectFileReorderOperation(elements.activeWorkspace, mousePosition)
	const isPinned = elements.draggedElement.getAttribute('data-is-pinned') === 'true'
	if (reorderOp) {
		operations.reorder = reorderOp
	} else if (isPinned) {
		// unpin the file
		operations.move = { targetId: elements.activeWorkspace.id }
	}

	return operations
}

// Auto-scroll the sidebar while dragging when the pointer nears the top or
// bottom edge of the scroll container. These mirror the page menu's drag
// scrolling (see DefaultPageMenu) so the two pieces of UI behave the same.
// AUTO_SCROLL_ZONE is how far from the edge the auto-scroll begins;
// RAMP_DISTANCE is how far past that point it takes to reach max speed.
const AUTO_SCROLL_ZONE = 16
const AUTO_SCROLL_RAMP_DISTANCE = 48
const MIN_AUTO_SCROLL_SPEED = 1
const MAX_AUTO_SCROLL_SPEED = 6

// Scrolls the sidebar container by one frame's worth of auto-scroll when the
// pointer is within AUTO_SCROLL_ZONE of an edge, ramping the speed up the
// further past the edge the pointer goes. Reorder/move targets are recomputed
// on the next frame from fresh element rects, so no offset bookkeeping is
// needed here — the native drag image follows the cursor on its own.
function tickAutoScroll(container: HTMLElement, mousePosition: { y: number }) {
	const rect = container.getBoundingClientRect()
	const fromTop = mousePosition.y - rect.top
	const fromBottom = rect.bottom - mousePosition.y
	const maxScroll = container.scrollHeight - container.clientHeight

	const overshootTop = AUTO_SCROLL_ZONE - fromTop
	const overshootBottom = AUTO_SCROLL_ZONE - fromBottom

	let dy = 0
	if (overshootTop > 0 && container.scrollTop > 0) {
		const t = Math.min(1, overshootTop / AUTO_SCROLL_RAMP_DISTANCE)
		dy = -Math.ceil(MIN_AUTO_SCROLL_SPEED + (MAX_AUTO_SCROLL_SPEED - MIN_AUTO_SCROLL_SPEED) * t)
	} else if (overshootBottom > 0 && container.scrollTop < maxScroll) {
		const t = Math.min(1, overshootBottom / AUTO_SCROLL_RAMP_DISTANCE)
		dy = Math.ceil(MIN_AUTO_SCROLL_SPEED + (MAX_AUTO_SCROLL_SPEED - MIN_AUTO_SCROLL_SPEED) * t)
	}

	if (dy !== 0) {
		container.scrollTop = Math.max(0, Math.min(maxScroll, container.scrollTop + dy))
	}
}

// This adds a little bit of an offset to the indicator
// so it doesn't hug the top or bottom edge of the adjacent
// item too closely if it's at the top or bottom of the list.
const REORDER_BOUNDARY_INDICATOR_OFFSET = 2
// This cuts off the reorder operation for pinned files if the mouse
// strays too far above or below the pinned file section.
const REORDER_PINNED_BOUNDARY_INDICATOR_THRESHOLD = 15

function detectFileReorderOperation(
	workspaceElements: WorkspaceElements,
	mousePosition: { x: number; y: number }
): DragReorderOperation | null {
	if (workspaceElements.pinnedFiles.length === 0 && !workspaceElements.topUnpinnedFile) {
		// don't offer pinning if the group is empty
		return null
	}
	const startTop = (
		workspaceElements.pinnedFiles[0]?.element ?? workspaceElements.topUnpinnedFile!.element
	).getBoundingClientRect().top
	const endBottom =
		workspaceElements.pinnedFiles[
			workspaceElements.pinnedFiles.length - 1
		]?.element.getBoundingClientRect().bottom ??
		workspaceElements.topUnpinnedFile!.element.getBoundingClientRect().top

	if (
		mousePosition.y < startTop - REORDER_PINNED_BOUNDARY_INDICATOR_THRESHOLD ||
		mousePosition.y > endBottom + REORDER_PINNED_BOUNDARY_INDICATOR_THRESHOLD
	) {
		return null
	}

	let insertBeforeId = null as null | string
	let indicatorY = null as null | number
	let prevBottom = startTop - REORDER_BOUNDARY_INDICATOR_OFFSET

	for (const target of workspaceElements.pinnedFiles) {
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
	workspaceId: string,
	operation: DragFileOperation
) {
	if (operation.move || operation.reorder) {
		app.z.mutate.handleFileDragOperation({
			fileId,
			workspaceId,
			operation,
		})
	}
}

interface WorkspaceElements {
	id: string
	element: HTMLElement
	pinnedFiles: Array<{ id: string; element: HTMLElement }>
	topUnpinnedFile: { id: string; element: HTMLElement } | null
}
interface DragElements {
	draggedElement: HTMLElement
	workspaceId: string
	activeWorkspace: WorkspaceElements
}

export function useDragTracking() {
	const app = useApp()
	const cleanupRef = useRef(null as null | ((cancel: boolean) => void))

	const startDragTracking = useCallback(
		({
			workspaceId,
			fileId,
			clientX,
			clientY,
		}: {
			workspaceId: string
			fileId: string
			clientX: number
			clientY: number
		}) => {
			assert(!cleanupRef.current, 'Drag tracking already started')

			// The active workspace's file list is the only drop target
			const homeWorkspaceId = app.getHomeWorkspaceId()
			const activeWorkspaceElement = document.querySelector(
				workspaceId === homeWorkspaceId
					? `[data-drop-target-id="${homeWorkspaceId}"]`
					: `[data-drop-target-id="workspace:${workspaceId}"]`
			)
			const scrollContainer = document.querySelector<HTMLElement>('[data-sidebar-scroll-container]')

			assert(activeWorkspaceElement, 'active workspace file list not found')

			function getWorkspaceElements(id: string, element: HTMLElement) {
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
					`[data-drop-target-id="file:${fileId}"]`
				) as HTMLElement,
				workspaceId,
				activeWorkspace: getWorkspaceElements(workspaceId, activeWorkspaceElement as HTMLElement),
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

			// The `drag` event is throttled well below the animation-frame rate,
			// so on its own it leaves `mousePosition` stale between frames — the
			// auto-scroll loop would keep scrolling for several frames after the
			// pointer has already left the edge zone. `dragover` fires as the
			// pointer moves across elements, refreshing the position within about
			// a frame of leaving the zone. We only read coordinates here (no
			// preventDefault), so this doesn't affect drop handling.
			window.addEventListener('drag', handleMouseMove)
			window.addEventListener('dragover', handleMouseMove)
			let animationFrame = 0

			// Start the measurement loop
			const onFrame = () => {
				if (!cleanupRef.current) return

				// Auto-scroll the sidebar when the pointer nears an edge so the
				// list keeps moving even though native drag suppresses scrolling.
				if (scrollContainer) {
					tickAutoScroll(scrollContainer, mousePosition)
				}

				// Update bounding boxes for all drop targets
				// Detect operations and update app state
				const operation = detectFileOperations(elements, mousePosition)

				// Update app state with detected operations
				app.sidebarState.set({
					...app.sidebarState.get(),
					dragState: {
						hasDragStarted,
						type: 'file',
						id: fileId,
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
				window.removeEventListener('dragover', handleMouseMove)
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
				if (!cancel && dragState) {
					// Execute operations before clearing drag state
					executeFileOperations(app, fileId, workspaceId, dragState.operation)
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
