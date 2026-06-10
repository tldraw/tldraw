import assert from 'assert'
import { DragFileOperation, DragReorderOperation } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useRef } from 'react'
import { Vec } from 'tldraw'
import { routes } from '../../routeDefs'
import { TldrawApp } from '../app/TldrawApp'
import { useApp } from './useAppState'

function detectFileOperations(
	elements: DragElements,
	mousePosition: { x: number; y: number }
): DragFileOperation {
	const operations: DragFileOperation = {}

	// Check for move operation - mouse over a different workspace
	const hoveredWorkspaceId = findHoveredWorkspaceId(elements, mousePosition)
	const workspace =
		hoveredWorkspaceId === elements.myFiles.id
			? elements.myFiles
			: elements.workspaces.find((g) => g.id === hoveredWorkspaceId)!
	const isPinned = elements.draggedElement.getAttribute('data-is-pinned') === 'true'
	const containsDraggedElement = workspace?.element.contains(elements.draggedElement)
	if (hoveredWorkspaceId && !containsDraggedElement) {
		operations.move = { targetId: hoveredWorkspaceId }
	}

	// Check for reorder operation

	if (containsDraggedElement) {
		const reorderOp = detectFileReorderOperation(
			hoveredWorkspaceId === elements.myFiles.id
				? elements.myFiles
				: elements.workspaces.find((g) => g.id === hoveredWorkspaceId)!,
			mousePosition
		)
		if (reorderOp) {
			operations.reorder = reorderOp
		} else if (isPinned) {
			// unpin the file
			operations.move = { targetId: hoveredWorkspaceId! }
		}
	}

	return operations
}

function findHoveredWorkspaceId(
	elements: DragElements,
	mousePosition: { x: number; y: number }
): string | null {
	// Find group or home group target that contains the mouse
	if (isPointInRect(mousePosition, elements.myFiles.element.getBoundingClientRect())) {
		return elements.myFiles.id
	}

	return (
		elements.workspaces.find((target) => {
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

		// When moving a file to a different space, follow it there so that space
		// becomes the active one (the active space is derived from the open file).
		if (operation.move && operation.move.targetId !== workspaceId) {
			app.navigate(routes.tlaFile(fileId))
		}
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
	myFiles: WorkspaceElements
	workspaces: WorkspaceElements[]
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

			// Query all drop target elements
			const workspaceElements = document.querySelectorAll('[data-drop-target-id^="workspace:"]')
			const homeWorkspaceId = app.getHomeWorkspaceId()
			const myFilesElement = document.querySelector(`[data-drop-target-id="${homeWorkspaceId}"]`)

			assert(myFilesElement, 'myFilesElement not found')

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
				myFiles: getWorkspaceElements(homeWorkspaceId, myFilesElement as HTMLElement),
				workspaces: [...workspaceElements].map((element) =>
					getWorkspaceElements(element.getAttribute('data-workspace-id')!, element as HTMLElement)
				),
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
