/* eslint-disable react-hooks/rules-of-hooks */
import { useState } from 'react'
import {
	HTMLContainer,
	Rectangle2d,
	ShapeProps,
	ShapeUtil,
	T,
	TLBaseShape,
	TLOnEditEndHandler,
	TLOnResizeHandler,
	resizeBox,
	structuredClone,
	useIsEditing,
} from 'tldraw'

// There's a guide at the bottom of this file!

// [1]
type IMyshape = TLBaseShape<
	'Myshape',
	{
		w: number
		h: number
	}
>

export class MyshapeUtil extends ShapeUtil<IMyshape> {
	// [2]
	static override type = 'Myshape' as const
	static override props: ShapeProps<IMyshape> = {
		w: T.number,
		h: T.number,
	}

	// [3]
	override isAspectRatioLocked = (_shape: IMyshape) => true
	override canResize = (_shape: IMyshape) => true
	override canBind = (_shape: IMyshape) => true

	// [4]
	override canEdit = () => true

	// [5]
	getDefaultProps(): IMyshape['props'] {
		return {
			w: 170,
			h: 165,
		}
	}

	// [6]
	getGeometry(shape: IMyshape) {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	// [7]
	component(shape: IMyshape) {
		// [a]
		const isEditing = useIsEditing(shape.id)

		const [animal, setAnimal] = useState<boolean>(true)

		// [b]
		return (
			<HTMLContainer id={shape.id}>
				<div
					style={{
						border: '1px solid rgba(0, 0, 0, 0.1)',
						boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.12), 0px 1px 3px rgba(0, 0, 0, 0.04)',
						display: 'flex',
						borderRadius: '50%',
						height: '100%',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						pointerEvents: 'all',
						backgroundColor: animal ? 'hsl(180, 34%, 86%)' : 'hsl(10, 34%, 86%)',
						position: 'relative',
					}}
				>
					<button
						style={{
							display: isEditing ? 'block' : 'none',
							border: 'none',
							position: 'absolute',
							top: 0,
							left: 50,
							cursor: 'pointer',
							padding: '8px 8px',
							borderRadius: '4px',
							backgroundColor: 'hsl(120, 54%, 46%)',
							color: '#fff',
							textDecoration: 'none',
							boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.12), 0px 1px 3px rgba(0, 0, 0, 0.04)',
						}}
						disabled={!isEditing}
						onPointerDown={(e) => e.stopPropagation()}
						onClick={() => setAnimal((prev) => !prev)}
					>
						Change
					</button>
					<p style={{ fontSize: shape.props.h / 1.5, margin: 0 }}>{animal ? '🐶' : '🐱'}</p>
				</div>
			</HTMLContainer>
		)
	}

	// [8]
	indicator(shape: IMyshape) {
		const isEditing = useIsEditing(shape.id)
		return <rect stroke={isEditing ? 'red' : 'blue'} width={shape.props.w} height={shape.props.h} />
	}

	// [9]
	override onResize: TLOnResizeHandler<IMyshape> = (shape, info) => {
		return resizeBox(shape, info)
	}

	// [10]
	override onEditEnd: TLOnEditEndHandler<IMyshape> = (shape) => {
		const frame1 = structuredClone(shape)
		const frame2 = structuredClone(shape)

		frame1.x = shape.x + 1.2
		frame2.x = shape.x - 1.2

		this.editor.animateShape(frame1, { duration: 50 })

		setTimeout(() => {
			this.editor.animateShape(frame2, { duration: 50 })
		}, 100)

		setTimeout(() => {
			this.editor.animateShape(shape, { duration: 100 })
		}, 200)
	}
}

/* 
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
