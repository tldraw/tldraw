import {
	Geometry2d,
	Group2d,
	HTMLUiContainer,
	Rectangle2d,
	ShapeUtil,
	TLBaseShape,
	Tldraw,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

type CustomUiShape = TLBaseShape<
	'custom',
	{
		w: number
		h: number
	}
>

class CustomUiShapeUtil extends ShapeUtil<CustomUiShape> {
	static override type = 'custom' as const

	override getDefaultProps(): { w: number; h: number } {
		return {
			w: 200,
			h: 200,
		}
	}

	override getGeometry(shape: CustomUiShape): Geometry2d {
		return new Group2d({
			children: [
				new Rectangle2d({
					width: shape.props.w,
					height: shape.props.h,
					isFilled: true,
				}),
			],
		})
	}

	override component(_shape: CustomUiShape) {
		return (
			<HTMLUiContainer
				style={{
					display: 'flex',
					flexDirection: 'column',
					backgroundColor: '#efefef',
					border: '1px solid #ccc',
				}}
			>
				<div
					style={{
						width: '100%',
						height: 40,
						padding: 8,
						display: 'flex',
						alignItems: 'center',
						backgroundColor: '#dedede',
					}}
				>
					Header
				</div>
				<div style={{ flexGrow: 2, padding: 8 }}>
					<button>Click here</button>
				</div>
			</HTMLUiContainer>
		)
	}

	override indicator(shape: CustomUiShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

const shapeUtils = [CustomUiShapeUtil]

export default function UiShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="ui_shape_example"
				shapeUtils={shapeUtils}
				onMount={(editor) => {
					if (editor.currentPageShapes.length === 0) {
						const { x, y } = editor.viewportPageCenter
						editor.createShape({ type: 'custom', x: x - 100, y: y - 100 })
					}
				}}
			/>
		</div>
	)
}
