import {
	Geometry2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLBaseShape,
	TLOnResizeHandler,
	Tldraw,
	resizeBox,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
type ICustomShape = TLBaseShape<
	'my-custom-shape',
	{
		w: number
		h: number
		text: string
	}
>

// [2]
export class MyShapeUtil extends ShapeUtil<ICustomShape> {
	// [a]
	static override type = 'my-custom-shape' as const
	static override props: RecordProps<ICustomShape> = {
		w: T.number,
		h: T.number,
		text: T.string,
	}

	// [b]
	getDefaultProps(): ICustomShape['props'] {
		return {
			w: 200,
			h: 200,
			text: "I'm a shape!",
		}
	}

	// [c]
	override canEdit = () => false
	override canResize = () => true
	override isAspectRatioLocked = () => false

	// [d]
	getGeometry(shape: ICustomShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	// [e]
	override onResize: TLOnResizeHandler<any> = (shape, info) => {
		return resizeBox(shape, info)
	}

	// [f]
	component(shape: ICustomShape) {
		return <HTMLContainer style={{ backgroundColor: '#efefef' }}>{shape.props.text}</HTMLContainer>
	}

	// [g]
	indicator(shape: ICustomShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

// [3]
const customShape = [MyShapeUtil]
export default function CustomShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShape}
				onMount={(editor) => {
					editor.createShape({ type: 'my-custom-shape', x: 100, y: 100 })
				}}
			/>
		</div>
	)
}

/*
Introduction:

You can create custom shapes in tldraw by creating a shape util and passing it to the Tldraw component.
In this example, we'll create a custom shape that is a simple rectangle with some text inside of it. 

[1] 
Define the shape type. This is a type that extend the `TLBaseShape` generic and defines the shape's 
props. We need to pass in a unique string literal for the shape's type and an object that defines the
shape's props.

[2] 
This is our shape util. In tldraw shape utils are classes that define how a shape behaves and renders.
We can extend the ShapeUtil class and provide the shape type as a generic. If we extended the 
BaseBoxShapeUtil class instead, we wouldn't have define methods such as `getGeometry` and `onResize`.

	[a]
	This is where we define out shape's props and type for the editor. It's important to use the same
	string for the type as we did in [1]. We need to define the shape's props using tldraw's validator 
	library. The validator will help make sure the store always has shape data we can trust.

	[b]
	This is a method that returns the default props for our shape.

	[c]
	Some handy methods for controlling different shape behaviour. You don't have to define these, and 
	they're only shown here so you know they exist. Check out the editable shape example to learn more 
	about creating an editable shape.

	[d]
	The getGeometry method is what the editor uses for hit-testing, binding etc. We're using the
	Rectangle2d class from tldraw's geometry library to create a rectangle shape. If we extended the
	BaseBoxShapeUtil class, we wouldn't have to define this method.

	[e]
	We're using the resizeBox utility method to handle resizing our shape. If we extended the
	BaseBoxShapeUtil class, we wouldn't have to define this method.

	[f]
	The component method defines how our shape renders. We're returning an HTMLContainer here, which
	is a handy component that tldraw exports. It's essentially a div with some special css. There's a
	lot of flexibility here, and you can use any React hooks you want and return any valid JSX.

	[g]
	The indicator is the blue outline around a selected shape. We're just returning a rectangle with the
	same width and height as the shape here. You can return any valid JSX here.

[3]
This is where we render the Tldraw component with our custom shape. We're passing in our custom shape
util as an array to the shapeUtils prop. We're also using the onMount callback to create a shape on 
the canvas. If you want to learn how to add a tool for your shape, check out the custom config example. 
If you want to learn how to programmatically control the canvas, check out the Editor API examples.

*/
