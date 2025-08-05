import { TLShapeId, TldrawUiToolbarButton, Vec, useEditor } from 'tldraw'
import { useDragToCreate } from '../hooks/useDragToCreate'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { NodeType } from '../nodes/nodeTypes'
import { NodeDefinition } from '../nodes/types/shared'

// Toolbar button component that allows dragging to create nodes on the canvas
export function CreateNodeToolbarButton<T extends NodeType>({
	definition,
	type,
	onClose,
}: {
	type: 'tool' | 'menu' | 'icon'
	definition: NodeDefinition<T>
	onClose?: () => void
}) {
	const editor = useEditor()

	const createNodeShape = (shapeId: TLShapeId, center: Vec, node: NodeType) => {
		// Mark a history stopping point for undo/redo
		const markId = editor.markHistoryStoppingPoint('create node')
		onClose?.()

		editor.run(() => {
			// Create the shape with the node definition
			editor.createShape<NodeShape>({
				id: shapeId,
				type: 'node',
				props: { node },
			})

			// Get the created shape and its bounds
			const shape = editor.getShape<NodeShape>(shapeId)!
			const shapeBounds = editor.getShapePageBounds(shapeId)!

			// Position the shape so its center aligns with the drop point
			const x = center.x - shapeBounds.width / 2
			const y = center.y - shapeBounds.height / 2
			editor.updateShape({ ...shape, x, y })

			// Select the newly created shape
			editor.select(shapeId)
		})
		return markId
	}

	// Configure the drag hook for node creation
	const { handlePointerDown } = useDragToCreate<NodeType>({
		createShapeOnDrag: true,
		createShape: createNodeShape,
		onCleanup: onClose,
	})

	return (
		<TldrawUiToolbarButton
			key={definition.type}
			type={type}
			style={{ cursor: 'grab' }}
			onPointerDown={(e) => {
				handlePointerDown(e, definition.getDefault())
			}}
		>
			{definition.icon}
		</TldrawUiToolbarButton>
	)
}
