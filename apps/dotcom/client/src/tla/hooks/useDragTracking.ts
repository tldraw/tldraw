import { DragFileOperation, DragReorderOperation } from '@tldraw/dotcom-shared'
import assert from 'assert'
import { useCallback, useEffect, useRef } from 'react'
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
): any {
	if (dragType === 'file') {
		return detectFileOperations(elements, mousePosition)
	} else {
		return detectGroupOperations(elements, mousePosition, dragId)
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
		hoveredGroupId === 'my-files'
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
			hoveredGroupId === 'my-files'
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

function detectGroupOperations(
	_elements: DragElements,
	_mousePosition: { x: number; y: number },
	_groupId: string
): any {
	// TODO: Implement group reordering
	return {}
}

function findHoveredGroupId(
	elements: DragElements,
	mousePosition: { x: number; y: number }
): string | null {
	// Find group or my-files target that contains the mouse
	if (isPointInRect(mousePosition, elements.myFiles.element.getBoundingClientRect())) {
		return 'my-files'
	}

	return (
		elements.groups.find((target) => {
			return isPointInRect(mousePosition, target.element.getBoundingClientRect())
		})?.id ?? null
	)
}

const PINNED_FILE_INDICATOR_OFFSET = 2
const PINNED_FILE_INDICATOR_THRESHOLD = 15

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
		mousePosition.y < startTop - PINNED_FILE_INDICATOR_THRESHOLD ||
		mousePosition.y > endBottom + PINNED_FILE_INDICATOR_THRESHOLD
	) {
		return null
	}

	let insertBeforeId = null as null | string
	let indicatorY = null as null | number
	let prevBottom = startTop - PINNED_FILE_INDICATOR_OFFSET * 2 // * 2 because we center the indicator between the prevBottom and nextTop

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
		indicatorY: indicatorY ?? prevBottom + PINNED_FILE_INDICATOR_OFFSET,
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
		app.z.mutate.handleFileDragOperation({ fileId, groupId, operation })
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
			const myFilesElement = document.querySelector('[data-drop-target-id="my-files"]')

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
				myFiles: getGroupElements('my-files', myFilesElement as HTMLElement),
				groups: [...groupElements].map((element) =>
					getGroupElements(element.getAttribute('data-group-id')!, element as HTMLElement)
				),
			}
			const mousePosition = { x: clientX, y: clientY }

			// Add global mouse move listener to track mouse position
			const handleMouseMove = (e: MouseEvent) => {
				mousePosition.x = e.clientX
				mousePosition.y = e.clientY
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
