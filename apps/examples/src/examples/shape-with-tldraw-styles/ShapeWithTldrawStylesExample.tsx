import {
	BaseBoxShapeUtil,
	DefaultColorStyle,
	DefaultSizeStyle,
	getColorValue,
	HTMLContainer,
	T,
	TLBaseShape,
	TLDefaultColorStyle,
	TLDefaultSizeStyle,
	Tldraw,
	useDefaultColorTheme,
} from 'tldraw'
import { SizeStyleUtil } from 'tldraw/src/lib/styles/TLSizeStyle'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

type IMyShape = TLBaseShape<
	'myshape',
	{
		w: number
		h: number
		// [1]
		size: TLDefaultSizeStyle
		color: TLDefaultColorStyle
	}
>

class MyShapeUtil extends BaseBoxShapeUtil<IMyShape> {
	static override type = 'myshape' as const

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

	component(shape: IMyShape) {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const theme = useDefaultColorTheme()

		return (
			<HTMLContainer
				id={shape.id}
				style={{ backgroundColor: 'var(--tl-color-low-border)', overflow: 'hidden' }}
			>
				<div
					style={{
						// [3]
						fontSize: this.editor.getStyleUtil(SizeStyleUtil).toFontSizePx(shape.props.size),
						color: getColorValue(theme, shape.props.color, 'solid'),
					}}
				>
					Select the shape and use the style panel to change the font size and color
				</div>
			</HTMLContainer>
		)
	}

	indicator(shape: IMyShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

const customShapeUtils = [MyShapeUtil]

export default function ShapeWithTldrawStylesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapeUtils}
				onMount={(editor) => {
					editor.createShape({ type: 'myshape', x: 100, y: 100 })
				}}
			/>
		</div>
	)
}

/* 

This file shows a custom shape that uses tldraw's default styles. 
For more on custom shapes, see our Custom Shape example.

[1]
In this example, our custom shape will use the size and color styles from the
default styles. When typing a custom shape, you can use our types for
these styles.

[2]
For the shape's props, we'll pass the DefaultSizeStyle and DefaultColorStyle
styles for the two properties, size and color. There's nothing special about
these styles except that the editor will notice when two shapes are selected
that share the same style. (You can use the useRelevantStyles hook to get the
styles of the user's selected shapes.)

[3]
Here in the component, we'll use the styles to change the way that our shape
appears. The style values themselves are just strings, like 'xl' or 'black',
so we use the SizeStyleUtil to convert the size value to pixels for the font-size
property. We also use the default theme (via the useDefaultColorTheme hook) to 
get the color for the text.
*/
