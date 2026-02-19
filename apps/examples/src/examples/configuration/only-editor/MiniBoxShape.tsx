import { BaseBoxShapeUtil, HTMLContainer, TLShape } from 'tldraw'

// There's a guide at the bottom of this page!

const BOX_TYPE = 'box'

// [1]
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[BOX_TYPE]: { w: number; h: number; color: string }
	}
}

// [2]
export type MiniBoxShape = TLShape<typeof BOX_TYPE>

// [3]
export class MiniBoxShapeUtil extends BaseBoxShapeUtil<MiniBoxShape> {
	//[a]
	static override type = BOX_TYPE
	//[b]
	override getDefaultProps(): MiniBoxShape['props'] {
		return { w: 100, h: 100, color: '#efefef' }
	}
	//[c]
	component(shape: MiniBoxShape) {
		return (
			<HTMLContainer>
				<div
					style={{
						width: shape.props.w,
						height: shape.props.h,
						border: '1px solid black',
						backgroundColor: shape.props.color,
						pointerEvents: 'all',
					}}
				/>
			</HTMLContainer>
		)
	}
	//[d]
	indicator(shape: MiniBoxShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

/*
This is our shape util, in tldraw all shapes extend the shape util class. In this
example we're extending the built-in BaseBoxShapeUtil class. This class provides
the functionality for our shape.

[1]
First, we need to extend TLGlobalShapePropsMap to add our shape's props to the global type system.
This tells TypeScript about the shape's properties. For this shape, we define width (w), height (h),
and color as the shape's properties.

[2]
Define the shape type using TLShape with the shape's type as a type argument.

[3]
The shape util itself.
	[a] The type of shape this util is for, this should match the shape type we defined in [2].
	[b] The default props for our shape. These will be used when creating a new shape.
	[c] The component for our shape. This returns JSX and is what will be rendered on the
		canvas. The HtmlContainer component is a div that provides some useful styles.
	[d] The indicator for our shape, this also returns JSX. This is what will be rendered
		on the canvas when the shape is selected.
*/
