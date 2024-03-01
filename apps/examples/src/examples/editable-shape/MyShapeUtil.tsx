import {
	BaseBoxShapeUtil,
	HTMLContainer,
	ShapeProps,
	T,
	TLBaseShape,
	TLOnEditEndHandler,
	stopEventPropagation,
} from 'tldraw'

// There's a guide at the bottom of this file!

const ANIMAL_EMOJIS = ['🐶', '🐱', '🐨', '🐮', '🐴']

// [1]
type IMyEditableShape = TLBaseShape<
	'my-editable-shape',
	{
		w: number
		h: number
		animal: number
	}
>

export class MyShapeUtil extends BaseBoxShapeUtil<IMyEditableShape> {
	static override type = 'my-editable-shape' as const
	static override props: ShapeProps<IMyEditableShape> = {
		w: T.number,
		h: T.number,
		animal: T.number,
	}

	// [1] !!!
	override canEdit = () => true

	getDefaultProps(): IMyEditableShape['props'] {
		return {
			w: 200,
			h: 200,
			animal: 0,
		}
	}

	// [2]
	component(shape: IMyEditableShape) {
		// [a]
		const isEditing = this.editor.getEditingShapeId() === shape.id

		// [b]
		return (
			<HTMLContainer
				id={shape.id}
				// [!]
				onPointerDown={isEditing ? stopEventPropagation : undefined}
				style={{
					// [!]
					pointerEvents: isEditing ? 'all' : 'none',
					backgroundColor: '#efefef',
					padding: 16,
				}}
			>
				{ANIMAL_EMOJIS[shape.props.animal]}
				{/* [!] */}
				{isEditing ? (
					<button
						onClick={() => {
							this.editor.updateShape({
								id: shape.id,
								type: shape.type,
								props: {
									...shape.props,
									animal: (shape.props.animal + 1) % ANIMAL_EMOJIS.length,
								},
							})
						}}
					>
						Next
					</button>
				) : (
					// [!] // when not editing...
					<p>Double Click to Edit</p>
				)}
			</HTMLContainer>
		)
	}

	indicator(shape: IMyEditableShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}

	// [3]
	override onEditEnd: TLOnEditEndHandler<IMyEditableShape> = (shape) => {
		this.editor.animateShape(
			{ ...shape, rotation: shape.rotation + Math.PI * 2 },
			{ duration: 250 }
		)
	}
}

/* 

- reference the basic custom shape example?
- ...


This is a utility class for the Myshape shape. This is where you define the shape's behavior, 
how it renders (its component and indicator), and how it handles different events.

[1]
This is where we define the shape's type for Typescript. We can extend the TLBaseShape type,
providing a unique string to identify the shape and the shape's props. We only need height
and width for this shape.

[2]
We define the shape's type and props for the editor. We can use tldraw's validator library to
define the shape's properties. In this case, we define the width and height properties as numbers.

[3]
Some methods we can override to define specific beahviour for the shape. For this shape, we don't
want the aspect ratio to change, we want it to resize, and sure it can bind, why not. Who doesn't
love arrows?

[4]
This is the important one. We set canEdit to true. This means that the shape can enter the editing
state.

[5]
This will be the default props for the shape when you create it via clicking.

[6]
We define the getGeometry method. This method returns the geometry of the shape. In this case,
a Rectangle2d object.

[7]
We define the component method. This controls what the shape looks like and it returns JSX.

	[a] We can use the useIsEditing hook to check if the shape is in the editing state. If it is,
	    we want our shape to render differently.
	
	[b] The HTML container is a really handy wrapper for custom shapes, it essentially creates a
		div with some helpful css for you. We can use the isEditing variable to conditionally
		render the shape. We also use the useState hook to toggle between a cat and a dog.

[8]
The indicator method is the blue box that appears around the shape when it's selected. We can 
make it appear red if the shape is in the editing state by using the useIsEditing hook.

[9]
The onResize method is where we handle the resizing of the shape. We use the resizeBox helper
to handle the resizing for us.

[10]
The onEditEnd method is called when the shape exits the editing state. In the tldraw codebase we 
mostly use this for trimming text fields in shapes. In this case, we use it to animate the shape
when it exits the editing state.

*/
