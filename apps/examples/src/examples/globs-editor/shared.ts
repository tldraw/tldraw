import { Editor, TLShapeId, Vec, VecLike } from 'tldraw'
import { GlobBinding } from './GlobBindingUtil'
import { GlobShape } from './GlobShapeUtil'
import { NodeShape } from './NodeShapeUtil'
import { getOuterTangentPoints } from './utils'

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

export interface GlobBindings {
	start?: GlobBinding
	end?: GlobBinding
}

export function getGlobBindings(editor: Editor, shape: GlobShape): GlobBindings {
	const bindings = editor.getBindingsFromShape<GlobBinding>(shape.id, 'glob')

	const start = bindings.find((b) => b.props.terminal === 'start')
	const end = bindings.find((b) => b.props.terminal === 'end')

	return { start, end }
}

export const getGlobTangentUpdate = (
	editor: Editor,
	globId: TLShapeId,
	startNodePagePos: VecLike,
	startRadius: number,
	endNodePagePos: VecLike,
	endRadius: number
) => {
	// Calculate midpoint in page space
	const midPagePos = Vec.Average([startNodePagePos, endNodePagePos])

	// Get the glob shape to determine its parent
	const glob = editor.getShape<GlobShape>(globId)
	if (!glob) return null

	// Convert midpoint to glob's parent space
	const globParentTransform = editor.getShapeParentTransform(glob)
	const midInGlobParentSpace = globParentTransform.clone().invert().applyToPoint(midPagePos)

	// Calculate local node positions relative to midpoint in page space
	const localStartNode = Vec.Sub(startNodePagePos, midPagePos)
	const localEndNode = Vec.Sub(endNodePagePos, midPagePos)

	const tangentPoints = getOuterTangentPoints(localStartNode, startRadius, localEndNode, endRadius)

	const d0 = Vec.Lrp(tangentPoints[0], tangentPoints[1], 0.5)
	const d1 = Vec.Lrp(tangentPoints[2], tangentPoints[3], 0.5)

	return {
		id: globId,
		type: 'glob' as const,
		x: midInGlobParentSpace.x,
		y: midInGlobParentSpace.y,
		props: {
			edges: {
				edgeA: { d: { x: d0.x, y: d0.y }, tensionRatioA: 0.5, tensionRatioB: 0.5 },
				edgeB: { d: { x: d1.x, y: d1.y }, tensionRatioA: 0.5, tensionRatioB: 0.5 },
			},
		},
	}
}
