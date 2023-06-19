import { resizeBox } from '@tldraw/editor/src/lib/editor/shapes/shared/resizeBox'
import { Box2d, HTMLContainer, ShapeUtil, TLOnResizeHandler } from '@tldraw/tldraw'
import { MyCardShape } from './MyCardShape'

// A utility class for the card shape. This is where you define
// the shape's behavior as well as how it renders (its component
// and indicator.)

export class CardShapeUtil extends ShapeUtil<MyCardShape> {
	static override type = 'card' as const

	// Flags
	override isAspectRatioLocked = (_shape: MyCardShape) => false
	override canResize = (_shape: MyCardShape) => true
	override canBind = (_shape: MyCardShape) => true

	getDefaultProps(): MyCardShape['props'] {
		return {
			w: 300,
			h: 300,
			color: 'black',
		}
	}

	getBounds(shape: MyCardShape) {
		return new Box2d(0, 0, shape.props.w, shape.props.h)
	}

	// Render method — the React component that will be rendered for the shape
	component(shape: MyCardShape) {
		const bounds = this.editor.getBounds(shape)

		return (
			<HTMLContainer
				id={shape.id}
				style={{
					border: '1px solid black',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					pointerEvents: 'all',
					color: `var(--palette-${shape.props.color})`,
				}}
			>
				{bounds.w.toFixed()}x{bounds.h.toFixed()}
			</HTMLContainer>
		)
	}

	// Indicator — used when hovering over a shape or when it's selected; must return only SVG elements here
	indicator(shape: MyCardShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}

	// Events
	override onResize: TLOnResizeHandler<MyCardShape> = (shape, info) => {
		return resizeBox(shape, info)
	}
}
