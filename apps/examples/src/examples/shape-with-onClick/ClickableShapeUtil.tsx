import {
	BaseBoxShapeUtil,
	HTMLContainer,
	RecordProps,
	T,
	TLBaseBoxShape,
	TLShapePartial,
} from 'tldraw'

// There's a guide at the bottom of this file!

const CLICKABLE_SHAPE_TYPE = 'clickable'

// [1]
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[CLICKABLE_SHAPE_TYPE]: { w: number; h: number; count: number }
	}
}

type ClickableShape = TLBaseBoxShape & {
	type: typeof CLICKABLE_SHAPE_TYPE
	props: { count: number }
}

// [2]
export class ClickableShapeUtil extends BaseBoxShapeUtil<ClickableShape> {
	static override type = CLICKABLE_SHAPE_TYPE
	static override props: RecordProps<ClickableShape> = {
		w: T.number,
		h: T.number,
		count: T.number,
	}

	getDefaultProps(): ClickableShape['props'] {
		return {
			w: 200,
			h: 100,
			count: 0,
		}
	}

	override canEdit() {
		return false
	}

	// [3]
	override onClick(shape: ClickableShape): TLShapePartial<ClickableShape> | void {
		return {
			id: shape.id,
			type: shape.type,
			props: {
				count: shape.props.count + 1,
			},
		}
	}

	// [4]
	component(shape: ClickableShape) {
		return (
			<HTMLContainer
				style={{
					backgroundColor: '#f0e6ff',
					border: '2px solid #9b59b6',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: 18,
					fontWeight: 'bold',
					color: '#333',
					pointerEvents: 'all',
				}}
			>
				Clicks: {shape.props.count}
			</HTMLContainer>
		)
	}

	// [5]
	indicator(shape: ClickableShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

/*
This example shows how to use ShapeUtil.onClick to handle clicks on a custom shape.

[1]
Extend TLGlobalShapePropsMap to register the shape's props. We include a `count` prop
that tracks how many times the shape has been clicked.

[2]
Our shape util class. We extend BaseBoxShapeUtil which provides getGeometry (a filled
rectangle from w/h), onResize, and snap geometry for free.

[3]
This is the key part of the example: the onClick handler. When a user clicks this shape,
the editor calls onClick. We return a shape partial that increments the count. The editor
applies this update to the shape automatically.

Note: this is different from using React's onClick on a DOM element inside the component.
ShapeUtil.onClick integrates with the editor's pointer event system, so it works correctly
alongside other interactions like dragging.

[4]
The component renders the click count. We don't add any React event handlers here — the
click handling is done entirely through ShapeUtil.onClick above.

[5]
The indicator is the blue outline shown when the shape is selected.
*/
