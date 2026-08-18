import classNames from 'classnames'
import {
	CubicBezier2d,
	Editor,
	IndexKey,
	Mat,
	RecordProps,
	SVGContainer,
	ShapeUtil,
	TLHandle,
	TLHandleDragInfo,
	TLShape,
	TLShapeId,
	Vec,
	VecLike,
	VecModel,
	clamp,
	createShapeId,
	useEditor,
	useValue,
	vecModelValidator,
} from 'tldraw'
import { onCanvasComponentPickerState } from '../components/OnCanvasComponentPicker'
import { getAllConnectedNodes, getNodeOutputPortInfo, getNodePorts } from '../nodes/nodePorts'
import { NodeType } from '../nodes/nodeTypes'
import { STOP_EXECUTION } from '../nodes/types/shared'
import { getPortAtPoint } from '../ports/getPortAtPoint'
import { updatePortState } from '../ports/portState'
import {
	createOrUpdateConnectionBinding,
	getConnectionBindingPositionInPageSpace,
	getConnectionBindings,
	removeConnectionBinding,
} from './ConnectionBindingUtil'

const CONNECTION_TYPE = 'connection'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[CONNECTION_TYPE]: {
			start: VecModel
			end: VecModel
		}
	}
}

/**
 * A connection shape is a directed connection between two node shapes. It has a start point, and an
 * end point. These are called "terminals" in the code.
 *
 * Usually, a connection will also have two ConnectionBindings. These bind each end of the shape to
 * the nodes it's connected to. The `start` and `end` properties are the positions of each end of
 * the connection, but only when there isn't a binding (ie while dragging the connection). When the
 * ends are bound, the position is derived from the connected shape instead.
 */
export type ConnectionShape = TLShape<typeof CONNECTION_TYPE>

export class ConnectionShapeUtil extends ShapeUtil<ConnectionShape> {
	static override type = CONNECTION_TYPE
	static override props: RecordProps<ConnectionShape> = {
		start: vecModelValidator,
		end: vecModelValidator,
	}

	getDefaultProps(): ConnectionShape['props'] {
		return {
			start: { x: 0, y: 0 },
			end: { x: 100, y: 100 },
		}
	}

	override canEdit(_shape: ConnectionShape) {
		return false
	}
	override canResize(_shape: ConnectionShape) {
		return false
	}
	override hideResizeHandles(_shape: ConnectionShape) {
		return true
	}
	override hideRotateHandle(_shape: ConnectionShape) {
		return true
	}
	override hideSelectionBoundsBg(_shape: ConnectionShape) {
		return true
	}
	override hideSelectionBoundsFg(_shape: ConnectionShape) {
		return true
	}
	// no snapping to or from connections
	override canSnap(_shape: ConnectionShape) {
		return false
	}
	override getBoundsSnapGeometry(_shape: ConnectionShape) {
		return { points: [] }
	}

	getGeometry(connection: ConnectionShape) {
		const { start, end } = getConnectionTerminals(this.editor, connection)
		const [cp1, cp2] = getConnectionControlPoints(start, end)
		return new CubicBezier2d({
			start: Vec.From(start),
			cp1: Vec.From(cp1),
			cp2: Vec.From(cp2),
			end: Vec.From(end),
		})
	}

	getHandles(connection: ConnectionShape): TLHandle[] {
		const { start, end } = getConnectionTerminals(this.editor, connection)
		return [
			{
				id: 'start',
				type: 'vertex',
				index: 'a0' as IndexKey,
				x: start.x,
				y: start.y,
			},
			{
				id: 'end',
				type: 'vertex',
				index: 'a1' as IndexKey,
				x: end.x,
				y: end.y,
			},
		]
	}

