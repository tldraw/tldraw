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
} from 'tldraw'

// There's a guide at the bottom of this file!

// [1]
export const MyFilterStyle = StyleProp.defineEnum('myApp:filter', {
	defaultValue: 'none',
	values: ['none', 'invert', 'grayscale', 'blur'],
})

export type MyFilterStyle = T.TypeOf<typeof MyFilterStyle>

// [2]
export type CardShape = TLBaseShape<
	'card',
	{
		w: number
		h: number
		color: TLDefaultColorStyle
		filter: MyFilterStyle
	}
>

//[3]
export class CardShapeUtil extends BaseBoxShapeUtil<CardShape> {
	static override type = 'card' as const

	//[a]
	static override props = {
		w: T.number,
		h: T.number,
		color: DefaultColorStyle,
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

	// [b]
	component(shape: CardShape) {
		const bounds = this.editor.getShapeGeometry(shape).bounds
		const theme = getDefaultColorTheme({ isDarkMode: this.editor.user.getIsDarkMode() })

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

	indicator(shape: CardShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}

	//[c]
	filterStyleToCss(filter: MyFilterStyle) {
		if (filter === 'invert') return 'invert(100%)'
		if (filter === 'grayscale') return 'grayscale(100%)'
		if (filter === 'blur') return 'blur(10px)'
		return 'none'
	}
}

// [4]
export class CardShapeTool extends BaseBoxShapeTool {
	static override id = 'card'
	static override initial = 'idle'
	override shapeType = 'card'
}
/* 
Introduction:
This file contains the logic for how the custom shape and style work. This guide will
mostly focus on the custom style features, for a more in-depth look at creating a custom
shape check out the custom shapes/tools example. For a closer look at creating more 
custom tool interactions, checkout out the screenshot example.


[1]
This is where we define our custom style. We use the `StyleProp.defineEnum` method to
define an enum style. This will create a style that can be one of the values we pass
in to the `values` property. We also pass in a `defaultValue` property, this will be
the default value for the style. It's important that the StyleProp is unique, so we
reccomend prefixing it with your app name. 

[2]
Defining our shape's type. Here we import a type for color, the default tldraw style, 
and also use our own type for our custom style: filter.

[3]
This is our util, where we define the logic for our shape, it's geometry, resize behaviour 
and render method.
	- [a] The props for our shape. We can import a validator for the default color style
		  and use our own for our custom style.
	- [b] The render method for our custom shape, this is where we tell the browser how
		  how to render our different styles using the style attribute. Using the 
		  getDefaultColorTheme function along with the getIsDarkMode method gives us access 
		  to the tldraw default colorsand ensures they stay up to date when switching between 
		  light and dark mode.
		  We apply our filter style using a method we've defined on the shape util called
		  filterStyleToCss
	- [c] This is our method for converting the style the user selected into CSS

Check out FilterStyleUi.tsx to see how we render the UI for our custom style.

[4] 
This is our tool, it's very simple, we just define the id and initial state. Extending the 
BaseBoxShapeTool gives us a lot of the default behaviour for free.

 */
