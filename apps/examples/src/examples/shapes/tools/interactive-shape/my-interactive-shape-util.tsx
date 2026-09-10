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

	getIndicatorPath(shape: IMyInteractiveShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

/*
This is a custom shape, for a more in-depth look at how to create a custom shape,
see our custom shape example.

[1]
This is where we describe how our shape will render

	[a] Shape containers have `pointer-events: none` by default so the canvas receives every
	pointer event. Set it to `all` (or `auto`) to opt in to receiving events on the shape's HTML.

	[b] Stop propagation so the editor doesn't select or start dragging the shape when the
	checkbox is clicked. The canvas container forwards the events it receives on to the editor,
	so stopping them here keeps them from reaching the canvas.

	[c] While the todo is unchecked, the text input handles its own pointer events. Once it's
	checked the input is read-only, so we let the events through to the canvas and the shape
	selects and drags as usual.

*/
