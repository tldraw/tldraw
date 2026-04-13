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
import { onCanvasNodePickerState } from '../components/OnCanvasNodePicker'
import {
	CONNECTION_CENTER_HANDLE_HOVER_SIZE_PX,
	CONNECTION_CENTER_HANDLE_SIZE_PX,
	PORT_TYPE_COLORS,
	PortDataType,
} from '../constants'
import {
	getAllConnectedNodes,
	getNodeOutputPortInfo,
	getNodePorts,
	getPortDataType,
} from '../nodes/nodePorts'
import { STOP_EXECUTION } from '../nodes/types/shared'
import { getPortAtPoint } from '../ports/getPortAtPoint'
import { findFirstCompatiblePort } from '../ports/portCompatibility'
import { updatePortState } from '../ports/portState'
import {
	createOrUpdateConnectionBinding,
	getConnectionBindingPositionInPageSpace,
	getConnectionBindings,
	removeConnectionBinding,
} from './ConnectionBindingUtil'
import { insertNodeWithinConnection } from './insertNodeWithinConnection'

const CONNECTION_TYPE = 'connection'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[CONNECTION_TYPE]: {
			start: VecModel
			end: VecModel
		}
	}
}

export type ConnectionShape = TLShape<typeof CONNECTION_TYPE>

export class ConnectionShapeUtil extends ShapeUtil<ConnectionShape> {
	static override type = CONNECTION_TYPE
	static override props: RecordProps<ConnectionShape> = {
		start: vecModelValidator,
		end: vecModelValidator,
	}

	/** Connection ID that will be replaced if the current drag completes on an occupied port. */
	private pendingReplacementId: TLShapeId | null = null

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
			terminal: handle.id as 'start' | 'end',
		})

		const existingConnectionOnTarget =
			target?.existingConnections.find((c) => c.connectionId !== connection.id) ?? null

		const nodesWhichWouldCreateACycle = oppositeTerminalShapeId
			? getAllConnectedNodes(this.editor, oppositeTerminalShapeId, draggingTerminal)
			: null

		// Determine the data type of the opposite end for type-checking
		const oppositeBinding = existingBindings[oppositeTerminal]
		let dragDataType: PortDataType | null = null
		if (oppositeBinding) {
			dragDataType = getPortDataType(
				this.editor,
				oppositeBinding.toId,
				oppositeBinding.props.portId
			)
		}

		updatePortState(this.editor, {
			eligiblePorts: {
				terminal: draggingTerminal,
				excludeNodes: nodesWhichWouldCreateACycle,
				dataType: dragDataType,
			},
		})

		// Check type compatibility
		const isTypeIncompatible =
			target &&
			dragDataType &&
			dragDataType !== 'any' &&
			target.port.dataType !== 'any' &&
			target.port.dataType !== dragDataType

		const wouldCreateACycle = (target && nodesWhichWouldCreateACycle?.has(target.shape.id)) ?? false
		if (!target || wouldCreateACycle || isTypeIncompatible) {
			this.pendingReplacementId = null
			updatePortState(this.editor, { hintingPort: null })

			removeConnectionBinding(this.editor, connection, draggingTerminal)

			return {
				...connection,
				props: {
					[handle.id]: { x: handle.x, y: handle.y },
				},
			}
		}

		// Track the connection that would be replaced, but don't delete it yet.
		// Multi-ports accept multiple connections, so skip replacement for them.
		this.pendingReplacementId =
			existingConnectionOnTarget && draggingTerminal === 'end' && !target.port.multi
				? existingConnectionOnTarget.connectionId
				: null

		updatePortState(this.editor, {
			hintingPort: { portId: target.port.id, shapeId: target.shape.id },
		})

		createOrUpdateConnectionBinding(this.editor, connection, target.shape, {
			portId: target.port.id,
			terminal: draggingTerminal,
		})

		return connection
	}

	onHandleDragEnd(
		connection: ConnectionShape,
		{ handle, isCreatingShape }: TLHandleDragInfo<ConnectionShape>
	) {
		// Delete the connection being replaced now that the drag is committed.
		if (this.pendingReplacementId) {
			this.editor.deleteShapes([this.pendingReplacementId])
			this.pendingReplacementId = null
		}

		updatePortState(this.editor, { hintingPort: null, eligiblePorts: null })

		const draggingTerminal = handle.id as 'start' | 'end'

		const bindings = getConnectionBindings(this.editor, connection)
		if (bindings[draggingTerminal]) {
			return
		}

		if (isCreatingShape && draggingTerminal === 'end') {
			this.editor.selectNone()
			onCanvasNodePickerState.set(this.editor, {
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

					const bindings = getConnectionBindings(this.editor, connection)
					const sourceType = bindings.start
						? (getPortDataType(this.editor, bindings.start.toId, bindings.start.props.portId) ??
							'any')
						: 'any'

					const ports = getNodePorts(this.editor, newNodeId)
					const firstCompatibleInputPort = findFirstCompatiblePort(
						Object.values(ports),
						'end',
						sourceType
					)
					if (firstCompatibleInputPort) {
						this.editor.updateShape({
							id: newNodeId,
							type: 'node',
							x: terminalInPageSpace.x - firstCompatibleInputPort.x,
							y: terminalInPageSpace.y - firstCompatibleInputPort.y,
						})

						createOrUpdateConnectionBinding(this.editor, connection, newNodeId, {
							portId: firstCompatibleInputPort.id,
							terminal: draggingTerminal,
						})
					}
				},
			})
		} else {
			if (!bindings.start || !bindings.end) {
				this.editor.deleteShapes([connection.id])
			}
		}
	}

	onHandleDragCancel() {
		this.pendingReplacementId = null
		updatePortState(this.editor, { hintingPort: null, eligiblePorts: null })
	}

	component(connection: ConnectionShape) {
		return <ConnectionShapeComponent connection={connection} />
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

function ConnectionShapeComponent({ connection }: { connection: ConnectionShape }) {
	const editor = useEditor()

	const { start, end } = useValue('terminals', () => getConnectionTerminals(editor, connection), [
		editor,
		connection,
	])

	// Get the data type color for this connection from its start binding
	const connectionColor = useValue(
		'connectionColor',
		() => {
			const bindings = getConnectionBindings(editor, connection.id)
			if (!bindings.start) return null
			const dataType = getPortDataType(editor, bindings.start.toId, bindings.start.props.portId)
			return dataType ? PORT_TYPE_COLORS[dataType] : null
		},
		[connection.id, editor]
	)

	const isInactive = useValue(
		'isInactive',
		() => {
			const bindings = getConnectionBindings(editor, connection.id)
			if (!bindings.start) return false
			const originShapeId = bindings.start?.toId
			if (!originShapeId) return false
			const outputs = getNodeOutputPortInfo(editor, originShapeId)
			const output = outputs[bindings.start.props.portId]
			return output?.value === STOP_EXECUTION
		},
		[connection.id, editor]
	)

	return (
		<SVGContainer
			className={classNames('ConnectionShape', isInactive && 'ConnectionShape_inactive')}
		>
			<path
				d={getConnectionPath(start, end)}
				style={connectionColor ? { stroke: connectionColor } : undefined}
			/>
		</SVGContainer>
	)
}

function ConnectionCenterHandle({
	connection,
	center,
}: {
	connection: ConnectionShape
	center: Vec
}) {
	const editor = useEditor()

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
	let start, end

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

	if (!start) start = connection.props.start
	if (!end) end = connection.props.end

	return { start, end }
}
