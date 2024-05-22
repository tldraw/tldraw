import {
	BaseBoxShapeUtil,
	BoundsSnapGeometry,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	T,
	TLBaseShape,
} from 'tldraw'

// There's a guide at the bottom of this file!

// [1]
type IPlayingCard = TLBaseShape<
	'PlayingCard',
	{
		w: number
		h: number
		suit: string
	}
>

export class PlayingCardUtil extends BaseBoxShapeUtil<IPlayingCard> {
	// [2]
	static override type = 'PlayingCard' as const
	static override props: RecordProps<IPlayingCard> = {
		w: T.number,
		h: T.number,
		suit: T.string,
	}

	// [3]
	override isAspectRatioLocked = (_shape: IPlayingCard) => true

	// [4]
	getDefaultProps(): IPlayingCard['props'] {
		const cardSuitsArray: string[] = ['♠️', '♣️', '♥️', '♦️']
		const randomSuit = cardSuitsArray[Math.floor(Math.random() * cardSuitsArray.length)]
		return {
			w: 270,
			h: 370,
			suit: randomSuit,
		}
	}

	// [5]
	override getBoundsSnapGeometry(shape: IPlayingCard): BoundsSnapGeometry {
		return new Rectangle2d({
			width: shape.props.h / 4.5,
			height: shape.props.h / 4.5,
			isFilled: true,
		})
	}

	// [7]
	component(shape: IPlayingCard) {
		return (
			<HTMLContainer
				style={{
					height: shape.props.h,
					width: shape.props.w,
					backgroundColor: 'white',
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
					{shape.props.suit}
				</span>
				<div style={{ fontSize: shape.props.h / 3 }}>{shape.props.suit}</div>
			</HTMLContainer>
		)
	}

	// [7]
	indicator(shape: IPlayingCard) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

/* 
This is a utility class for the PlayingCard shape. This is where you define the shape's behavior, 
how it renders (its component and indicator), and how it handles different events. The most relevant
part of the code to custom snapping can be found in [6].

[1]
This is where we define the shape's type for Typescript. We can extend the TLBaseShape type,
providing a unique string to identify the shape and the shape's props. We only need height
and width for this shape.

[2]
We define the shape's type and props for the editor. We can use tldraw's validator library to
make sure that the store always has shape data we can trust. In this case, we define the width 
and height properties as numbers and assign a validator from tldraw's library to them.

[3]
We're going to lock the aspect ratio of this shape.

[4]
getDefaultProps determines what our shape looks like when click-creating one. In this case, we
want the shape to be 270x370 pixels and generate a suit for the card at random.

[5]
This is the important part for custom snapping. We define the getBoundsSnapGeometry method. This
method returns the geometry that the shape will snap to. In this case, we want the shape to snap
to a rectangle in the top left that contains the suit of the card. We can use the Rectangle2d helper
again here and set it to the same width and height as the span containing the suit which is defined
in [6].

[6]
We define the component method. This controls what the shape looks like and it returns JSX. It
generates a random suit for the card and returns a div with the suit in the center and a span with
the suit in the top left. The HTMLContainer component is a helpful wrapper that the tldraw library
exports, it's a div that comes with a css class.

[7]
The indicator is the blue box that appears around the shape when it's selected. We're just returning
a rectangle with the same width and height as the shape here.


*/
