import classNames from 'classnames'
import { TLShapeId, useEditor, useValue, VecModel } from 'tldraw'
import { PORT_TYPE_COLORS, PortDataType } from '../constants'
import { getNodePorts } from '../nodes/nodePorts'
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
 * Shapes define their ports with a position, id, whether they're the start (an output) or end
 * (an input) of a connection, and the data type of data they carry.
 */
export interface ShapePort extends VecModel {
	id: PortId
	terminal: 'start' | 'end'
	dataType: PortDataType
	/** When true, this input port accepts multiple simultaneous connections. */
	multi?: boolean
}

/**
 * This react component renders a port with its data-type color.
 */
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
			// type compatibility: 'any' matches everything, otherwise types must match
			if (
				eligiblePorts.dataType &&
				eligiblePorts.dataType !== 'any' &&
				port.dataType !== 'any' &&
				eligiblePorts.dataType !== port.dataType
			)
				return false
			return true
		},
		[editor, shapeId, port.terminal, port.dataType]
	)

	const color = PORT_TYPE_COLORS[port.dataType]

	return (
		<div
			className={classNames(
				`Port Port_${port.terminal}`,
				isHinting ? 'Port_hinting' : isEligible ? 'Port_eligible' : undefined
			)}
			style={{ '--port-color': color } as React.CSSProperties}
			onPointerDown={() => {
				editor.setCurrentTool('select.pointing_port', {
					shapeId,
					portId,
					terminal: port.terminal,
					dataType: port.dataType,
				})
			}}
		/>
	)
}
