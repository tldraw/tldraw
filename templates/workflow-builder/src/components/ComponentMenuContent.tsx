import {
	createShapeId,
	TldrawUiButton,
	TldrawUiMenuGroup,
	TLPointerEventInfo,
	TLShapeId,
	TLShapePartial,
	useEditor,
	Vec,
} from 'tldraw'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { NodeDefinitions, NodeType } from '../nodes/nodeTypes'

type TranslatingInfo = TLPointerEventInfo & {
	target: 'shape'
	isCreating?: boolean
	creatingMarkId?: string
	onCreate?(): void
	didStartInPit?: boolean
	onInteractionEnd?: string
}

export function ComponentMenuContent({
	onClose,
	onNodeSelected,
	hideLabels,
}: {
	onClose?: () => void
	onNodeSelected?: (nodeType: NodeType) => void
	hideLabels?: boolean
}) {
	const editor = useEditor()

	const onPointerDown = (down: React.PointerEvent, node: NodeType) => {
		down.preventDefault()
		down.stopPropagation()

		const el = down.currentTarget as HTMLElement
		el.setPointerCapture(down.pointerId)

		// State management for drag interaction
		let state = {
			name: 'pointing',
		} as { name: 'pointing' } | { name: 'dragging'; shapeId: TLShapeId } | { name: 'done' }

		function onMove(move: PointerEvent) {
			if (editor.getInstanceState().isCoarsePointer) return

			move.stopPropagation()

			const dx = move.clientX - down.clientX
			const dy = move.clientY - down.clientY

			if (state.name === 'pointing' && dx ** 2 + dy ** 2 > editor.options.dragDistanceSquared * 2) {
				editor.run(() => {
					const shapeId = createShapeId()
					state = { name: 'dragging', shapeId }

					const position = new Vec(move.clientX, move.clientY)
					const markId = createShape(state.shapeId, editor.screenToPage(position))

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
						shape: editor.getShape(state.shapeId)!,
					}

					editor._flushEventForTick(pointerInfo)
					editor.inputs.isDragging = true

					editor.select(state.shapeId).setCurrentTool('select.translating', {
						...pointerInfo,
						isCreating: true,
						creatingMarkId: markId,
						onInteractionEnd: 'select',
						onCreate: () => {
							cleanUpAfterInteractionEnd()
						},
					} satisfies TranslatingInfo)

					function listenForBailEvents() {
						if (!editor.isIn('select.translating') || !editor.getShape(shapeId)) {
							cleanUpAfterInteractionEnd()
							stopBailEventListener()
						}
					}

					const stopBailEventListener = editor.store.listen(listenForBailEvents, {
						source: 'user',
						scope: 'session',
					})

					cleanUpMenuEvents()
				})
			}
		}

		function onUp(up: PointerEvent) {
			up.stopPropagation()

			editor.run(() => {
				if (state.name === 'pointing') {
					// Create the shape in the center of the viewport
					createShape(createShapeId(), editor.getViewportPageBounds().center)
				}

				cleanUpMenuEvents()
				cleanUpAfterInteractionEnd()
			})
		}

		function cleanUpAfterInteractionEnd() {
			if (state.name !== 'done') {
				editor.setCurrentTool('select.idle')
				state = { name: 'done' }
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

		function createShape(shapeId: TLShapeId, center: Vec) {
			const markId = editor.markHistoryStoppingPoint('create node')
			onClose?.()
			editor.run(() => {
				const partial: TLShapePartial<NodeShape> = {
					id: shapeId,
					type: 'node',
					props: { node },
				}
				editor.createShape(partial)
				const shape = editor.getShape<NodeShape>(shapeId)!
				const shapeBounds = editor.getShapePageBounds(shapeId)!
				const x = center.x - shapeBounds.width / 2
				const y = center.y - shapeBounds.height / 2
				editor.updateShape({ ...shape, x, y })
				editor.select(shapeId)
			})
			return markId
		}
	}

	return (
		<TldrawUiMenuGroup id="math-operations">
			{NodeDefinitions.map((definition) => (
				<TldrawUiButton
					key={definition.type}
					type="menu"
					style={{ justifyContent: 'space-between', gap: 16, cursor: 'grab' }}
					onPointerDown={(e) => {
						if (onNodeSelected) {
							// When used in dialog mode, just call the callback
							e.preventDefault()
							e.stopPropagation()
							onNodeSelected(definition.getDefault())
						} else {
							// Original drag behavior
							onPointerDown(e, definition.getDefault())
						}
					}}
				>
					{!hideLabels && <span>{definition.title}</span>}
					{definition.icon}
				</TldrawUiButton>
			))}
		</TldrawUiMenuGroup>
	)
}
