import {
	BaseBoxShapeUtil,
	DefaultStylePanel,
	DefaultStylePanelContent,
	HTMLContainer,
	StyleProp,
	T,
	TLComponents,
	Tldraw,
	TLShape,
	useEditor,
	useRelevantStyles,
} from 'tldraw'
import 'tldraw/tldraw.css'

const MY_SHAPE_WITH_CUSTOM_STYLES_TYPE = 'myshapewithcustomstyles'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[MY_SHAPE_WITH_CUSTOM_STYLES_TYPE]: {
			w: number
			h: number
			rating: MyRatingStyle
		}
	}
}

// There's a guide at the bottom of this file!

// [1]
const myRatingStyle = StyleProp.defineEnum('example:rating', {
	defaultValue: 1,
	values: [1, 2, 3, 4, 5],
})

// [2]
type MyRatingStyle = T.TypeOf<typeof myRatingStyle>

type IMyShape = TLShape<typeof MY_SHAPE_WITH_CUSTOM_STYLES_TYPE>

class MyShapeUtil extends BaseBoxShapeUtil<IMyShape> {
	static override type = MY_SHAPE_WITH_CUSTOM_STYLES_TYPE

	// [3]
	static override props = {
		w: T.number,
		h: T.number,
		rating: myRatingStyle,
	}

	getDefaultProps(): IMyShape['props'] {
		return {
			w: 300,
			h: 300,
			rating: 4, // [4]
		}
	}

	component(shape: IMyShape) {
		// [5]
		const stars = ['☆', '☆', '☆', '☆', '☆']
		for (let i = 0; i < shape.props.rating; i++) {
			stars[i] = '★'
		}

		return (
			<HTMLContainer
				id={shape.id}
				style={{ backgroundColor: 'var(--tl-color-low-border)', overflow: 'hidden' }}
			>
				{stars}
			</HTMLContainer>
		)
	}

	getIndicatorPath(shape: IMyShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

// [6]
function CustomStylePanel() {
	const editor = useEditor()
	const styles = useRelevantStyles()
	if (!styles) return null

	const rating = styles.get(myRatingStyle)

	return (
		<DefaultStylePanel>
			<DefaultStylePanelContent />
			{rating !== undefined && (
				<div>
					<select
						style={{ width: '100%', padding: 4 }}
						value={rating.type === 'mixed' ? '' : rating.value}
						onChange={(e) => {
							const value = myRatingStyle.validate(+e.currentTarget.value)
							editor.run(() => {
								editor.markHistoryStoppingPoint()
								editor.setStyleForSelectedShapes(myRatingStyle, value)
								editor.setStyleForNextShapes(myRatingStyle, value)
							})
						}}
					>
						{rating.type === 'mixed' ? <option value="">Mixed</option> : null}
						<option value={1}>1</option>
						<option value={2}>2</option>
						<option value={3}>3</option>
						<option value={4}>4</option>
						<option value={5}>5</option>
					</select>
				</div>
			)}
		</DefaultStylePanel>
	)
}

// [7]
const shapeUtils = [MyShapeUtil]
const components: TLComponents = {
	StylePanel: CustomStylePanel,
}

export default function ShapeWithCustomStylesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				components={components}
				onMount={(editor) => {
					// [8]
					editor.createShape({ type: 'myshapewithcustomstyles', x: 100, y: 100 })
					editor.selectAll()
					editor.createShape({
						type: 'myshapewithcustomstyles',
						x: 450,
						y: 250,
						props: { rating: 5 },
					})
				}}
			/>
		</div>
	)
}

/*
This file shows a custom shape that uses a custom style. For more on custom
shapes, see the custom shape example.

[1]
Our custom shape uses a new style called "rating". We create it with
StyleProp.defineEnum so that it has a fixed set of values and a default. The
id ('example:rating') must be unique across all styles in the editor.

[2]
Extract the type of the style's values so we can use it in the shape's props.

[3]
Pass the style as one of the shape's props. Any prop whose validator is a
StyleProp is treated as a style: the editor tracks it across selections and
shows it in the style panel.

[4]
Because this prop is a style, whatever value we put here in the default
props is overwritten when a shape is created: the editor uses its "style for
next shape" value instead, which is either the style's default value or the
value the user most recently set. This is special behavior just for styles.

[5]
Inside the component we read the style just like any other prop.

[6]
A custom style panel that renders the default style panel content plus a
dropdown for the rating style. useRelevantStyles returns the styles shared by
the selected shapes (or the current tool), and each entry is either a shared
value or 'mixed'. editor.setStyleForSelectedShapes writes the new value to
every selected shape, and editor.setStyleForNextShapes remembers it for shapes
created afterwards, which is what the default style panel does too. For more
on customizing the style panel, see the stroke size picker example.

[7]
Define shapeUtils and components outside the React component so they aren't
recreated on every render.

[8]
We create two shapes. The first does not specify a rating, so it gets the
editor's current value for the style, which is the style's default of 1 (not
the 4 in getDefaultProps, see [4]). The second specifies a rating of 5, so it
uses that value.
*/
