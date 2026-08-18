import classNames from 'classnames'
import { TLShapeId, useEditor, useValue, VecModel } from 'tldraw'
import { getNodePortConnections, getNodePorts } from '../nodes/nodePorts'
import { portState } from './portState'

export type PortId = string

/**
 * Port ids are unique within a shape. To identify a port we need both the shape id and the port id.
 */
export interface PortIdentifier {
	shapeId: TLShapeId
	portId: PortId
}

/**
 * Shapes define their ports with a position, id, and whether they're the start (an output) or end
 * (an input). of a connection.
 */
export interface ShapePort extends VecModel {
	id: PortId
	terminal: 'start' | 'end'
}

export function Port({ shapeId, portId }: { shapeId: TLShapeId; portId: PortId }) {
	const editor = useEditor()
	const port = useValue(
		'port',
		() => {
			const shape = editor.getShape(shapeId)
			if (!shape || !editor.isShapeOfType(shape, 'node')) return null
			return getNodePorts(editor, shape)?.[portId]
		},
		[shapeId, portId, editor]
	)
	if (!port) throw new Error(`Port ${portId} not found on shape ${shapeId}`)

	const isHinting = useValue(
		'isHinting',
		() => {
			const { hintingPort } = portState.get(editor)
			return hintingPort && hintingPort.portId === portId && hintingPort.shapeId === shapeId
		},
		[editor, shapeId, portId]
	)

	const isEligible = useValue(
		'isEligible',
		() => {
			const { eligiblePorts } = portState.get(editor)
			if (!eligiblePorts) return false
			if (eligiblePorts.terminal !== port.terminal) return false
			if (eligiblePorts.excludeNodes?.has(shapeId)) return false
			if (port.terminal === 'end') {
				// end ports (inputs) only accept a single connection
				const connections = getNodePortConnections(editor, shapeId)
				return !connections.some((c) => c.ownPortId === portId)
			}
			return true
		},
		[editor, shapeId, port.terminal]
	)

	return (
		<div
			className={classNames(
				`Port Port_${port.terminal}`,
				isHinting ? 'Port_hinting' : isEligible ? 'Port_eligible' : undefined
			)}
			onPointerDown={() => {
				editor.setCurrentTool('select.pointing_port', {
					shapeId,
					portId,
					terminal: port.terminal,
				})
			}}
		/>
	)
}
