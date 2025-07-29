import { useCallback } from 'react'
import { createShapeId, TLPointerEventInfo, TLShapeId, useEditor, Vec } from 'tldraw'

export interface DragToCreateConfig<T = any> {
	// Called when drag starts (after meeting drag threshold)
	onDragStart?: (shapeId: TLShapeId, position: Vec, data: T) => string | void // return markId
	// Called when pointer is released without dragging (click)
	onClick?: (position: Vec, data: T) => void
	// Called when drag operation completes
	onDragComplete?: () => void
	// Called to clean up after interaction ends
	onCleanup?: () => void
	// Whether to create a shape immediately on drag start
	createShapeOnDrag?: boolean
	// Custom shape creation function
	createShape?: (shapeId: TLShapeId, center: Vec, data: T) => string // returns markId
}

type DragState = { name: 'pointing' } | { name: 'dragging'; shapeId: TLShapeId } | { name: 'done' }

export function useDragToCreate<T = any>(config: DragToCreateConfig<T>) {
	const editor = useEditor()

	const handlePointerDown = useCallback(
		(down: React.PointerEvent, data: T) => {
			down.preventDefault()
			down.stopPropagation()

			const el = down.currentTarget as HTMLElement
			el.setPointerCapture(down.pointerId)

			// State management for drag interaction
			let state: DragState = { name: 'pointing' }

			function onMove(move: PointerEvent) {
				if (editor.getInstanceState().isCoarsePointer) return

				move.stopPropagation()

				const dx = move.clientX - down.clientX
				const dy = move.clientY - down.clientY

				if (
					state.name === 'pointing' &&
					dx ** 2 + dy ** 2 > editor.options.dragDistanceSquared * 2
				) {
					editor.run(() => {
						const shapeId = createShapeId()
						state = { name: 'dragging', shapeId }

						const position = new Vec(move.clientX, move.clientY)

						let markId: string | void = undefined

						if (config.createShapeOnDrag && config.createShape) {
							markId = config.createShape(shapeId, editor.screenToPage(position), data)
						}

						if (config.onDragStart) {
							const result = config.onDragStart(shapeId, position, data)
							if (result) markId = result
						}

						// Set up drag behavior if a shape was created
						if (config.createShapeOnDrag && editor.getShape(shapeId)) {
							const pointerInfo: TLPointerEventInfo = {
								type: 'pointer',
								shiftKey: move.shiftKey,
								altKey: move.altKey,
								ctrlKey: move.ctrlKey,
								metaKey: move.metaKey,
								accelKey: move.ctrlKey || move.metaKey,
								button: move.button,
								isPen: move.pointerType === 'pen',
								name: 'pointer_down',
								point: position,
								pointerId: move.pointerId,
								target: 'shape',
								shape: editor.getShape(shapeId)!,
							}

							editor._flushEventForTick(pointerInfo)
							editor.inputs.isDragging = true

							editor.select(shapeId).setCurrentTool('select.translating', {
								...pointerInfo,
								isCreating: true,
								creatingMarkId: markId,
								onInteractionEnd: 'select',
								onCreate: () => {
									editor.setCurrentTool('select.idle')
									cleanUpAfterInteractionEnd()
								},
							} as any)

							function listenForBailEvents() {
								if (!editor.isIn('select.translating') || !editor.getShape(shapeId)) {
									editor.setCurrentTool('select.idle')
									cleanUpAfterInteractionEnd()
									stopBailEventListener()
								}
							}

							const stopBailEventListener = editor.store.listen(listenForBailEvents, {
								source: 'user',
								scope: 'session',
							})
						}

						cleanUpMenuEvents()
					})
				}
			}

			function onUp(up: PointerEvent) {
				up.stopPropagation()

				editor.run(() => {
					if (state.name === 'pointing') {
						// Click behavior - create in center of viewport
						const center = editor.getViewportPageBounds().center
						if (config.onClick) {
							config.onClick(center, data)
						} else if (config.createShape) {
							config.createShape(createShapeId(), center, data)
						}
					}

					cleanUpMenuEvents()
					cleanUpAfterInteractionEnd()
				})
			}

			function cleanUpAfterInteractionEnd() {
				if (state.name !== 'done') {
					state = { name: 'done' }
					config.onDragComplete?.()
					config.onCleanup?.()
				}
			}

			function cleanUpMenuEvents() {
				el.releasePointerCapture(down.pointerId)
				el.removeEventListener('pointermove', onMove)
				el.removeEventListener('pointerup', onUp)
				el.style.opacity = ''

				// Move the pointer capture to the canvas
				const cvs = document.querySelector('.tl-canvas') as HTMLDivElement
				if (cvs) cvs.setPointerCapture(down.pointerId)
			}

			el.addEventListener('pointermove', onMove)
			el.addEventListener('pointerup', onUp)
		},
		[editor, config]
	)

	return { handlePointerDown }
}