	// Dragging a terminal connects/disconnects it from ports
	onHandleDrag(connection: ConnectionShape, { handle }: TLHandleDragInfo<ConnectionShape>) {
		const existingBindings = getConnectionBindings(this.editor, connection)
		const draggingTerminal = handle.id as 'start' | 'end'
		const oppositeTerminal = draggingTerminal === 'start' ? 'end' : 'start'
		const oppositeTerminalShapeId = existingBindings[oppositeTerminal]?.toId

		const handlePagePosition = this.editor.getShapePageTransform(connection).applyToPoint(handle)
		const target = getPortAtPoint(this.editor, handlePagePosition, {
			margin: 8,
			terminal: draggingTerminal,
		})

		// only 'start' ports (outputs) can have multiple connections
		const allowsMultipleConnections = draggingTerminal === 'start'
		const hasExistingConnection =
			target?.existingConnections.some((c) => c.connectionId !== connection.id) ?? false

		// anything reachable from the other end of the connection would form a cycle
		const nodesWhichWouldCreateACycle = oppositeTerminalShapeId
			? getAllConnectedNodes(this.editor, oppositeTerminalShapeId, draggingTerminal)
			: null

		updatePortState(this.editor, {
			eligiblePorts: {
				terminal: draggingTerminal,
				excludeNodes: nodesWhichWouldCreateACycle,
			},
		})

		const wouldCreateACycle = (target && nodesWhichWouldCreateACycle?.has(target.shape.id)) ?? false
		if (!target || (hasExistingConnection && !allowsMultipleConnections) || wouldCreateACycle) {
			updatePortState(this.editor, { hintingPort: null })
			removeConnectionBinding(this.editor, connection, draggingTerminal)
			return {
				...connection,
				props: {
					[handle.id]: { x: handle.x, y: handle.y },
				},
			}
		}

		updatePortState(this.editor, {
			hintingPort: { portId: target.port.id, shapeId: target.shape.id },
		})
		createOrUpdateConnectionBinding(this.editor, connection, target.shape, {
			portId: target.port.id,
			terminal: draggingTerminal,
		})

		// the binding now positions this terminal, so the shape itself is unchanged
		return connection
	}

	onHandleDragEnd(
		connection: ConnectionShape,
		{ handle, isCreatingShape }: TLHandleDragInfo<ConnectionShape>
	) {
		updatePortState(this.editor, { hintingPort: null, eligiblePorts: null })

		const draggingTerminal = handle.id as 'start' | 'end'
		const bindings = getConnectionBindings(this.editor, connection)
		if (bindings[draggingTerminal]) return

		if (isCreatingShape && draggingTerminal === 'end') {
			// A new connection dropped in empty space: let the user pick a node to create there.
			this.editor.selectNone()
			onCanvasComponentPickerState.set(this.editor, {
				connectionShapeId: connection.id,
				location: draggingTerminal,
				onClose: () => deleteConnectionIfIncomplete(this.editor, connection.id),
				onPick: (nodeType, terminalInPageSpace) => {
					createNodeAtConnectionEnd(this.editor, connection.id, nodeType, terminalInPageSpace)
				},
			})
		} else {
			// Letting go of an existing connection's terminal in empty space disconnects it.
			deleteConnectionIfIncomplete(this.editor, connection.id)
		}
	}

	onHandleDragCancel() {
		updatePortState(this.editor, { hintingPort: null, eligiblePorts: null })
	}

	component(connection: ConnectionShape) {
		return <ConnectionShape connection={connection} />
	}

	getIndicatorPath(connection: ConnectionShape) {
		const { start, end } = getConnectionTerminals(this.editor, connection)
		return new Path2D(getConnectionPath(start, end))
	}
}

function ConnectionShape({ connection }: { connection: ConnectionShape }) {
	const editor = useEditor()

	const { start, end } = useValue('terminals', () => getConnectionTerminals(editor, connection), [
		editor,
		connection,
	])

	// inactive connections carry a STOP_EXECUTION signal
	const isInactive = useValue(
		'isInactive',
		() => {
			const { start } = getConnectionBindings(editor, connection.id)
			if (!start) return false
			const output = getNodeOutputPortInfo(editor, start.toId)[start.props.portId]
			return output.value === STOP_EXECUTION
		},
		[connection.id, editor]
	)

	return (
		<SVGContainer
			className={classNames('ConnectionShape', isInactive && 'ConnectionShape_inactive')}
		>
			<path d={getConnectionPath(start, end)} />
		</SVGContainer>
	)
}

