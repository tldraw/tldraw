import classNames from 'classnames'
import {
	Circle2d,
	DefaultSpinner,
	Group2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	resizeBox,
	ShapeUtil,
	TLBaseShape,
	TLResizeInfo,
	useEditor,
	useUniqueSafeId,
	useValue,
} from 'tldraw'
import { NODE_HEADER_HEIGHT_PX, NODE_WIDTH_PX, PORT_RADIUS_PX } from '../constants'
import { Port, ShapePort } from '../ports/Port'
import { executionState } from '../state'
import { getNodeOutputPortValues, getNodePorts } from './nodePorts'
import { getNodeBodyHeightPx, NodeBody, NodeDefinitions, NodeType } from './nodeTypes'

export type NodeShape = TLBaseShape<'node', { node: NodeType }>

export class NodeShapeUtil extends ShapeUtil<NodeShape> {
	static override type = 'node' as const
	static override props: RecordProps<NodeShape> = {
		node: NodeType,
	}

	getDefaultProps(): NodeShape['props'] {
		return {
			node: NodeDefinitions[0].getDefault(),
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
	override isAspectRatioLocked() {
		return false
	}
	override getBoundsSnapGeometry(_shape: NodeShape) {
		return {
			points: [{ x: 0, y: 0 }],
		}
	}

	getGeometry(shape: NodeShape) {
		const ports = getNodePorts(this.editor, shape)

		const portGeometries = Object.values(ports).map(
			(port) =>
				new Circle2d({
					x: port.x - PORT_RADIUS_PX,
					y: port.y - PORT_RADIUS_PX,
					radius: PORT_RADIUS_PX,
					isFilled: true,
					// not a label, but this hack excludes them from the selection bounds which is useful
					isLabel: true,
				})
		)

		const bodyGeometry = new Rectangle2d({
			width: NODE_WIDTH_PX,
			height: NODE_HEADER_HEIGHT_PX + getNodeBodyHeightPx(shape.props.node),
			isFilled: true,
		})

		return new Group2d({
			children: [bodyGeometry, ...portGeometries],
		})
	}

	override onResize(shape: any, info: TLResizeInfo<any>) {
		return resizeBox(shape, info)
	}

	component(shape: NodeShape) {
		return <NodeShape shape={shape} />
	}

	indicator(shape: NodeShape) {
		const ports = Object.values(getNodePorts(this.editor, shape))
		return <NodeShapeIndicator shape={shape} ports={ports} />
	}
}

function NodeShapeIndicator({ shape, ports }: { shape: NodeShape; ports: ShapePort[] }) {
	const id = useUniqueSafeId()

	return (
		<>
			<mask id={id}>
				<rect
					width={NODE_WIDTH_PX + 10}
					height={NODE_HEADER_HEIGHT_PX + getNodeBodyHeightPx(shape.props.node) + 10}
					fill="white"
					x={-5}
					y={-5}
				/>
				{ports.map((port) => (
					<circle
						key={port.id}
						cx={port.x}
						cy={port.y}
						r={PORT_RADIUS_PX}
						fill="black"
						strokeWidth={0}
					/>
				))}
			</mask>
			<rect
				rx={6}
				width={NODE_WIDTH_PX}
				height={NODE_HEADER_HEIGHT_PX + getNodeBodyHeightPx(shape.props.node)}
				mask={`url(#${id})`}
			/>
			{ports.map((port) => (
				<circle key={port.id} cx={port.x} cy={port.y} r={PORT_RADIUS_PX} />
			))}
		</>
	)
}

function NodeShape({ shape }: { shape: NodeShape }) {
	const editor = useEditor()
	const output = useValue('output', () => getNodeOutputPortValues(editor, shape.id)?.output, [
		editor,
		shape.id,
	])
	const isExecuting = useValue(
		'is executing',
		() => executionState.get(editor).runningGraph?.getNodeStatus(shape.id) === 'executing',
		[editor, shape.id]
	)

	return (
		<HTMLContainer
			className={classNames('NodeShape', {
				NodeShape_executing: isExecuting,
			})}
			style={{
				width: NODE_WIDTH_PX,
				height: NODE_HEADER_HEIGHT_PX + getNodeBodyHeightPx(shape.props.node),
				pointerEvents: 'all',
			}}
		>
			<div className="NodeShape-heading">
				<div className="NodeShape-label">{shape.props.node.type}</div>
				{isExecuting && <DefaultSpinner />}
				<div className="NodeShape-output">{output}</div>
				<Port shapeId={shape.id} portId="output" />
			</div>
			<NodeBody shape={shape} />
		</HTMLContainer>
	)
}
