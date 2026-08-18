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
import { getAllConnectedNodes, getNodePorts } from '../nodes/nodePorts'
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
		[CONNECTION_TYPE]: { start: VecModel; end: VecModel }
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

		// the binding now determines the terminal position, so the shape itself is unchanged
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
			// A new connection dropped in empty space gets a fresh node to connect to
			createNodeAtConnectionEnd(this.editor, connection, this.editor.inputs.getCurrentPagePoint())
		} else if (!bindings.start || !bindings.end) {
			// Letting go of an existing connection's terminal with nothing under it disconnects it
			this.editor.deleteShapes([connection.id])
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

	return (
		<SVGContainer className="ConnectionShape">
			<path d={getConnectionPath(start, end)} />
		</SVGContainer>
	)
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

// Connections flow top-to-bottom, so control points are offset vertically from each terminal
function getConnectionControlPoints(start: VecLike, end: VecLike): [Vec, Vec] {
	const distance = end.y - start.y
	const adjustedDistance = Math.max(
		30,
		distance > 0 ? distance / 3 : clamp(Math.abs(distance) + 30, 0, 100)
	)
	return [new Vec(start.x, start.y + adjustedDistance), new Vec(end.x, end.y - adjustedDistance)]
}

function getConnectionPath(start: VecLike, end: VecLike) {
	const [cp1, cp2] = getConnectionControlPoints(start, end)
	return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`
}

/**
 * The start and end points of a connection in its own shape space. Bound terminals follow the port
 * they're bound to; unbound terminals use the position stored on the shape.
 */
export function getConnectionTerminals(editor: Editor, connection: ConnectionShape) {
	const bindings = getConnectionBindings(editor, connection)
	const shapeTransform = Mat.Inverse(editor.getShapePageTransform(connection))

	const getTerminal = (terminal: 'start' | 'end'): VecLike => {
		const binding = bindings[terminal]
		const inPageSpace = binding && getConnectionBindingPositionInPageSpace(editor, binding)
		return inPageSpace ? Mat.applyToPoint(shapeTransform, inPageSpace) : connection.props[terminal]
	}

	return { start: getTerminal('start'), end: getTerminal('end') }
}

/**
 * Create a new message node whose input port sits at `point` and bind the connection's end to it.
 * Returns the new node's id.
 */
export function createNodeAtConnectionEnd(
	editor: Editor,
	connection: ConnectionShape | TLShapeId,
	point: VecLike
): TLShapeId {
	const newNodeId = createShapeId()
	editor.createShape({
		type: 'node',
		id: newNodeId,
		x: point.x,
		y: point.y,
		props: { node: { type: 'message', userMessage: '', assistantMessage: '' } },
	})
	editor.select(newNodeId)

	const inputPort = Object.values(getNodePorts(editor, newNodeId)).find((p) => p.terminal === 'end')
	if (inputPort) {
		editor.updateShape({
			id: newNodeId,
			type: 'node',
			x: point.x - inputPort.x,
			y: point.y - inputPort.y,
		})
		createOrUpdateConnectionBinding(editor, connection, newNodeId, {
			portId: inputPort.id,
			terminal: 'end',
		})
	}
	return newNodeId
}
