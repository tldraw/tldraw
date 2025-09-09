import classNames from 'classnames'
import { PointerEvent, useCallback, useRef, useState } from 'react'
import {
	Editor,
	T,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TLShapeId,
	TLUiIconJsx,
	useEditor,
	useValue,
} from 'tldraw'
import { AddIcon } from '../../components/icons/AddIcon'
import { SubtractIcon } from '../../components/icons/SubtractIcon'
import { NODE_HEADER_HEIGHT_PX, NODE_WIDTH_PX } from '../../constants'
import { Port, PortId, ShapePort } from '../../ports/Port'
import { getNodeInputPortValues } from '../nodePorts'
import { NodeShape } from '../NodeShapeUtil'
import { NodeType } from '../nodeTypes'

/**
 * A special value that can be returned from a node to indicate that execution should stop.
 */
export type STOP_EXECUTION = typeof STOP_EXECUTION
export const STOP_EXECUTION = Symbol('STOP_EXECUTION')

export interface NodeDefinition<Node extends { type: string }> {
	type: Node['type']
	validator: T.Validator<Node>
	title: string
	heading?: string
	icon: TLUiIconJsx
	getDefault: () => Node
	getBodyHeightPx: (node: Node) => number
	getPorts: (node: Node) => Record<string, ShapePort>
	computeOutput: (
		node: Node,
		inputs: Record<string, number>
	) => Record<string, number | STOP_EXECUTION>
	onPortConnect?: (editor: Editor, shape: NodeShape, node: Node, port: PortId) => void
	onPortDisconnect?: (editor: Editor, shape: NodeShape, node: Node, port: PortId) => void
	Component: React.ComponentType<{ shape: NodeShape; node: Node }>
}

/**
 * The standard output port for a node, appearing in the node header.
 */
export const outputPort: ShapePort = {
	id: 'output',
	x: NODE_WIDTH_PX,
	y: NODE_HEADER_HEIGHT_PX / 2,
	terminal: 'start',
}

/**
 * Update the `node` prop within a node shape.
 */
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

/**
 * A row in a node. This component just applies some styling.
 */
export function NodeRow({
	children,
	className,
	...props
}: {
	children: React.ReactNode
	className?: string
} & React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div {...props} className={classNames('NodeRow', className)}>
			{children}
		</div>
	)
}

/**
 * A row in a node for a numeric input. If the port is connected, the input is disabled and the
 * value is taken from the port. Otherwise, the input is editable with a spinner for incrementing
 * and decrementing the value.
 */
export function NodeInputRow({
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
		() => getNodeInputPortValues(editor, shapeId)[portId],
		[editor, shapeId, portId]
	)

	const [pendingValue, setPendingValue] = useState<string | null>(null)

	const onPointerDown = useCallback((event: PointerEvent) => {
		event.stopPropagation()
	}, [])

	const onSpinner = (delta: number) => {
		const newValue = value + delta
		onChange(newValue)
		setPendingValue(String(newValue))
		inputRef.current?.focus()
	}

	return (
		<NodeRow className="NodeInputRow">
			<Port shapeId={shapeId} portId={portId} />
			{valueFromPort === STOP_EXECUTION ? (
				<NodeValue value={valueFromPort} />
			) : (
				<input
					ref={inputRef}
					type="text"
					inputMode="decimal"
					disabled={valueFromPort != null}
					value={valueFromPort ?? pendingValue ?? value}
					onChange={(e) => {
						setPendingValue(e.currentTarget.value)
						const asNumber = Number(e.currentTarget.value.trim())
						if (Number.isNaN(asNumber)) return
						onChange(asNumber)
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
			)}
			<div className="NodeInputRow-buttons">
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
		</NodeRow>
	)
}

/**
 * A value within a node. If the value is STOP_EXECUTION, a placeholder is shown instead.
 */
export function NodeValue({ value }: { value: number | STOP_EXECUTION }) {
	if (value === STOP_EXECUTION) {
		return <div className="NodeValue_placeholder" />
	}

	return value
}
