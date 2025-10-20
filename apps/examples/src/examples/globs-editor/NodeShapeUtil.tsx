import {
	Circle2d,
	RecordProps,
	ShapeUtil,
	SVGContainer,
	T,
	TLBaseShape,
	TLHandle,
	TLResizeInfo,
} from 'tldraw'
import { GlobBinding } from './GlobBindingUtil'

export interface NodeProps {
	opacity: number
	radius: number
}
export type NodeShape = TLBaseShape<'node', NodeProps>

export class NodeShapeUtil extends ShapeUtil<NodeShape> {
	static override type = 'node' as const
	static override props: RecordProps<NodeShape> = {
		opacity: T.number,
		radius: T.number,
	}

	override getDefaultProps(): NodeShape['props'] {
		return {
			opacity: 1,
			radius: 50,
		}
	}

	override getGeometry(shape: NodeShape) {
		return new Circle2d({
			x: -shape.props.radius,
			y: -shape.props.radius,
			radius: shape.props.radius,
			isFilled: true,
		})
	}

	override onResize(shape: NodeShape, info: TLResizeInfo<NodeShape>) {
		const { scaleX, scaleY } = info

		return {
			...shape,
			props: {
				...shape.props,
				radius: Math.max(shape.props.radius * scaleX, shape.props.radius * scaleY, 5),
			},
		}
	}

	override getHandles(shape: NodeShape) {
		const handles: TLHandle[] = []

		const bindings = this.editor.getBindingsFromShape<GlobBinding>(shape.id, 'glob')
		console.log('bindings', bindings)

		return handles
	}

	override indicator(shape: NodeShape) {
		return <circle r={shape.props.radius} />
	}

	override component(shape: NodeShape) {
		const zoom = this.editor.getZoomLevel()

		return (
			<SVGContainer>
				<g opacity={shape.props.opacity}>
					<circle
						r={shape.props.radius}
						stroke="black"
						strokeWidth={1 / zoom}
						fill={shape.props.opacity !== 1 ? 'white' : 'none'}
					/>
					<circle x={0} y={0} r={2 / zoom} stroke="black" strokeWidth={1 / zoom} fill="black" />
				</g>
			</SVGContainer>
		)
	}
}
