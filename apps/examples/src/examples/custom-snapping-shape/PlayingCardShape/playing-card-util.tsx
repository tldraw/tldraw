/* eslint-disable react-hooks/rules-of-hooks */
import {
	BoundsSnapGeometry,
	HTMLContainer,
	Rectangle2d,
	ShapeProps,
	ShapeUtil,
	T,
	TLBaseShape,
	TLOnResizeHandler,
	resizeBox,
} from '@tldraw/tldraw'

// There's a guide at the bottom of this file!

// [1]
type IPlayingCard = TLBaseShape<
	'PlayingCard',
	{
		w: number
		h: number
	}
>

export class PlayingCardUtil extends ShapeUtil<IPlayingCard> {
	// [2]
	static override type = 'PlayingCard' as const
	static override props: ShapeProps<IPlayingCard> = {
		w: T.number,
		h: T.number,
	}

	// [3]
	override isAspectRatioLocked = (_shape: IPlayingCard) => true
	override canResize = (_shape: IPlayingCard) => true
	override canBind = (_shape: IPlayingCard) => true
	override canEdit = () => false

	// [5]
	getDefaultProps(): IPlayingCard['props'] {
		return {
			w: 270,
			h: 370,
		}
	}

	// [6]
	getGeometry(shape: IPlayingCard) {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	override getBoundsSnapGeometry(shape: IPlayingCard): BoundsSnapGeometry {
		return new Rectangle2d({
			width: shape.props.h / 4.5,
			height: shape.props.h / 4.5,
			isFilled: true,
		})
	}

	// [7]
	component(shape: IPlayingCard) {
		// [b]
		//many animals in this array
		const animalEmojiArray = [
			'🐶',
			'🐱',
			'🐭',
			'🐹',
			'🐰',
			'🦊',
			'🐻',
			'🐼',
			'🐨',
			'🐯',
			'🦁',
			'🐮',
			'🐷',
			'🐸',
			'🐵',
		]
		const randomAnimal = animalEmojiArray[Math.floor(Math.random() * animalEmojiArray.length)]
		return (
			<HTMLContainer
				style={{
					height: shape.props.h,
					width: shape.props.w,
					backgroundColor: 'lightblue',
					boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.2)',
					position: 'relative',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					padding: 8,
				}}
				id={shape.id}
			>
				<span
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						height: shape.props.h / 4.5,
						width: shape.props.h / 4.5,
						fontSize: shape.props.h / 5,
					}}
				>
					{randomAnimal}
				</span>
				<div
					style={{
						fontSize: shape.props.h / 3,
						backgroundColor: 'rgba(255, 255, 255, 0.5)',
						padding: 7,
						borderRadius: '8px',
					}}
				>
					{randomAnimal}
				</div>
			</HTMLContainer>
		)
	}

	// [8]
	indicator(shape: IPlayingCard) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}

	// [9]
	override onResize: TLOnResizeHandler<IPlayingCard> = (shape, info) => {
		return resizeBox(shape, info)
	}
}

/* 
This is a utility class for the PlayingCard shape. This is where you define the shape's behavior, 
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
