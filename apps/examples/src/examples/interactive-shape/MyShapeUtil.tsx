import { BaseBoxShapeUtil, HTMLContainer, ShapeProps, T, TLBaseShape } from 'tldraw'

// There's a guide at the bottom of this file!

// [1]
type IMyInteractiveShape = TLBaseShape<
	'MyShape',
	{
		w: number
		h: number
		checked: boolean
		text: string
	}
>

export class MyShapeUtil extends BaseBoxShapeUtil<IMyInteractiveShape> {
	static override type = 'MyShape' as const
	static override props: ShapeProps<IMyInteractiveShape> = {
		w: T.number,
		h: T.number,
		checked: T.boolean,
		text: T.string,
	}

	getDefaultProps(): IMyInteractiveShape['props'] {
		return {
			w: 230,
			h: 230,
			checked: false,
			text: '',
		}
	}

	// [4]
	component(shape: IMyInteractiveShape) {
		return (
			<HTMLContainer
				style={{
					padding: 16,
					height: shape.props.h,
					width: shape.props.w,
					// [a] This is where we allow pointer events on our shape
					pointerEvents: 'all',
					backgroundColor: '#efefef',
					overflow: 'hidden',
				}}
			>
				<input
					type="checkbox"
					checked={shape.props.checked}
					onChange={() =>
						this.editor.updateShape<IMyInteractiveShape>({
							id: shape.id,
							type: 'MyShape',
							props: { checked: !shape.props.checked },
						})
					}
					// [b] This is where we stop event propagation
					onPointerDown={(e) => e.stopPropagation()}
				/>
				<input
					type="text"
					placeholder="Enter a todo..."
					readOnly={shape.props.checked}
					value={shape.props.text}
					onChange={(e) =>
						this.editor.updateShape<IMyInteractiveShape>({
							id: shape.id,
							type: 'MyShape',
							props: { text: e.currentTarget.value },
						})
					}
					onPointerDown={(e) => {
						if (!shape.props.checked) {
							e.stopPropagation()
						}
					}}
				/>
			</HTMLContainer>
		)
	}

	// [5]
	indicator(shape: IMyInteractiveShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

/* 
[1]

This is a custom shape, see our custom shape example to learn more about custom shapes...

[2]
In our component, we want the user to be able to click on the shape and drag it around...
But also want to be able to click on the checkbox and check it without selecting the shape or starting a drag.


This is a utility class for our todo shape. This is where you define the shape's behavior, 
how it renders (its component and indicator), and how it handles different events. The most relevant
part of the code to an interactive shape can be found in the component method [4].

[1]
This is where we define the shape's type for Typescript. We can extend the TLBaseShape type,
providing a unique string to identify the shape and the shape's props. We want to store the shape's
color and its checked state, so we define those as props here.

[2]
We define the shape's type and props for the editor. We can use tldraw's validator library to
make sure that the store always has shape data we can trust. T.number, T.boolean, and T.string are 
all validators that ensure that the shape's props are the correct type before they are stored in the
editor's store. We should write a special validator for our shape's colors, but for now we'll just
use T.string.

[3]
getDefaultProps determines what our shape looks like when click-creating one. In this case, we
want the shape to be a square, and generate a random color when created.

[4]
The component method defines how our shape renders. We're returning an HTMLContainer here, which
is a handy component that tldraw exports. It's essentially a div with some special css. There's a
a couple of things we have to do here to make our shape interactive.
	
	[a] We have to allow pointer events on our shape. This is done by setting the css property 
		`pointerEvents` to 'all'. This will allow us to interact with the shape's children, like the
		checkbox and the text.
	[b] We have to stop event propagation on the checkbox. This is done by adding an event listener
		to the checkbox's onPointerDown event. This will stop the event from bubbling up to the 
		editor, and allow us to click the checkbox without selecting the shape.

[5]
The indicator is the blue box that appears around the shape when it's selected. We're just returning
a rectangle with the same width and height as the shape here.


*/
