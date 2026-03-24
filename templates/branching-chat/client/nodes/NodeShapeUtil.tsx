import classNames from 'classnames'
import {
	Circle2d,
	Group2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	resizeBox,
	ShapeUtil,
	TLResizeInfo,
	TLShape,
	useEditor,
	useValue,
} from 'tldraw'
import { PORT_RADIUS_PX } from '../constants'
import { Port } from '../ports/Port'
import { getNodePorts } from './nodePorts'
import {
	getNodeDefinition,
	getNodeHeightPx,
	getNodeTypePorts,
	getNodeWidthPx,
	NodeType,
} from './nodeTypes'

const NODE_TYPE = 'node'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[NODE_TYPE]: { node: NodeType }
	}
}

// Define our custom node shape type that extends tldraw's base shape system
export type NodeShape = TLShape<typeof NODE_TYPE>

// This class extends tldraw's ShapeUtil to define how our custom node shapes behave
export class NodeShapeUtil extends ShapeUtil<NodeShape> {
	static override type = NODE_TYPE
	static override props: RecordProps<NodeShape> = {
		node: NodeType,
	}

	getDefaultProps(): NodeShape['props'] {
		return {
			node: getNodeDefinition(this.editor, 'message').getDefault(),
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

	// Define the geometry of our node shape including ports
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
			width: getNodeWidthPx(this.editor, shape),
			height: getNodeHeightPx(this.editor, shape),
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
}

// Main node component that renders the HTML content
function NodeShape({ shape }: { shape: NodeShape }) {
	const editor = useEditor()

	return (
		<HTMLContainer
			className={classNames('NodeShape')}
			style={{
				width: getNodeWidthPx(editor, shape),
				height: getNodeHeightPx(editor, shape),
			}}
		>
			<NodeBody shape={shape} />
			<NodePorts shape={shape} />
		</HTMLContainer>
	)
}

function NodeBody({ shape }: { shape: NodeShape }) {
	const node = shape.props.node
	const editor = useEditor()
	const { Component } = getNodeDefinition(editor, node)
	return <Component shape={shape} node={node} />
}

function NodePorts({ shape }: { shape: NodeShape }) {
	const editor = useEditor()
	const ports = useValue('node ports', () => getNodeTypePorts(editor, shape), [shape, editor])
	return (
		<>
			{Object.values(ports).map((port) => (
				<Port key={port.id} shapeId={shape.id} port={port} />
			))}
		</>
	)
}
