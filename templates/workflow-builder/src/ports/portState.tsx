import { atom, Atom, Editor, TLShape, TLShapeId, Vec, VecLike, WeakCache } from 'tldraw'
import { getNodePortConnections, getNodePorts, NodeShape } from '../nodes/NodeShapeUtil'
import { ShapePort } from './Port'

export type PortId = string

export interface PortIdentifier {
	portId: PortId
	shapeId: TLShapeId
}

export interface PortState {
	hintingPort: PortIdentifier | null
}

const portState = new WeakCache<Editor, Atom<PortState>>()
export function getPortStateAtom(editor: Editor) {
	return portState.get(editor, () =>
		atom('port state', {
			hintingPort: null,
		})
	)
}

export function getPortState(editor: Editor) {
	return getPortStateAtom(editor).get()
}

export function updatePortState(editor: Editor, update: Partial<PortState>) {
	return getPortStateAtom(editor).update((state) => ({
		...state,
		...update,
	}))
}

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
