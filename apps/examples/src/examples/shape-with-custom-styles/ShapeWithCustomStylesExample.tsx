import {
	BaseBoxShapeUtil,
	DefaultStylePanel,
	DefaultStylePanelContent,
	HTMLContainer,
	StyleProp,
	T,
	TLBaseShape,
	Tldraw,
	useEditor,
	useRelevantStyles,
} from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const myRatingStyle = StyleProp.defineEnum('example:rating', {
	defaultValue: 1,
	values: [1, 2, 3, 4, 5],
})

// [2]
type MyRatingStyle = T.TypeOf<typeof myRatingStyle>

type IMyShape = TLBaseShape<
	'myshape',
	{
		w: number
		h: number
		rating: MyRatingStyle
	}
>

class MyShapeUtil extends BaseBoxShapeUtil<IMyShape> {
	static override type = 'myshape' as const

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
				style={{ backgroundColor: 'var(--color-low-border)', overflow: 'hidden' }}
			>
				{stars}
			</HTMLContainer>
		)
	}

	indicator(shape: IMyShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
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
			<DefaultStylePanelContent styles={styles} />
			{rating !== undefined && (
				<div>
					<select
						style={{ width: '100%', padding: 4 }}
						value={rating.type === 'mixed' ? '' : rating.value}
						onChange={(e) => {
							editor.mark('changing rating')
							const value = myRatingStyle.validate(+e.currentTarget.value)
							editor.setStyleForSelectedShapes(myRatingStyle, value)
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

export default function ShapeWithTldrawStylesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// [7]
				shapeUtils={[MyShapeUtil]}
				components={{
					StylePanel: CustomStylePanel,
				}}
				onMount={(editor) => {
					editor.createShape({ type: 'myshape', x: 100, y: 100 })
					editor.selectAll()
					editor.createShape({ type: 'myshape', x: 450, y: 250, props: { rating: 5 } })
				}}
			/>
		</div>
	)
}

/* 

This file shows a custom shape that uses a user-created styles 

For more on custom shapes, see our Custom Shape example.

[1]
In this example, our custom shape will use a new style called "rating".
We'll need to create the style so that we can pass it to the shape's props.

[2]
Here's we extract the type of the style's values. We use it below when
we define the shape's props.

[3]
We pass the style to the shape's props.

[4]
Since this property uses one a style, whatever value we put here in the
shape's default props will be overwritten by the editor's current value 
for that style, which will either be the default value or the most 
recent value the user has set. This is special behavior just for styles.

[5]
We can use the styles in the component just like any other prop.

[6]
Here we create a custom style panel that includes the default style panel
and also a dropdown for the rating style. We use the useRelevantStyles hook
to get the styles of the user's selected shapes, and the useEditor hook to
set the style for the selected shapes. For more on customizing the style
panel, see our custom style panel example.

[7]
We pass the custom shape util and custom components in as props.

[8]
And for this example, we create two shapes: the first does not specify a
rating, so it will use the editor's current style value (in this example,
this will be the style's default value of 4). The second specifies a 
rating of 5, so it will use that value.
*/
