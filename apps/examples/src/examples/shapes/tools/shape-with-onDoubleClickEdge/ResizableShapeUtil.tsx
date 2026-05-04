import {
	BaseBoxShapeUtil,
	HTMLContainer,
	RecordProps,
	T,
	TLBaseBoxShape,
	TLShapePartial,
} from 'tldraw'

// There's a guide at the bottom of this file!

const RESIZABLE_SHAPE_TYPE = 'resizable'

// [1]
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[RESIZABLE_SHAPE_TYPE]: { w: number; h: number }
	}
}

type ResizableShape = TLBaseBoxShape & {
	type: typeof RESIZABLE_SHAPE_TYPE
}

export class ResizableShapeUtil extends BaseBoxShapeUtil<ResizableShape> {
	static override type = RESIZABLE_SHAPE_TYPE
	static override props: RecordProps<ResizableShape> = {
		w: T.number,
		h: T.number,
	}

	getDefaultProps(): ResizableShape['props'] {
		return {
			w: 400,
			h: 320,
		}
	}

	override canEdit() {
		return false
	}

	// [2]
	override onDoubleClickEdge(shape: ResizableShape): TLShapePartial<ResizableShape> | void {
		const isAtSmallSize = shape.props.w === 200 && shape.props.h === 200
		return {
			id: shape.id,
			type: shape.type,
			props: isAtSmallSize ? { w: 400, h: 320 } : { w: 200, h: 200 },
		}
	}

	component(shape: ResizableShape) {
		return (
			<HTMLContainer
				style={{
					backgroundColor: '#e6f0ff',
					border: '2px solid #3b82f6',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: 16,
					fontWeight: 'bold',
					color: '#1e3a8a',
					textAlign: 'center',
					padding: 8,
				}}
			>
				{shape.props.w} × {shape.props.h}
			</HTMLContainer>
		)
	}

	getIndicatorPath(shape: ResizableShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

/*
This example shows how to use ShapeUtil.onDoubleClickEdge to handle double-clicks
on a shape's resize edge.

[1]
Extend TLGlobalShapePropsMap to register the shape's props. We just need width
and height for this example.

[2]
The onDoubleClickEdge handler runs when the user double-clicks one of the
shape's resize edges (top, right, bottom, left). We return a shape partial that
toggles the shape between two preset sizes: if the shape is currently 200×200
we expand it to 400×320, otherwise we reset it to 200×200. The editor applies
the returned partial automatically.
*/
