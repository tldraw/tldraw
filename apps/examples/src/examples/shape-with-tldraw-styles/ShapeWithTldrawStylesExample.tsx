import {
	BaseBoxShapeUtil,
	DefaultColorStyle,
	DefaultSizeStyle,
	HTMLContainer,
	T,
	TLBaseShape,
	Tldraw,
} from '@tldraw/tldraw'
import { useDefaultColorTheme } from '@tldraw/tldraw/src/lib/shapes/shared/ShapeFill'
import '@tldraw/tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const FONT_SIZES = {
	s: 14,
	m: 25,
	l: 38,
	xl: 48,
}

type IMyShape = TLBaseShape<
	'myshape',
	{
		w: number
		h: number
		size: 's' | 'm' | 'l' | 'xl'
		color:
			| 'black'
			| 'grey'
			| 'light-violet'
			| 'violet'
			| 'blue'
			| 'light-blue'
			| 'yellow'
			| 'orange'
			| 'green'
			| 'light-green'
			| 'light-red'
			| 'red'
	}
>

class MyShapeUtil extends BaseBoxShapeUtil<IMyShape> {
	static override type = 'myshape' as const
	// [1]
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

	// [2]
	component(shape: IMyShape) {
		const size = FONT_SIZES[shape.props.size]
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const theme = useDefaultColorTheme()

		return (
			<HTMLContainer
				id={shape.id}
				style={{ backgroundColor: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}
			>
				<div style={{ fontSize: size, color: theme[shape.props.color].solid }}>
					Select the shape and use the style panel to change the font size and color
				</div>
			</HTMLContainer>
		)
	}

	indicator(shape: IMyShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

// [3]
const customShapeUtils = [MyShapeUtil]
export default function ShapeWithTldrawStylesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// Pass in the array of custom shape classes
				shapeUtils={customShapeUtils}
				onMount={(editor) => {
					editor.createShape({ type: 'myshape', x: 100, y: 100 })
				}}
			/>
		</div>
	)
}

/* 
Introduction:

By default the style panel exposes the opacity slider fot all selected shapes, including custom shapes.
If you want to control other styles using the tldraw style panel you can do that by using default 
StyleProps in your shape's props[1]. In this example we use the DefaultSizeStyle and DefaultColorStyle
to control the size and color of the text in the custom shape.

[1]
DefaultSizeStyle and DefaultColorStyle are two of the default StyleProps that are available in the tldraw
package. They are used to control the size and color of the text in the custom shape. 

[2]
The component method is where the shape's visual representation is defined. We need to make sure that our 
shape renders differently when different styles are selected. We're using an object to select a different
font size based on the size prop, and the useDefaultColorTheme hook to get the color theme based on the
current dark mode setting. We then use the color theme to set the color of the text.

[3]
This is where we pass our custom shape to the tldraw component and create a new shape when the editor mounts.
Check out the custom shape example for more information on creating custom shapes, or the editor api example
for more information on programmatically controlling the canvas.


*/
