import { setIn } from 'bedit'
import { MouseEvent, useEffect, useRef } from 'react'
import { useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { createReorderingSystem } from '../../../utils/reordering'

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

/**
 * Alas dnd-kit doesn't give us mouse positions in the onDragMove handler.
 * It _does_ give the start position + delta, but it doesn't expose scroll position changes I don't think??
 */
export function HandleReordering() {
	const app = useApp()
	const dragState = useValue('drag state', () => app.sidebarState.get().dragState, [app])

	const isDragging =
		dragState != null && (dragState.type === 'group' || dragState.type === 'pinned')

	useEffect(() => {
		if (dragState) {
			document.body.setAttribute('data-dragging-type', dragState.type)
		} else {
			document.body.removeAttribute('data-dragging-type')
		}
	}, [dragState])

	const mousePosition = useRef({ clientX: 0, clientY: 0 })

	useEffect(() => {
		if (!isDragging) return

		const handleMouseMove = (event: MouseEvent) => {
			mousePosition.current = { clientX: event.clientX, clientY: event.clientY }
		}
		window.addEventListener('mousemove', handleMouseMove as any)

		const updateDragState = () => {
			try {
				if (!dragState) return

				// Handle group dragging
				if (dragState.type === 'group') {
					const nextDragState = groupsReordering.calculateDragState(
						dragState.itemId,
						mousePosition.current.clientY
					)
					if (
						nextDragState.cursorLineY !== dragState.cursorLineY ||
						nextDragState.nextIndex !== dragState.nextIndex
					) {
						setIn(app.sidebarState).dragState({
							type: 'group',
							itemId: dragState.itemId,
							...nextDragState,
						})
					}
				}

				// Handle pinned file dragging
				if (dragState.type === 'pinned') {
					const nextDragState = pinnedReordering.calculateDragState(
						dragState.fileId,
						mousePosition.current.clientY
					)
					if (
						nextDragState.cursorLineY !== dragState.cursorLineY ||
						nextDragState.nextIndex !== dragState.nextIndex
					) {
						setIn(app.sidebarState).dragState({
							type: 'pinned',
							fileId: dragState.fileId,
							...nextDragState,
						})
					}
				}
			} finally {
				raf = requestAnimationFrame(updateDragState)
			}
		}

		let raf = requestAnimationFrame(updateDragState)
		return () => {
			window.removeEventListener('mousemove', handleMouseMove as any)
			cancelAnimationFrame(raf)
		}
	}, [isDragging, dragState, app])

	return null
}
