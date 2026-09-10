import {
	BaseBoxShapeUtil,
	DefaultColorStyle,
	DefaultSizeStyle,
	getColorValue,
	HTMLContainer,
	T,
	TLDefaultColorStyle,
	TLDefaultSizeStyle,
	Tldraw,
	TLShape,
} from 'tldraw'
import 'tldraw/tldraw.css'

const MY_SHAPE_WITH_TLDRAW_STYLES_TYPE = 'myshapewithtldrawstyles' as const

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[MY_SHAPE_WITH_TLDRAW_STYLES_TYPE]: {
			w: number
			h: number
			size: TLDefaultSizeStyle
			color: TLDefaultColorStyle
		}
	}
}

// There's a guide at the bottom of this file!

// [1]
const FONT_SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 1.125,
	m: 1.5,
	l: 2.25,
	xl: 2.75,
}

type IMyShape = TLShape<typeof MY_SHAPE_WITH_TLDRAW_STYLES_TYPE>

class MyShapeUtil extends BaseBoxShapeUtil<IMyShape> {
	static override type = MY_SHAPE_WITH_TLDRAW_STYLES_TYPE

	// [2]
	static override props = {
		w: T.number,
		h: T.number,
		size: DefaultSizeStyle,
		color: DefaultColorStyle,
	}

	getDefaultProps(): IMyShape['props'] {
		return {
			w: 300,
			h: 300,
			size: 'm',
			color: 'black',
		}
	}

	// [3]
	component(shape: IMyShape) {
		const theme = this.editor.getCurrentTheme()
		const colors = theme.colors[this.editor.getColorMode()]

		return (
			<HTMLContainer
				id={shape.id}
				style={{ backgroundColor: 'var(--tl-color-low-border)', overflow: 'hidden' }}
			>
				<div
					style={{
						fontSize: theme.fontSize * FONT_SIZES[shape.props.size],
						color: getColorValue(colors, shape.props.color, 'solid'),
					}}
				>
					Select the shape and use the style panel to change the font size and color
				</div>
			</HTMLContainer>
		)
	}

	getIndicatorPath(shape: IMyShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

const customShapeUtils = [MyShapeUtil]

export default function ShapeWithTldrawStylesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapeUtils}
				onMount={(editor) => {
					editor.createShape({ type: 'myshapewithtldrawstyles', x: 100, y: 100 })
				}}
			/>
		</div>
	)
}

/*
This file shows a custom shape that uses tldraw's default styles. For more on
custom shapes, see the custom shape example.

[1]
Style values are just strings like 's' or 'black'; it's up to the shape to
decide what they mean. Here we map each size to a multiplier of the theme's
base font size (theme.fontSize is 16px in the default theme), so text scales
with custom themes. Any mapping works; these happen to match tldraw's own text
shape.

[2]
For the shape's props, we use the DefaultSizeStyle and DefaultColorStyle
StyleProps for the size and color properties. Because the validators are
StyleProps, the editor treats these props as styles: the style panel shows
them for this shape, and new shapes pick up the most recently used values.
(You can use the useRelevantStyles hook to get the styles of the user's
selected shapes in your own UI.)

[3]
Inside the component we read the styles to change how the shape looks. We get
the color from the editor's current theme via editor.getCurrentTheme() and
getColorValue, which resolves the color name for the current light or dark
mode. Reading the theme here is reactive, so the shape re-renders when the
theme or color mode changes.
*/
