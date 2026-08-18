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

/** Port ids are only unique within a shape, so identifying a port needs both. */
export interface PortIdentifier {
	shapeId: TLShapeId
	portId: PortId
}

export function Port({ shapeId, port }: { shapeId: TLShapeId; port: ShapePort }) {
	const editor = useEditor()

	// the user is dragging a connection over this port
	const isHinting = useValue(
		'isHinting',
		() => {
			const { hintingPort } = portState.get(editor)
			return hintingPort && hintingPort.portId === port.id && hintingPort.shapeId === shapeId
		},
		[editor, shapeId, port.id]
	)

	// the user is dragging a connection that could be dropped on this port
	const isEligible = useValue(
		'isEligible',
		() => {
			const { eligiblePorts } = portState.get(editor)
			if (!eligiblePorts) return false
			if (eligiblePorts.terminal !== port.terminal) return false
			if (eligiblePorts.excludeNodes?.has(shapeId)) return false
			if (port.terminal === 'end') {
				// input ports only accept one connection
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
