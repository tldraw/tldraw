import classNames from 'classnames'
import {
	CubicBezier2d,
	Editor,
	IndexKey,
	Mat,
	RecordProps,
	SVGContainer,
	ShapeUtil,
	TLBaseShape,
	TLHandle,
	TLHandleDragInfo,
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
import {
	CONNECTION_CENTER_HANDLE_HOVER_SIZE_PX,
	CONNECTION_CENTER_HANDLE_SIZE_PX,
} from '../constants'
import { getAllConnectedNodes, getNodeOutputPortInfo, getNodePorts } from '../nodes/nodePorts'
import { STOP_EXECUTION } from '../nodes/types/shared'
import { getPortAtPoint } from '../ports/getPortAtPoint'
import { updatePortState } from '../ports/portState'
import {
	createOrUpdateConnectionBinding,
	getConnectionBindingPositionInPageSpace,
	getConnectionBindings,
	removeConnectionBinding,
} from './ConnectionBindingUtil'
import { insertNodeWithinConnection } from './insertNodeWithinConnection'

/**
 * A connection shape is a directed connection between two node shapes. It has a start point, and an
 * end point. These are called "terminals" in the code.
 *
 * Usually, a connection will also have two ConnectionBindings. These bind each end of the shape to
 * the nodes it's connected to. The `start` and `end` properties are the positions of each end of
 * the connection, but only when there isn't a binding (ie while dragging the connection). When the
 * ends are bound, the position is derived from the connected shape instead.
 */
export type ConnectionShape = TLBaseShape<
	'connection',
	{
		start: VecModel
		end: VecModel
	}
>

export class ConnectionShapeUtil extends ShapeUtil<ConnectionShape> {
	static override type = 'connection' as const
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

	override canEdit() {
		return false
	}
	override canResize() {
		return false
	}
	override hideResizeHandles() {
		return true
	}
	override hideRotateHandle() {
		return true
	}
	override hideSelectionBoundsBg() {
		return true
	}
	override hideSelectionBoundsFg() {
		return true
	}
	override canSnap() {
		// disable snapping this shape to other shapes
		return false
	}
	override getBoundsSnapGeometry() {
		return {
			// disable snapping other shape to this shape
			points: [],
		}
	}

	// Define the geometry of our connection shape as a cubic bezier curve
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
		// Handles are draggable points on a shape. In our connection shape, we have a handle at each end.
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

	// Handle dragging of connection terminals to connect/disconnect from ports
	onHandleDrag(connection: ConnectionShape, { handle }: TLHandleDragInfo<ConnectionShape>) {
		// First, get some info about the connection and the terminal we're dragging
		const existingBindings = getConnectionBindings(this.editor, connection)
		const draggingTerminal = handle.id as 'start' | 'end'
		const oppositeTerminal = draggingTerminal === 'start' ? 'end' : 'start'
		const oppositeTerminalShapeId = existingBindings[oppositeTerminal]?.toId

		// Find the new position of the handle in page space
		const shapeTransform = this.editor.getShapePageTransform(connection)
		const handlePagePosition = shapeTransform.applyToPoint(handle)

		// Find the port at the new position
		const target = getPortAtPoint(this.editor, handlePagePosition, {
			margin: 8,
			terminal: handle.id as 'start' | 'end',
		})

		// only 'start' ports (outputs) can have multiple connections
		const allowsMultipleConnections = draggingTerminal === 'start'

		// does this port have an existing connection (excluding this one)?
		const hasExistingConnection =
			target?.existingConnections.some((c) => c.connectionId !== connection.id) ?? false

		// find out which nodes would create a cycle based on what the other end of the connection
		// is bound to
		const nodesWhichWouldCreateACycle = oppositeTerminalShapeId
			? getAllConnectedNodes(this.editor, oppositeTerminalShapeId, draggingTerminal)
			: null

		// update our port UI state to highlight which ports are eligible to connect to
		updatePortState(this.editor, {
			eligiblePorts: {
				terminal: draggingTerminal,
				excludeNodes: nodesWhichWouldCreateACycle,
			},
		})

		// if for whatever reason we can't connect to this port...
		const wouldCreateACycle = (target && nodesWhichWouldCreateACycle?.has(target.shape.id)) ?? false
		if (!target || (hasExistingConnection && !allowsMultipleConnections) || wouldCreateACycle) {
			// ... update our port ui state to not highlight any ports...
			updatePortState(this.editor, { hintingPort: null })

			// ... remove any existing binding for this connection terminal...
			removeConnectionBinding(this.editor, connection, draggingTerminal)

			// ... and return the connection with the new position.
			return {
				...connection,
				props: {
					[handle.id]: { x: handle.x, y: handle.y },
				},
			}
		}

		// if we can connect to this port, update our port ui state to highlight the port we're
		// connecting to
		updatePortState(this.editor, {
			hintingPort: { portId: target.port.id, shapeId: target.shape.id },
		})

		// create or update the connection binding for this connection terminal
		createOrUpdateConnectionBinding(this.editor, connection, target.shape, {
			portId: target.port.id,
			terminal: draggingTerminal,
		})

		// return the connection unmodified because we only need to update the binding.
		return connection
	}

	// Handle the end of dragging a connection terminal
	onHandleDragEnd(
		connection: ConnectionShape,
		{ handle, isCreatingShape }: TLHandleDragInfo<ConnectionShape>
	) {
		// clear our port UI state
		updatePortState(this.editor, { hintingPort: null, eligiblePorts: null })

		const draggingTerminal = handle.id as 'start' | 'end'

		// if we successfully connected & now have a binding, we're done!
		const bindings = getConnectionBindings(this.editor, connection)
		if (bindings[draggingTerminal]) {
			return
		}

		// If we were creating a new connection and didn't attach it to anything, open the component
		// picker to let the user choose a node to create.
		if (isCreatingShape && draggingTerminal === 'end') {
			this.editor.selectNone()
			onCanvasComponentPickerState.set(this.editor, {
				connectionShapeId: connection.id,
				location: draggingTerminal,
				onClose: () => {
					// if we didn't attach the connection to anything, delete it
					const bindings = getConnectionBindings(this.editor, connection)
					if (!bindings.start || !bindings.end) {
						this.editor.deleteShapes([connection.id])
					}
				},
				onPick: (nodeType, terminalInPageSpace) => {
					// create the node based on the user's selection:
					const newNodeId = createShapeId()
					this.editor.createShape({
						type: 'node',
						id: newNodeId,
						x: terminalInPageSpace.x,
						y: terminalInPageSpace.y,
						props: {
							node: nodeType,
						},
					})
					this.editor.select(newNodeId)

					// Position the node so its input port aligns with the connection end
					const ports = getNodePorts(this.editor, newNodeId)
					const firstInputPort = Object.values(ports).find((p) => p.terminal === 'end')
					if (firstInputPort) {
						this.editor.updateShape({
							id: newNodeId,
							type: 'node',
							x: terminalInPageSpace.x - firstInputPort.x,
							y: terminalInPageSpace.y - firstInputPort.y,
						})

						// bind the connection to the node's first input port
						createOrUpdateConnectionBinding(this.editor, connection, newNodeId, {
							portId: firstInputPort.id,
							terminal: draggingTerminal,
						})
					}
				},
			})
		} else {
			// if we're not creating a new connection and we just let go, there must be bindings. If
			// not, let's interpret this as the user disconnecting the shape.
			if (!bindings.start || !bindings.end) {
				this.editor.deleteShapes([connection.id])
			}
		}
	}

	onHandleDragCancel() {
		// if we cancel a drag part way through, we need to clear out our port UI state.
		updatePortState(this.editor, { hintingPort: null, eligiblePorts: null })
	}

	component(connection: ConnectionShape) {
		return <ConnectionShape connection={connection} />
	}

	indicator(connection: ConnectionShape) {
		const { start, end } = getConnectionTerminals(this.editor, connection)
		return (
			<g className="ConnectionShapeIndicator">
				<path d={getConnectionPath(start, end)} strokeWidth={2.1} strokeLinecap="round" />
				<ConnectionCenterHandle connection={connection} center={Vec.Lrp(start, end, 0.5)} />
			</g>
		)
	}
}

// Main connection component that renders the SVG path
function ConnectionShape({ connection }: { connection: ConnectionShape }) {
	const editor = useEditor()

	// Get the connection terminals
	const { start, end } = useValue('terminals', () => getConnectionTerminals(editor, connection), [
		editor,
		connection,
	])

	// Check if this connection is inactive (carrying STOP_EXECUTION signal)
	const isInactive = useValue(
		'isInactive',
		() => {
			const bindings = getConnectionBindings(editor, connection.id)
			if (!bindings.start) return false
			const originShapeId = bindings.start?.toId
			if (!originShapeId) return false
			const outputs = getNodeOutputPortInfo(editor, originShapeId)
			const output = outputs[bindings.start.props.portId]
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

// Center handle component that allows inserting nodes in the middle of connections
function ConnectionCenterHandle({
	connection,
	center,
}: {
	connection: ConnectionShape
	center: Vec
}) {
	const editor = useEditor()

	// Only show the center handle when zoomed in and the connection is fully bound
	const shouldShowCenterHandle = useValue(
		'shouldShowCenterHandle',
		() => {
			const bindings = getConnectionBindings(editor, connection)
			const isFullyBound = !!bindings.start && !!bindings.end
			return editor.getZoomLevel() > 0.5 && isFullyBound
		},
		[editor, connection.id]
	)

	const plusR = CONNECTION_CENTER_HANDLE_SIZE_PX / 3 - 1

	if (!shouldShowCenterHandle) return null

	return (
		<g
			className="ConnectionCenterHandle"
			style={{
				transform: `translate(${center.x}px, ${center.y}px) scale(max(0.5, calc(1 / var(--tl-zoom))))`,
			}}
			onPointerDown={editor.markEventAsHandled}
			onClick={() => {
				insertNodeWithinConnection(editor, connection)
			}}
		>
			<circle
				className="ConnectionCenterHandle-hover"
				r={CONNECTION_CENTER_HANDLE_HOVER_SIZE_PX / 2}
			/>
			<circle className="ConnectionCenterHandle-ring" r={CONNECTION_CENTER_HANDLE_SIZE_PX / 2} />
			<path
				className="ConnectionCenterHandle-icon"
				d={`M ${-plusR} 0 L ${plusR} 0 M 0 ${-plusR} L 0 ${plusR}`}
			/>
		</g>
	)
}

// Calculate control points for smooth bezier curves
function getConnectionControlPoints(start: VecLike, end: VecLike): [Vec, Vec] {
	const distance = end.x - start.x
	const adjustedDistance = Math.max(
		30,
		distance > 0 ? distance / 3 : clamp(Math.abs(distance) + 30, 0, 100)
	)
	return [new Vec(start.x + adjustedDistance, start.y), new Vec(end.x - adjustedDistance, end.y)]
}

// Generate SVG path for the connection
function getConnectionPath(start: VecLike, end: VecLike) {
	const [cp1, cp2] = getConnectionControlPoints(start, end)
	return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`
}

// Get the actual start and end points of a connection, considering its bindings
export function getConnectionTerminals(editor: Editor, connection: ConnectionShape) {
	let start, end

	// if possible, set the start and end points based on the bindings
	const bindings = getConnectionBindings(editor, connection)
	const shapeTransform = Mat.Inverse(editor.getShapePageTransform(connection))
	if (bindings.start) {
		const inPageSpace = getConnectionBindingPositionInPageSpace(editor, bindings.start)
		if (inPageSpace) {
			start = Mat.applyToPoint(shapeTransform, inPageSpace)
		}
	}
	if (bindings.end) {
		const inPageSpace = getConnectionBindingPositionInPageSpace(editor, bindings.end)
		if (inPageSpace) {
			end = Mat.applyToPoint(shapeTransform, inPageSpace)
		}
	}

	// if we couldn't set the start and end points based on the bindings, use the values stored on
	// the shape itself
	if (!start) start = connection.props.start
	if (!end) end = connection.props.end

	return { start, end }
}
