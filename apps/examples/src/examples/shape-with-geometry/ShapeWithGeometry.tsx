import { Ellipse2d, RecordPropsType, ShapeUtil, T, TLBaseShape, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

const eggShapeProps = {
	w: T.number,
	h: T.number,
}

type EggShapeProps = RecordPropsType<typeof eggShapeProps>
type EggShape = TLBaseShape<'egg', EggShapeProps>
class EggShapeUtil extends ShapeUtil<EggShape> {
	static override type = 'egg' as const
	static override props = eggShapeProps
	override getDefaultProps() {
		return {
			w: 100,
			h: 100,
		}
	}
	override getGeometry(shape: EggShape) {
		const ellipse = new Ellipse2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
		return ellipse
	}
	override component(shape: EggShape) {
		return <div style={{ width: 100, height: 100, borderRadius: '50%', backgroundColor: 'blue' }} />
	}
	override indicator(shape: EggShape) {
		return <div style={{ width: 100, height: 100, borderRadius: '50%', backgroundColor: 'blue' }} />
	}
}

const shapeUtils = [EggShapeUtil]
export default function ShapeWithGeometryExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					editor.createShape({
						type: 'egg',
						x: 100,
						y: 100,
						props: {
							w: 100,
							h: 100,
						},
					})
				}}
				shapeUtils={shapeUtils}
			/>
		</div>
	)
}
