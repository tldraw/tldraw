import {
	TldrawUiButton,
	TldrawUiMenuGroup,
	TLShapeId,
	TLShapePartial,
	useEditor,
	Vec,
} from 'tldraw'
import { useDragToCreate } from '../hooks/useDragToCreate'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { NodeDefinitions, NodeType } from '../nodes/nodeTypes'

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
							// Use the new drag behavior
							handlePointerDown(e, definition.getDefault())
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
