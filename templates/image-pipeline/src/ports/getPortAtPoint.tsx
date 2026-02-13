import { Editor, Vec, VecLike } from 'tldraw'
import { getNodePortConnections, getNodePorts } from '../nodes/nodePorts'
import { ShapePort } from './Port'

export function getPortAtPoint(
	editor: Editor,
	point: VecLike,
	opts?: { terminal?: 'start' | 'end'; margin?: number }
) {
	const shape = editor.getShapeAtPoint(point, {
		hitInside: true,
		filter: (shape) => editor.isShapeOfType(shape, 'node'),
		...opts,
	})
	if (!shape || !editor.isShapeOfType(shape, 'node')) return null

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

	const existingConnections = getNodePortConnections(editor, shape).filter(
		(c) => c.ownPortId === bestPort.id
	)
	return { shape, port: bestPort, existingConnections }
}
