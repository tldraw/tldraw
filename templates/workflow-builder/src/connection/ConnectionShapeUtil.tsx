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
	stopEventPropagation,
	useEditor,
	useValue,
	vecModelValidator,
} from 'tldraw'
import {
	CONNECTION_CENTER_HANDLE_HOVER_SIZE_PX,
	CONNECTION_CENTER_HANDLE_SIZE_PX,
} from '../constants'
import { getAllConnectedNodes, getNodePorts } from '../nodes/nodePorts'
import { getPortAtPoint } from '../ports/getPortAtPoint'
import { onCanvasComponentPickerState, updatePortState } from '../state'
import {
	createOrUpdateConnectionBinding,
	getConnectionBindingPositionInPageSpace,
	getConnectionBindings,
	removeConnectionBinding,
} from './ConnectionBindingUtil'
import { insertNodeWithinConnection } from './insertNodeWithinConnection'

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
		return false
	}
	override getBoundsSnapGeometry() {
		return {
			points: [],
		}
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

		const shapeTransform = this.editor.getShapePageTransform(connection)
		const handlePagePosition = shapeTransform.applyToPoint(handle)

		const target = getPortAtPoint(this.editor, handlePagePosition, {
			margin: 8,
			filter: (s) => s.id !== connection.id && s.id !== existingBindings[oppositeTerminal]?.toId,
			terminal: handle.id as 'start' | 'end',
		})

		const allowsMultipleConnections = draggingTerminal === 'start'
		const hasExistingConnection =
			target?.existingConnection && target.existingConnection.connectionId !== connection.id

		const wouldCreateACycle =
			target &&
			oppositeTerminalShapeId &&
			getAllConnectedNodes(this.editor, oppositeTerminalShapeId, draggingTerminal).has(target.shape)

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

		return {
			...connection,
		}
	}

	onHandleDragEnd(
		connection: ConnectionShape,
		{ handle, isCreatingShape }: TLHandleDragInfo<ConnectionShape>
	) {
		updatePortState(this.editor, { hintingPort: null })

		const draggingTerminal = handle.id as 'start' | 'end'

		const bindings = getConnectionBindings(this.editor, connection)
		if (bindings[draggingTerminal]) {
			// we successfully connected the shape, so we're done!
			return
		}

		if (isCreatingShape && draggingTerminal === 'end') {
			// if we were creating a new connection and didn't attach it to anything, open the
			// component picker at the end of this connection.
			this.editor.selectNone()
			onCanvasComponentPickerState.set(this.editor, {
				connectionShapeId: connection.id,
				location: draggingTerminal,
				onClose: () => {
					const bindings = getConnectionBindings(this.editor, connection)
					if (!bindings.start || !bindings.end) {
						this.editor.deleteShapes([connection.id])
					}
				},
				onPick: (nodeType, terminalInPageSpace) => {
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

					const ports = getNodePorts(this.editor, newNodeId)
					const firstInputPort = Object.values(ports).find((p) => p.terminal === 'end')
					if (firstInputPort) {
						this.editor.updateShape({
							id: newNodeId,
							type: 'node',
							x: terminalInPageSpace.x - firstInputPort.x,
							y: terminalInPageSpace.y - firstInputPort.y,
						})

						createOrUpdateConnectionBinding(this.editor, connection, newNodeId, {
							portId: firstInputPort.id,
							terminal: draggingTerminal,
						})
					}
				},
			})
		} else {
			// if we're not creating a new connection and we just let go, there must be
			// bindings. If not, let's interpret this as the user disconnecting the shape.
			if (!bindings.start || !bindings.end) {
				this.editor.deleteShapes([connection.id])
			}
		}
	}

	onHandleDragCancel() {
		updatePortState(this.editor, { hintingPort: null })
	}

	component(connection: ConnectionShape) {
		const { start, end } = getConnectionTerminals(this.editor, connection)

		return (
			<SVGContainer className="ConnectionShape">
				<path d={getConnectionPath(start, end)} />
			</SVGContainer>
		)
	}

	indicator(connection: ConnectionShape) {
		const { start, end } = getConnectionTerminals(this.editor, connection)
		return (
			<g className="ConnectionShapeIndicator">
				<path d={getConnectionPath(start, end)} strokeWidth={2.1} strokeLinecap="round" />
				<ConnectionCenterHandle connection={connection} />
			</g>
		)
	}
}

function ConnectionCenterHandle({ connection }: { connection: ConnectionShape }) {
	const editor = useEditor()
	const { start, end } = useValue(
		'terminals',
		() => {
			return getConnectionTerminals(editor, connection)
		},
		[editor, connection]
	)

	const center = Vec.Lrp(start, end, 0.5)
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
			onPointerDown={stopEventPropagation}
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

function getConnectionControlPoints(start: VecLike, end: VecLike): [Vec, Vec] {
	const distance = end.x - start.x
	const adjustedDistance = Math.max(
		30,
		distance > 0 ? distance / 3 : clamp(Math.abs(distance) + 30, 0, 100)
	)
	return [new Vec(start.x + adjustedDistance, start.y), new Vec(end.x - adjustedDistance, end.y)]
}

function getConnectionPath(start: VecLike, end: VecLike) {
	const [cp1, cp2] = getConnectionControlPoints(start, end)
	return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`
}

export function getConnectionTerminals(editor: Editor, connection: ConnectionShape) {
	const bindings = getConnectionBindings(editor, connection)
	const shapeTransform = Mat.Inverse(editor.getShapePageTransform(connection))

	let start, end
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
	if (!start) start = connection.props.start
	if (!end) end = connection.props.end

	return { start, end }
}
