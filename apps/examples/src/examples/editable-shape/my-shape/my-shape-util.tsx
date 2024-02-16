import {
	DefaultColorStyle,
	HTMLContainer,
	Rectangle2d,
	ShapeProps,
	ShapeUtil,
	T,
	TLBaseShape,
	TLDefaultColorStyle,
	TLOnResizeHandler,
	useIsEditing,
} from '@tldraw/tldraw'
import { useState } from 'react'

// There's a guide at the bottom of this file!

type IMyShape = TLBaseShape<
	'card',
	{
		w: number
		h: number
		color: TLDefaultColorStyle
	}
>

export const myShapeProps: ShapeProps<IMyShape> = {
	w: T.number,
	h: T.number,
	color: DefaultColorStyle,
}

export class MyShapeUtil extends ShapeUtil<IMyShape> {
	static override type = 'myshape' as const
	// [1]
	static override props = myShapeProps
	// [2]
	// [3]
	override isAspectRatioLocked = (_shape: IMyShape) => false
	override canResize = (_shape: IMyShape) => true
	override canBind = (_shape: IMyShape) => true

	override canEdit = () => true

	// [4]
	getDefaultProps(): IMyShape['props'] {
		return {
			w: 170,
			h: 170,
			color: 'black',
		}
	}

	// [5]
	getGeometry(shape: IMyShape) {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	// [6]
	component(shape: IMyShape) {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const isEditing = useIsEditing(shape.id)
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const [animal, setAnimal] = useState<boolean>(true)
		//[a]

		return (
			<HTMLContainer
				id={shape.id}
				style={{
					border: '1px solid black',
					display: 'flex',
					borderRadius: '50%',
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
						left: 40,
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
			</HTMLContainer>
		)
	}

	// [7]
	indicator(shape: IMyShape) {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const isEditing = useIsEditing(shape.id)
		return <rect stroke={isEditing ? 'red' : 'blue'} width={shape.props.w} height={shape.props.h} />
	}

	// [8]
	override onResize: TLOnResizeHandler<IMyShape> = (shape, info) => {
		return shape
	}
}

/* 
A utility class for the myshape shape. This is where you define the shape's behavior, 
how it renders (its component and indicator), and how it handles different events.

[1]
A validation schema for the shape's props (optional)
Check out myshape-shape-props.ts for more info.

[2]
Migrations for upgrading shapes (optional)
Check out e-shape-migrations.ts for more info.

[3]
Letting the editor know if the shape's aspect ratio is locked, and whether it 
can be resized or bound to other shapes. 

[4]
The default props the shape will be rendered with when click-creating one.

[5]
We use this to calculate the shape's geometry for hit-testing, bindings and
doing other geometric calculations. 

[6]
Render method — the React component that will be rendered for the shape. It takes the 
shape as an argument. HTMLContainer is just a div that's being used to wrap our text 
and button. We can get the shape's bounds using our own getGeometry method.
	
- [a] Check it out! We can do normal React stuff here like using setState.
   Annoying: eslint sometimes thinks this is a class component, but it's not.

- [b] You need to stop the pointer down event on buttons, otherwise the editor will
	   think you're trying to select drag the shape.

[7]
Indicator — used when hovering over a shape or when it's selected; must return only SVG elements here

[8]
Resize handler — called when the shape is resized. Sometimes you'll want to do some 
custom logic here, but for our purposes, this is fine.
*/
