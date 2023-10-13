import {
	BaseBoxShapeTool,
	BaseBoxShapeUtil,
	DefaultColorStyle,
	HTMLContainer,
	StyleProp,
	T,
	TLBaseShape,
	TLDefaultColorStyle,
	getDefaultColorTheme,
} from '@tldraw/tldraw'

// Define a style that can be used across multiple shapes.
// The ID (myApp:filter) must be globally unique, so we recommend prefixing it with a namespace.
export const MyFilterStyle = StyleProp.defineEnum('myApp:filter', {
	defaultValue: 'none',
	values: ['none', 'invert', 'grayscale', 'blur'],
})

export type MyFilterStyle = T.TypeOf<typeof MyFilterStyle>

export type CardShape = TLBaseShape<
	'card',
	{
		w: number
		h: number
		color: TLDefaultColorStyle
		filter: MyFilterStyle
	}
>

export class CardShapeUtil extends BaseBoxShapeUtil<CardShape> {
	static override type = 'card' as const

	static override props = {
		w: T.number,
		h: T.number,
		// You can re-use tldraw built-in styles...
		color: DefaultColorStyle,
		// ...or your own custom styles.
		filter: MyFilterStyle,
	}

	override isAspectRatioLocked = (_shape: CardShape) => false
	override canResize = (_shape: CardShape) => true
	override canBind = (_shape: CardShape) => true

	override getDefaultProps(): CardShape['props'] {
		return {
			w: 300,
			h: 300,
			color: 'black',
			filter: 'none',
		}
	}

	component(shape: CardShape) {
		const bounds = this.editor.getShapeGeometry(shape).bounds
		const theme = getDefaultColorTheme({ isDarkMode: this.editor.user.isDarkMode })

		return (
			<HTMLContainer
				id={shape.id}
				style={{
					border: `4px solid ${theme[shape.props.color].solid}`,
					borderRadius: 4,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					pointerEvents: 'all',
					filter: this.filterStyleToCss(shape.props.filter),
					backgroundColor: theme[shape.props.color].semi,
				}}
			>
				🍇🫐🍏🍋🍊🍒 {bounds.w.toFixed()}x{bounds.h.toFixed()} 🍒🍊🍋🍏🫐🍇
			</HTMLContainer>
		)
	}

	// Indicator — used when hovering over a shape or when it's selected; must return only SVG elements here
	indicator(shape: CardShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}

	filterStyleToCss(filter: MyFilterStyle) {
		if (filter === 'invert') return 'invert(100%)'
		if (filter === 'grayscale') return 'grayscale(100%)'
		if (filter === 'blur') return 'blur(10px)'
		return 'none'
	}
}

// Extending the base box shape tool gives us a lot of functionality for free.
export class CardShapeTool extends BaseBoxShapeTool {
	static override id = 'card'
	static override initial = 'idle'
	override shapeType = 'card'
	props = {
		w: T.number,
		h: T.number,
		// You can re-use tldraw built-in styles...
		color: DefaultColorStyle,
		// ...or your own custom styles.
		filter: MyFilterStyle,
	}
}
