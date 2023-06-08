import { BaseBoxShapeUtil, HTMLContainer } from '@tldraw/tldraw'
import { CardShape } from './CardShape'

export class CardShapeUtil extends BaseBoxShapeUtil<CardShape> {
	// Id — the shape util's id
	static override type = 'card' as const

	// Flags — there are a LOT of other flags!
	override isAspectRatioLocked = (_shape: CardShape) => false
	override canResize = (_shape: CardShape) => true
	override canBind = (_shape: CardShape) => true

	// Default props — used for shapes created with the tool
	override defaultProps(): CardShape['props'] {
		return {
			w: 300,
			h: 300,
		}
	}

	// Render method — the React component that will be rendered for the shape
	render(shape: CardShape) {
		const bounds = this.bounds(shape)

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
