import { BaseBoxShapeUtil, HTMLContainer, RecordProps, T, TLShape } from 'tldraw'

// There's a guide at the bottom of this file!

const MY_EDITABLE_SHAPE_TYPE = 'my-editable-shape'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[MY_EDITABLE_SHAPE_TYPE]: {
			w: number
			h: number
			animal: number
		}
	}
}

const ANIMAL_EMOJIS = ['🐶', '🐱', '🐨', '🐮', '🐴']

export type IMyEditableShape = TLShape<typeof MY_EDITABLE_SHAPE_TYPE>

export class EditableShapeUtil extends BaseBoxShapeUtil<IMyEditableShape> {
	static override type = MY_EDITABLE_SHAPE_TYPE
	static override props: RecordProps<IMyEditableShape> = {
		w: T.number,
		h: T.number,
		animal: T.number,
	}

	// [1]
	override canEdit(shape: IMyEditableShape) {
		return true
	}

	// [1b]
	override canEditWhileLocked(shape: IMyEditableShape) {
		return true
	}

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
				onPointerDown={isEditing ? this.editor.markEventAsHandled : undefined}
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
					<p style={{ fontSize: 12 }}>Double click to edit</p>
				)}
			</HTMLContainer>
		)
	}

	getIndicatorPath(shape: IMyEditableShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}

	// [3]
	override onEditEnd(shape: IMyEditableShape) {
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

	[1b] canEditWhileLocked allows the shape to be edited even when it is locked.
		This is useful for shapes that should stay put but remain interactive.

[2]
The component renders differently depending on whether the shape is being edited.

	[a] Reading `getEditingShapeId()` inside the component is reactive, so the
		shape re-renders when it enters or leaves the editing state.

	[b] While editing, we turn on pointer events and mark pointer-down events as
		handled with `editor.markEventAsHandled` so the editor doesn't start a
		drag or selection when the user clicks the button. Check out the
		interactive shape example for more on this.

	[c] The button cycles through the emojis with `editor.updateShape`.

	[d] When not editing, we show a hint instead of the button.

[3]
The onEditEnd method is called when the shape exits the editing state. In this
case we spin the shape 360 degrees with `animateShape`.
*/
