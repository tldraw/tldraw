import classNames from 'classnames'
import { T, TLShapeId, useEditor, useValue } from 'tldraw'
import { getNodePortConnections } from '../nodes/nodePorts'
import { portState } from './portState'

export type PortId = string

export const shapePort = T.object({
	id: T.string,
	terminal: T.literalEnum('start', 'end'),
	x: T.number,
	y: T.number,
})

export type ShapePort = T.TypeOf<typeof shapePort>

/**
 * Port ids are unique within a shape. To identify a port we need both the shape id and the port id.
 */
export interface PortIdentifier {
	shapeId: TLShapeId
	portId: PortId
}

/**
 * This react component renders a port.
 */
export function Port({ shapeId, port }: { shapeId: TLShapeId; port: ShapePort }) {
	const editor = useEditor()
	if (!port) throw new Error(`Port not found on shape ${shapeId}`)

	// isHinting is true if the user is currently dragging a connection to this port. it means we
	// should highlight this port.
	const isHinting = useValue(
		'isHinting',
		() => {
			const { hintingPort } = portState.get(editor)
			return hintingPort && hintingPort.portId === port.id && hintingPort.shapeId === shapeId
		},
		[editor, shapeId, port.id]
	)

	// isEligible is true if the the user is currently dragging a connection, and this port is one
	// that the connection can be connected to.
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
				return !connections.some((c) => c.ownPortId === port.id)
			}
			return true
		},
		[editor, shapeId, port.id, port.terminal]
	)

	return (
		<div
			className={classNames(
				`Port`,
				isHinting ? 'Port_hinting' : isEligible ? 'Port_eligible' : undefined
			)}
			style={{
				transform: `translate(${port.x}px, ${port.y}px)`,
			}}
			onPointerDown={() => {
				editor.setCurrentTool('select.pointing_port', {
					shapeId,
					portId: port.id,
					terminal: port.terminal,
				})
			}}
		/>
	)
}
