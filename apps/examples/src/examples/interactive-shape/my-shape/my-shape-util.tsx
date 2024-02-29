import { BaseBoxShapeUtil, HTMLContainer, ShapeProps, T, TLBaseShape } from '@tldraw/tldraw'

// There's a guide at the bottom of this file!

// [1]
type IMyShape = TLBaseShape<
	'MyShape',
	{
		w: number
		h: number
		checked: boolean
		color: string
	}
>

export class MyShapeUtil extends BaseBoxShapeUtil<IMyShape> {
	// [2]
	static override type = 'MyShape' as const
	static override props: ShapeProps<IMyShape> = {
		w: T.number,
		h: T.number,
		checked: T.boolean,
		color: T.string,
	}

	// [3]
	getDefaultProps(): IMyShape['props'] {
		const pastelColors: string[] = ['#FFD1DC', '#FFEF96', '#D0E6A5', '#A7D7F2', '#C9C9FF']
		const color = pastelColors[Math.floor(Math.random() * pastelColors.length)]
		return {
			w: 230,
			h: 230,
			checked: false,
			color,
		}
	}

	// [4]
	component(shape: IMyShape) {
		return (
			<HTMLContainer
				style={{
					height: shape.props.h,
					width: shape.props.w,
					backgroundColor: shape.props.checked ? 'lightgrey' : shape.props.color,
					borderRadius: 10,
					padding: 20,
					boxShadow: '0 0 5px rgba(0, 0, 0, 0.2)',
					// [a] This is where we allow pointer events on our shape
					pointerEvents: 'all',
				}}
				id={shape.id}
			>
				<div
					style={{
						display: 'flex',
						height: shape.props.h / 5,
						alignItems: 'center',
						position: 'relative',
					}}
				>
					<input
						style={{
							position: 'absolute',
							left: 10,
							height: shape.props.h / 10,
							width: shape.props.h / 10,
						}}
						type="checkbox"
						checked={shape.props.checked}
						onChange={() =>
							this.editor.updateShape<IMyShape>({
								id: shape.id,
								type: 'MyShape',
								props: { checked: !shape.props.checked },
							})
						}
						// [b] This is where we stop event propagation
						onPointerDown={(e) => e.stopPropagation()}
					/>
					{shape.props.checked && (
						<h1
							style={{
								flexGrow: 1,
								textAlign: 'center',
								fontFamily: 'monospace',
								fontSize: shape.props.h / 15,
								fontWeight: 200,
							}}
						>
							done
						</h1>
					)}
				</div>
				<div
					style={{
						height: '100%',
						width: '100%',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
					}}
				>
					<h1 style={{ fontSize: shape.props.h / 10 }}>My Todo</h1>
					<p style={{ fontSize: shape.props.h / 20 }}>Wash the dog</p>
				</div>
			</HTMLContainer>
		)
	}

	// [5]
	indicator(shape: IMyShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

/* 
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
