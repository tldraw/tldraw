import {
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLBaseShape,
	TLResizeInfo,
	resizeBox,
} from 'tldraw'
import { Port } from './ports/Port'

// 1. Shape type
type NodeShape = TLBaseShape<
	'node',
	{
		w: number
		h: number
		label: string
	}
>

// 2. Shape util
export class NodeShapeUtil extends ShapeUtil<NodeShape> {
	static override type = 'node' as const
	static override props: RecordProps<NodeShape> = {
		w: T.number,
		h: T.number,
		label: T.string,
	}

	getDefaultProps(): NodeShape['props'] {
		return {
			w: 320,
			h: 260,
			label: 'Send email',
		}
	}

	override canEdit() {
		return false
	}
	override canResize() {
		return true
	}
	override isAspectRatioLocked() {
		return false
	}

	getGeometry(shape: NodeShape) {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	override onResize(shape: any, info: TLResizeInfo<any>) {
		return resizeBox(shape, info)
	}

	component(shape: NodeShape) {
		return <NodeShape shape={shape} />
	}

	indicator(shape: NodeShape) {
		return <rect rx={6} width={shape.props.w} height={shape.props.h} />
	}
}

function NodeShape({ shape }: { shape: NodeShape }) {
	return (
		<HTMLContainer>
			<div className="NodeShape">
				<Port side="left" />
				<Port side="right" />
				<div className="NodeShape-label">{shape.props.label}</div>
			</div>
		</HTMLContainer>
	)
}
