import {
	BaseBoxShapeUtil,
	HTMLContainer,
	RecordProps,
	T,
	TLBaseShape,
	TLOnEditEndHandler,
	stopEventPropagation,
} from 'tldraw'

// There's a guide at the bottom of this file!

const ANIMAL_EMOJIS = ['🐶', '🐱', '🐨', '🐮', '🐴']

type IMyEditableShape = TLBaseShape<
	'my-editable-shape',
	{
		w: number
		h: number
		animal: number
	}
>

export class EditableShapeUtil extends BaseBoxShapeUtil<IMyEditableShape> {
	static override type = 'my-editable-shape' as const
	static override props: RecordProps<IMyEditableShape> = {
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

		return (
			<HTMLContainer
				id={shape.id}
				// [b]
				onPointerDown={isEditing ? stopEventPropagation : undefined}
				style={{
					pointerEvents: isEditing ? 'all' : 'none',
					backgroundColor: '#efefef',
					fontSize: 24,
					padding: 16,
				}}
			>
				{ANIMAL_EMOJIS[shape.props.animal]}
				{/* [c] */}
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
					// [d] when not editing...
					<p style={{ fontSize: 12 }}>Double Click to Edit</p>
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
			{ animation: { duration: 250 } }
		)
	}
}

/* 

This is our shape util, which defines how our shape renders and behaves. For 
more information on the shape util, check out the custom shape example.

[1]
We override the canEdit method to allow the shape to enter the editing state.

[2]
We want to conditionally render the component based on whether it is being 
edited or not.

	[a] We can check whether our shape is being edited by comparing the
		editing shape id to the shape's id.
	
	[b] We want to allow pointer events when the shape is being edited,
		and stop event propagation on pointer down. Check out the interactive
		shape example for more information on this.

	[c] We render a button to change the animal emoji when the shape is being
		edited. 
		
	[e]	We also render a message when the shape is not being edited.

[3]
The onEditEnd method is called when the shape exits the editing state. In this
case we rotate the shape 360 degrees.

*/
