import { TLShapeId, TLShapePartial, TldrawUiToolbarButton, Vec, useEditor } from 'tldraw'
import { useDragToCreate } from '../hooks/useDragToCreate'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { NodeType } from '../nodes/nodeTypes'
import { NodeDefinition } from '../nodes/types/shared'

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

	// Create a shape function for the drag hook
	const createNodeShape = (shapeId: TLShapeId, center: Vec, node: NodeType) => {
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
