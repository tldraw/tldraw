import { Editor, TLShapeId } from 'tldraw'
import { GlobBinding } from './GlobBindingUtil'
import { NodeShape } from './NodeShapeUtil'

export const getStartAndEndNodes = (editor: Editor, glob: TLShapeId) => {
	const bindings = editor.getBindingsFromShape<GlobBinding>(glob, 'glob')
	if (!bindings.length) return null

	const startNode = bindings.find((b) => b.props.terminal === 'start')
	if (!startNode) return null
	const startNodeShape = editor.getShape<NodeShape>(startNode.toId)
	if (!startNodeShape) return null

	const endNode = bindings.find((b) => b.props.terminal === 'end')
	if (!endNode) return null
	const endNodeShape = editor.getShape<NodeShape>(endNode.toId)
	if (!endNodeShape) return null

	return { startNodeShape, endNodeShape }
}
