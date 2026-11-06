import { BaseBoxShapeUtil, HTMLContainer, RecordProps, T, TLShape } from 'tldraw'

// A plugin shape type. The rules know it only by its `type`, like any built-in shape.

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		stamp: { w: number; h: number }
	}
}

export type StampShape = TLShape<'stamp'>

export const stampProps: RecordProps<StampShape> = { w: T.number, h: T.number }

export class StampShapeUtil extends BaseBoxShapeUtil<StampShape> {
	static override type = 'stamp' as const
	static override props = stampProps

	getDefaultProps(): StampShape['props'] {
		return { w: 64, h: 64 }
	}

	component(shape: StampShape) {
		return (
			<HTMLContainer className="permissions-stamp" style={{ fontSize: shape.props.h * 0.8 }}>
				⭐
			</HTMLContainer>
		)
	}

	getIndicatorPath(shape: StampShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}
