import classNames from 'classnames'
import { TLShapeId, useEditor, useValue, VecModel } from 'tldraw'
import { getNodePortConnections, getNodePorts } from '../nodes/nodePorts'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { portState } from '../state'

export type PortId = string

export interface PortIdentifier {
	portId: PortId
	shapeId: TLShapeId
}

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
			if (!shape || !editor.isShapeOfType<NodeShape>(shape, 'node')) return null
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
			const { eligiblePorts: eligiblePorts } = portState.get(editor)
			if (!eligiblePorts) return false
			if (eligiblePorts.terminal !== port.terminal) return false
			if (eligiblePorts.excludeNodes?.has(shapeId)) return false
			if (port.terminal === 'end') {
				// if the port is an end port, it can only have one connection, so it's not eligible
				// when there is a connection
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
