import {
	Geometry2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLBaseShape,
	TLResizeInfo,
	Tldraw,
	resizeBox,
} from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
type MathShape = TLBaseShape<
	'math-shape',
	{
		w: number
		h: number
		text: string
	}
>

// [2]
export class MathShapeUtil extends ShapeUtil<MathShape> {
	// [a]
	static override type = 'my-custom-shape' as const
	static override props: RecordProps<MathShape> = {
		w: T.number,
		h: T.number,
		text: T.string,
	}

	// [b]
	getDefaultProps(): MathShape['props'] {
		return {
			w: 200,
			h: 200,
			text: '',
		}
	}

	// [c]
	override canEdit() {
		return false
	}
	override canResize() {
		return true
	}
	override isAspectRatioLocked() {
		return false
	}

	// [d]
	getGeometry(shape: MathShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	// [e]
	override onResize(shape: any, info: TLResizeInfo<any>) {
		return resizeBox(shape, info)
	}

	// [f]
	component(shape: MathShape) {
		return <HTMLContainer style={{ backgroundColor: '#efefef' }}>{shape.props.text}</HTMLContainer>
	}

	// [g]
	indicator(shape: MathShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

// [3]
const customShape = [MathShapeUtil]

export default function CustomShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShape}
				onMount={(editor) => {
					editor.createShape({ type: 'math-shape', x: 100, y: 100 })
				}}
			/>
		</div>
	)
}
