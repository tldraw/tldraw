import { BaseBoxShapeUtil, HTMLContainer, TLBaseShape } from 'tldraw'

// There's a guide at the bottom of this page!

// [1]
export type MiniBoxShape = TLBaseShape<'box', { w: number; h: number; color: string }>

// [2]
export class MiniBoxShapeUtil extends BaseBoxShapeUtil<MiniBoxShape> {
	//[a]
	static override type = 'box'
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
The type for our shape, we can extend the built-in TLBaseShape generic to create ours.

[2]
The shape util itself. 
	[a] The type of shape this util is for, this should be the same as the first argument
		to the TLBaseShape generic.
	[b] The default props for our shape. These will be used when creating a new shape.
	[c] The component for our shape. This returns JSX and is what will be rendered on the 
		canvas. The HtmlContainer component is a div that provides some useful styles.
	[d] The indicator for our shape, this also returns JSX. This is what will be rendered 
		on the canvas when the shape is selected.
*/
