import { Editor, TLShape, Vec, VecLike } from 'tldraw'
import { getNodePortConnections, getNodePorts } from '../nodes/nodePorts'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { ShapePort } from './Port'

export function getPortAtPoint(
	editor: Editor,
	point: VecLike,
	opts?: { filter?(shape: TLShape): boolean; terminal?: 'start' | 'end'; margin?: number }
) {
	const shape = editor.getShapeAtPoint(point, { hitInside: true, ...opts })
	if (!shape || !editor.isShapeOfType<NodeShape>(shape, 'node')) return null
	const ports = getNodePorts(editor, shape)
	if (!ports) return null

	const shapeTransform = editor.getShapePageTransform(shape)

	let bestPort: ShapePort | null = null
	let bestDistance = Infinity

	for (const port of Object.values(ports)) {
		if (opts?.terminal && port.terminal !== opts.terminal) continue

		const portInPageSpace = shapeTransform.applyToPoint(port)
		const distance = Vec.Dist(point, portInPageSpace)
		if (distance < bestDistance) {
			bestPort = port
			bestDistance = distance
		}
	}

	if (!bestPort) return null
	const existingConnection = getNodePortConnections(editor, shape)[bestPort.id]
	return { shape, port: bestPort, existingConnection }
}
