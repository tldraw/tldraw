/* eslint-disable react-hooks/rules-of-hooks */
import {
	HTMLContainer,
	Rectangle2d,
	ShapeProps,
	ShapeUtil,
	T,
	TLBaseShape,
	useIsEditing,
} from '@tldraw/tldraw'
import { useState } from 'react'

// There's a guide at the bottom of this file!

// [1]
type ICatDog = TLBaseShape<
	'catdog',
	{
		w: number
		h: number
	}
>
export class CatDogUtil extends ShapeUtil<ICatDog> {
	// [2]
	static override type = 'catdog' as const
	static override props: ShapeProps<ICatDog> = {
		w: T.number,
		h: T.number,
	}

	// [3]
	override isAspectRatioLocked = (_shape: ICatDog) => false
	override canResize = (_shape: ICatDog) => false
	override canBind = (_shape: ICatDog) => true
	// [4]
	override canEdit = () => true

	// [5]
	getDefaultProps(): ICatDog['props'] {
		return {
			w: 170,
			h: 165,
		}
	}

	// [6]
	getGeometry(shape: ICatDog) {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	// [7]
	component(shape: ICatDog) {
		// [a]
		const isEditing = useIsEditing(shape.id)

		const [animal, setAnimal] = useState<boolean>(true)

		// [b]
		return (
			<HTMLContainer id={shape.id}>
				<div
					style={{
						border: '1px solid black',
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
	indicator(shape: ICatDog) {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const isEditing = useIsEditing(shape.id)
		return <rect stroke={isEditing ? 'red' : 'blue'} width={shape.props.w} height={shape.props.h} />
	}
}

/* 
This is a utility class for the catdog shape. This is where you define the shape's behavior, 
how it renders (its component and indicator), and how it handles different events.

[1]
We define the shape's type and its props. The type is a string that uniquely identifies the
shape. The props are the shape's properties, in this case, the width and height.

[2]
We define the type of the shape. This is a string that uniquely identifies the shape. We also
define the shape's properties. In this case, the width and height.

[3]
We override the isAspectRatioLocked, canResize, and canBind methods. The isAspectRatioLocked
method returns a boolean that determines if the aspect ratio of the shape is locked. The
canResize method returns a boolean that determines if the shape can be resized. The canBind
method returns a boolean that determines if the shape can be bound.

[4]
We override the canEdit method. This method returns a boolean that determines if the shape can
be edited.

[5]
We define the getDefaultProps method. This method returns the default properties of the shape.

[6]
We define the getGeometry method. This method returns the geometry of the shape. In this case,
a Rectangle2d object.

[7]
We define the component method. This method returns the component of the shape. The component
is the visual representation of the shape. In this case, a div with a button and a paragraph
element.

[8]
We define the indicator method. This method returns the indicator of the shape. The indicator is
a visual representation of the shape that is used to indicate that the shape is selected or
focused. In this case, a rectangle.
*/
