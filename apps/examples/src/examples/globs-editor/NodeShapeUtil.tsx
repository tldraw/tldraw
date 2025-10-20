import {
	Circle2d,
	DefaultColorThemePalette,
	RecordProps,
	ShapeUtil,
	SVGContainer,
	T,
	TLBaseShape,
	TLResizeInfo,
} from 'tldraw'

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

	override indicator(shape: NodeShape) {
		const zoom = this.editor.getZoomLevel()
		const blue = DefaultColorThemePalette.lightMode.blue

		return <circle r={shape.props.radius} strokeWidth={1 / zoom} stroke={blue.solid} fill="none" />
	}

	override component(shape: NodeShape) {
		const zoom = this.editor.getZoomLevel()

		return (
			<SVGContainer>
				<g opacity={shape.props.opacity}>
					<circle r={shape.props.radius} stroke={'black'} strokeWidth={1 / zoom} fill={'white'} />
					<circle x={0} y={0} r={2 / zoom} stroke="black" strokeWidth={1 / zoom} fill="black" />
				</g>
			</SVGContainer>
		)
	}
}
