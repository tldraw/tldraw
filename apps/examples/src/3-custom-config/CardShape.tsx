import { resizeBox } from '@tldraw/editor/src/lib/editor/shapes/shared/resizeBox'
import {
	BaseBoxShapeTool,
	Box2d,
	HTMLContainer,
	ShapeUtil,
	TLBaseShape,
	TLOnResizeHandler,
	defineShape,
} from '@tldraw/tldraw'

export type CardShape = TLBaseShape<
	'card',
	{
		w: number
		h: number
	}
>

export class CardShapeUtil extends ShapeUtil<CardShape> {
	// Id — the shape util's id
	static override type = 'card' as const

	override getBounds(shape: CardShape) {
		return new Box2d(0, 0, shape.props.w, shape.props.h)
	}

	override onResize: TLOnResizeHandler<CardShape> = (shape, info) => {
		return resizeBox(shape, info)
	}

	// Flags — there are a LOT of other flags!
	override isAspectRatioLocked = (_shape: CardShape) => false
	override canResize = (_shape: CardShape) => true
	override canBind = (_shape: CardShape) => true

	// Default props — used for shapes created with the tool
	override getDefaultProps(): CardShape['props'] {
		return {
			w: 300,
			h: 300,
		}
	}

	// Render method — the React component that will be rendered for the shape
	render(shape: CardShape) {
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
				}}
			>
				{bounds.w.toFixed()}x{bounds.h.toFixed()}
			</HTMLContainer>
		)
	}

	// Indicator — used when hovering over a shape or when it's selected; must return only SVG elements here
	indicator(shape: CardShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

// Extending the base box shape tool gives us a lot of functionality for free.
export class CardShapeTool extends BaseBoxShapeTool {
	static override id = 'card'
	static override initial = 'idle'

	override shapeType = CardShapeUtil
}

export const CardShape = defineShape('card', {
	util: CardShapeUtil,
	tool: CardShapeTool,
})
