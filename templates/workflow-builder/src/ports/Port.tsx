import classNames from 'classnames'
import { TLShapeId, useEditor, useValue, VecModel } from 'tldraw'
import { getNodePorts } from '../nodes/nodePorts'
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

	return (
		<div
			className={classNames(`Port Port_${port.terminal}`, isHinting && 'Port_hinting')}
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
