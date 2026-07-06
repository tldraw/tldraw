import { HTMLContainer, Rectangle2d, ShapeUtil, T, TLBaseShape } from 'tldraw'
import { sketchesById } from './registry'
import { renderSketch } from './render-sketch'

/** A canvas shape that renders one sketch instance by id. */
export type SketchShape = TLBaseShape<'sketch', { w: number; h: number; sketchId: string }>

export class SketchShapeUtil extends ShapeUtil<SketchShape> {
	static override type = 'sketch' as const
	static override props = { w: T.number, h: T.number, sketchId: T.string }

	getDefaultProps(): SketchShape['props'] {
		return { w: 260, h: 160, sketchId: '' }
	}

	getGeometry(shape: SketchShape) {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}

	override canResize() {
		return false
	}

	component(shape: SketchShape) {
		const loaded = sketchesById.get(shape.props.sketchId)
		return (
			<HTMLContainer
				style={{
					width: shape.props.w,
					height: shape.props.h,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					background: 'var(--tl-color-panel)',
					border: '1px solid var(--tl-color-divider)',
					borderRadius: 8,
					overflow: 'hidden',
				}}
			>
				{loaded ? renderSketch(loaded) : <span>unknown: {shape.props.sketchId}</span>}
			</HTMLContainer>
		)
	}

	indicator(shape: SketchShape) {
		return <rect width={shape.props.w} height={shape.props.h} rx={8} />
	}
}
