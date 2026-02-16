import { BaseBoxShapeUtil, HTMLContainer, RecordProps, T, TLShape } from 'tldraw'

// There's a guide at the bottom of this file!

const MY_INTERACTIVE_SHAPE_TYPE = 'my-interactive-shape'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[MY_INTERACTIVE_SHAPE_TYPE]: { w: number; h: number; checked: boolean; text: string }
	}
}

export type IMyInteractiveShape = TLShape<typeof MY_INTERACTIVE_SHAPE_TYPE>

export class myInteractiveShape extends BaseBoxShapeUtil<IMyInteractiveShape> {
	static override type = MY_INTERACTIVE_SHAPE_TYPE
	static override props: RecordProps<IMyInteractiveShape> = {
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

	// [1]
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
						this.editor.updateShape({
							id: shape.id,
							type: MY_INTERACTIVE_SHAPE_TYPE,
							props: { checked: !shape.props.checked },
						})
					}
					// [b] This is where we stop event propagation
					onPointerDown={(e) => e.stopPropagation()}
					onTouchStart={(e) => e.stopPropagation()}
					onTouchEnd={(e) => e.stopPropagation()}
				/>
				<input
					type="text"
					placeholder="Enter a todo..."
					readOnly={shape.props.checked}
					value={shape.props.text}
					onChange={(e) =>
						this.editor.updateShape({
							id: shape.id,
							type: MY_INTERACTIVE_SHAPE_TYPE,
							props: { text: e.currentTarget.value },
						})
					}
					// [c]
					onPointerDown={(e) => {
						if (!shape.props.checked) {
							e.stopPropagation()
						}
					}}
					onTouchStart={(e) => {
						if (!shape.props.checked) {
							e.stopPropagation()
						}
					}}
					onTouchEnd={(e) => {
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
This is a custom shape, for a more in-depth look at how to create a custom shape,
see our custom shape example.

[1]
This is where we describe how our shape will render

	[a] We need to set pointer-events to all so that we can interact with our shape. This CSS property is
	set to "none" off by default. We need to manually opt-in to accepting pointer events by setting it to
	'all' or 'auto'.

	[b] We need to stop event propagation so that the editor doesn't select the shape
		when we click on the checkbox. The 'canvas container' forwards events that it receives
		on to the editor, so stopping propagation here prevents the event from reaching the canvas.

	[c] If the shape is not checked, we stop event propagation so that the editor doesn't
		select the shape when we click on the input. If the shape is checked then we allow that event to
		propagate to the canvas and then get sent to the editor, triggering clicks or drags as usual.

*/
