import { Editor, Vec, VecLike } from 'tldraw'
import { getNodePortConnections, getNodePorts } from '../nodes/nodePorts'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { ShapePort } from './Port'

export function getPortAtPoint(
	editor: Editor,
	point: VecLike,
	opts?: { terminal?: 'start' | 'end'; margin?: number }
) {
	// find the shape at that point:
	const shape = editor.getShapeAtPoint(point, {
		hitInside: true,
		// only node shapes can have ports
		filter: (shape) => editor.isShapeOfType<NodeShape>(shape, 'node'),
		...opts,
	})
	if (!shape || !editor.isShapeOfType<NodeShape>(shape, 'node')) return null

	// get the ports on that shape
	const ports = getNodePorts(editor, shape)
	if (!ports) return null

	// transform the ports to page space
	const shapeTransform = editor.getShapePageTransform(shape)

	// find the port closest to the point
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

	// if we didn't find a port, return null
	if (!bestPort) return null

	// otherwise, return the port and it's existing connections
	const existingConnections = getNodePortConnections(editor, shape).filter(
		(c) => c.ownPortId === bestPort.id
	)
	return { shape, port: bestPort, existingConnections }
}
