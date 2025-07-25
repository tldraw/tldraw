import { PointerEvent, useCallback, useRef, useState } from 'react'
import {
	Editor,
	T,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TLShapeId,
	useEditor,
	useValue,
} from 'tldraw'
import { AddIcon } from '../../components/icons/Add'
import { SubtractIcon } from '../../components/icons/Subtract'
import { NODE_HEADER_HEIGHT_PX, NODE_WIDTH_PX } from '../../constants'
import { Port, PortId, ShapePort } from '../../ports/Port'
import { getNodeInputPortValues } from '../nodePorts'
import { NodeShape } from '../NodeShapeUtil'
import { NodeType } from '../nodeTypes'

export interface NodeDefinition<Node extends { type: string }> {
	type: Node['type']
	validator: T.Validator<Node>
	title: string
	icon: React.ReactNode
	getDefault: () => Node
	getBodyHeightPx: (node: Node) => number
	getPorts: (node: Node) => Record<string, ShapePort>
	computeOutput: (node: Node, inputs: Record<string, number>) => Record<string, number>
	onPortConnect?: (editor: Editor, shape: NodeShape, node: Node, port: PortId) => void
	onPortDisconnect?: (editor: Editor, shape: NodeShape, node: Node, port: PortId) => void
	Component: React.ComponentType<{ shape: NodeShape; node: Node }>
}

export const outputPort: ShapePort = {
	id: 'output',
	x: NODE_WIDTH_PX,
	y: NODE_HEADER_HEIGHT_PX / 2,
	terminal: 'start',
}

export function updateNode<T extends NodeType>(
	editor: Editor,
	shape: NodeShape,
	update: (node: T) => T
) {
	editor.updateShape({
		id: shape.id,
		type: shape.type,
		props: { node: update(shape.props.node as T) },
	})
}

export function NodeBodyRow({
	shapeId,
	portId,
	value,
	onChange,
	onBlur,
}: {
	shapeId: TLShapeId
	portId: PortId
	value: number
	onChange: (value: number) => void
	onBlur?: () => void
}) {
	const editor = useEditor()
	const inputRef = useRef<HTMLInputElement>(null)
	const valueFromPort = useValue(
		'from port',
		() => {
			return getNodeInputPortValues(editor, shapeId)[portId]
		},
		[editor, shapeId, portId]
	)

	const [pendingValue, setPendingValue] = useState<string | null>(null)

	const onPointerDown = useCallback((event: PointerEvent) => {
		event.stopPropagation()
	}, [])

	const onSpinner = (delta: number) => {
		const newValue = value + delta
		setPendingValue(null)
		onChange(newValue)
		inputRef.current?.focus()
	}

	return (
		<div className="NodeBodyRow">
			<Port shapeId={shapeId} portId={portId} />
			<input
				ref={inputRef}
				type="text"
				inputMode="decimal"
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
				onPointerDown={onPointerDown}
				onBlur={() => {
					setPendingValue(null)
					onBlur?.()
				}}
				onFocus={() => {
					editor.setSelectedShapes([shapeId])
				}}
			/>
			<div className="NodeBodyRow-buttons">
				<TldrawUiButton
					title="decrement"
					type="icon"
					onPointerDown={onPointerDown}
					onClick={() => onSpinner(-1)}
				>
					<TldrawUiButtonIcon icon={<SubtractIcon />} />
				</TldrawUiButton>
				<TldrawUiButton
					title="increment"
					type="icon"
					onPointerDown={onPointerDown}
					onClick={() => onSpinner(1)}
				>
					<TldrawUiButtonIcon icon={<AddIcon />} />
				</TldrawUiButton>
			</div>
		</div>
	)
}
