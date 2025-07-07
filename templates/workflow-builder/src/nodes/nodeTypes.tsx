import { useState } from 'react'
import { stopEventPropagation, T, TLShapeId, useEditor, useValue } from 'tldraw'
import { Port, ShapePort } from '../ports/Port'
import { PortId } from '../ports/portState'
import { replaceInArray } from '../utils'
import { getNodeInputPortValues, NodeShape } from './NodeShapeUtil'

export const NODE_WIDTH_PX = 180
export const NODE_HEADER_HEIGHT_PX = 32.5
export const NODE_ROW_HEIGHT_PX = 32

export const NODE_PORT_OFFSET_Y_PX = 15.5

export const AddNodeType = T.object({
	type: T.literal('add'),
	items: T.arrayOf(T.number),
})
export type AddNodeType = T.TypeOf<typeof AddNodeType>

export const SubtractNodeType = T.object({
	type: T.literal('subtract'),
	a: T.number,
	b: T.number,
})
export type SubtractNodeType = T.TypeOf<typeof SubtractNodeType>

export const NodeType = T.union('type', {
	add: AddNodeType,
	subtract: SubtractNodeType,
})
export type NodeType = T.TypeOf<typeof NodeType>

export function getNodeBodyHeightPx(node: NodeType): number {
	switch (node.type) {
		case 'add':
			return NODE_ROW_HEIGHT_PX * node.items.length
		case 'subtract':
			return NODE_ROW_HEIGHT_PX
	}
}

const outputPort: ShapePort = {
	id: 'output',
	x: NODE_WIDTH_PX,
	y: NODE_PORT_OFFSET_Y_PX,
	terminal: 'start',
}

export function getNodeTypePorts(node: NodeType): Record<string, ShapePort> {
	switch (node.type) {
		case 'add':
			return {
				output: outputPort,
				...Object.fromEntries(
					node.items.map((_, i) => [
						`item_${i}`,
						{
							id: `item_${i}`,
							x: 0,
							y: NODE_HEADER_HEIGHT_PX + NODE_PORT_OFFSET_Y_PX + NODE_ROW_HEIGHT_PX * i,
							terminal: 'end',
						},
					])
				),
			}
		case 'subtract':
			return {
				output: outputPort,
				minuend: {
					id: 'minuend',
					x: 0,
					y: NODE_HEADER_HEIGHT_PX + NODE_PORT_OFFSET_Y_PX,
					terminal: 'end',
				},
				subtrahend: {
					id: 'subtrahend',
					x: 0,
					y: NODE_HEADER_HEIGHT_PX + NODE_PORT_OFFSET_Y_PX + NODE_ROW_HEIGHT_PX,
					terminal: 'end',
				},
			}
	}
}

export function computeNodeOutput(
	node: NodeType,
	inputs: Record<string, number>
): Record<string, number> {
	switch (node.type) {
		case 'add':
			return {
				output: node.items.reduce((acc, storedValue, i) => {
					const currentValue = inputs[`item_${i}`] ?? storedValue
					return acc + currentValue
				}, 0),
			}
		case 'subtract':
			return {
				output: (inputs.minuend ?? node.a) - (inputs.subtrahend ?? node.b),
			}
	}
}

export function NodeBody({ shape }: { shape: NodeShape }) {
	const editor = useEditor()
	const node = shape.props.node

	function updateNode(node: NodeType) {
		editor.updateShape({
			id: shape.id,
			type: shape.type,
			props: { node },
		})
	}

	switch (node.type) {
		case 'add':
			return node.items.map((value, idx) => (
				<NodeBodyRow
					key={idx}
					shapeId={shape.id}
					portId={`item_${idx}`}
					value={value}
					onChange={(newValue) => {
						updateNode({
							...node,
							items: replaceInArray(node.items, idx, newValue),
						})
					}}
				/>
			))
		case 'subtract':
			return (
				<>
					<NodeBodyRow
						shapeId={shape.id}
						portId="minuend"
						value={node.a}
						onChange={(newValue) => updateNode({ ...node, a: newValue })}
					/>
					<NodeBodyRow
						shapeId={shape.id}
						portId="subtrahend"
						value={node.b}
						onChange={(newValue) => updateNode({ ...node, b: newValue })}
					/>
				</>
			)
	}
}

export function NodeBodyRow({
	shapeId,
	portId,
	value,
	onChange,
}: {
	shapeId: TLShapeId
	portId: PortId
	value: number
	onChange: (value: number) => void
}) {
	const editor = useEditor()
	const valueFromPort = useValue(
		'from port',
		() => {
			return getNodeInputPortValues(editor, shapeId)[portId]
		},
		[editor, shapeId, portId]
	)

	const [pendingValue, setPendingValue] = useState<string | null>(null)

	return (
		<div className="NodeBodyRow">
			<Port shapeId={shapeId} portId={portId} />
			<input
				type="number"
				disabled={valueFromPort != null}
				value={valueFromPort ?? pendingValue ?? value}
				onChange={(e) => {
					if (Number.isNaN(e.currentTarget.valueAsNumber)) {
						setPendingValue(e.currentTarget.value)
					} else {
						setPendingValue(null)
						onChange(e.currentTarget.valueAsNumber)
					}
				}}
				onPointerDown={stopEventPropagation}
				onBlur={() => setPendingValue(null)}
			/>
		</div>
	)
}