export function getConnectionControlPoints(start: VecLike, end: VecLike): [Vec, Vec] {
	const distance = end.x - start.x
	const adjustedDistance = Math.max(
		30,
		distance > 0 ? distance / 3 : clamp(Math.abs(distance) + 30, 0, 100)
	)
	return [new Vec(start.x + adjustedDistance, start.y), new Vec(end.x - adjustedDistance, end.y)]
}

/**
 * Page-space midpoint of a connection's bezier curve, for positioning the
 * center insert handle. Returns null when the connection isn't fully bound.
 */
export function getConnectionPageCenter(editor: Editor, connection: ConnectionShape): Vec | null {
	const bindings = getConnectionBindings(editor, connection)
	if (!bindings.start || !bindings.end) return null
	const startPage = getConnectionBindingPositionInPageSpace(editor, bindings.start)
	const endPage = getConnectionBindingPositionInPageSpace(editor, bindings.end)
	if (!startPage || !endPage) return null
	const [cp1, cp2] = getConnectionControlPoints(startPage, endPage)
	// Cubic bezier midpoint at t=0.5: (P0 + 3·P1 + 3·P2 + P3) / 8
	return new Vec(
		(startPage.x + 3 * cp1.x + 3 * cp2.x + endPage.x) / 8,
		(startPage.y + 3 * cp1.y + 3 * cp2.y + endPage.y) / 8
	)
}

function getConnectionPath(start: VecLike, end: VecLike) {
	const [cp1, cp2] = getConnectionControlPoints(start, end)
	return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`
}

/**
 * The start and end points of a connection in its own space. Bound terminals follow the port they're
 * bound to; unbound terminals use the position stored on the shape.
 */
export function getConnectionTerminals(editor: Editor, connection: ConnectionShape) {
	const bindings = getConnectionBindings(editor, connection)
	const shapeTransform = Mat.Inverse(editor.getShapePageTransform(connection))

	const fromBinding = (terminal: 'start' | 'end'): VecModel => {
		const binding = bindings[terminal]
		const inPageSpace = binding && getConnectionBindingPositionInPageSpace(editor, binding)
		return inPageSpace ? Mat.applyToPoint(shapeTransform, inPageSpace) : connection.props[terminal]
	}

	return { start: fromBinding('start'), end: fromBinding('end') }
}

/**
 * Create a node of the given type, positioned so its first input port sits at `terminalInPageSpace`,
 * and bind the connection's end to that port.
 */
export function createNodeAtConnectionEnd(
	editor: Editor,
	connectionId: TLShapeId,
	nodeType: NodeType,
	terminalInPageSpace: VecModel
) {
	const newNodeId = createShapeId()
	editor.createShape({
		type: 'node',
		id: newNodeId,
		x: terminalInPageSpace.x,
		y: terminalInPageSpace.y,
		props: { node: nodeType },
	})
	editor.select(newNodeId)

	const firstInputPort = Object.values(getNodePorts(editor, newNodeId)).find(
		(p) => p.terminal === 'end'
	)
	if (!firstInputPort) return

	editor.updateShape({
		id: newNodeId,
		type: 'node',
		x: terminalInPageSpace.x - firstInputPort.x,
		y: terminalInPageSpace.y - firstInputPort.y,
	})
	createOrUpdateConnectionBinding(editor, connectionId, newNodeId, {
		portId: firstInputPort.id,
		terminal: 'end',
	})
}

/** Delete a connection unless both of its terminals are bound. */
export function deleteConnectionIfIncomplete(editor: Editor, connectionId: TLShapeId) {
	const connection = editor.getShape(connectionId)
	if (!connection || !editor.isShapeOfType(connection, 'connection')) return
	const bindings = getConnectionBindings(editor, connection)
	if (!bindings.start || !bindings.end) {
		editor.deleteShapes([connection.id])
	}
}
