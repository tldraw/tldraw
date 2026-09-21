import { BaseBoxShapeUtil, HTMLContainer, RecordProps, T, TLShape, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import './conditional-culling.css'

// There's a guide at the bottom of this file!

const GLOW_SHAPE_TYPE = 'glow-shape'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[GLOW_SHAPE_TYPE]: { w: number; h: number; preventCulling: boolean }
	}
}

type GlowShape = TLShape<typeof GLOW_SHAPE_TYPE>

class GlowShapeUtil extends BaseBoxShapeUtil<GlowShape> {
	static override type = GLOW_SHAPE_TYPE
	static override props: RecordProps<GlowShape> = {
		w: T.number,
		h: T.number,
		preventCulling: T.boolean,
	}

	getDefaultProps(): GlowShape['props'] {
		return {
			w: 150,
			h: 100,
			preventCulling: false,
		}
	}

	// [1]
	override canCull(shape: GlowShape) {
		return !shape.props.preventCulling
	}

	// [2]
	component(shape: GlowShape) {
		return (
			<HTMLContainer className="glow-shape">
				<label>
					<input
						type="checkbox"
						checked={shape.props.preventCulling}
						onChange={() =>
							this.editor.updateShape({
								id: shape.id,
								type: GLOW_SHAPE_TYPE,
								props: { preventCulling: !shape.props.preventCulling },
							})
						}
						onPointerDown={(e) => e.stopPropagation()}
					/>
					Prevent culling
				</label>
			</HTMLContainer>
		)
	}

	getIndicatorPath(shape: GlowShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

const shapeUtils = [GlowShapeUtil]

export default function ConditionalCullingExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				onMount={(editor) => {
					// [3]
					editor.createShape({
						type: GLOW_SHAPE_TYPE,
						x: 200,
						y: 100,
						props: { preventCulling: true },
					})
					editor.createShape({
						type: GLOW_SHAPE_TYPE,
						x: 200,
						y: 350,
						props: { preventCulling: false },
					})
				}}
			/>
		</div>
	)
}

/*
Culling hides a shape (`display: none`) once its bounds leave the viewport. Shapes whose visuals
extend past their bounds (glows, drop shadows, other overflow) pop in and out at the viewport
edge when that happens. Returning false from `canCull()` keeps the shape visible off-screen.

[1]
`canCull()` is called per shape, so the decision can depend on the shape's own props (or any
other state). Here a checkbox on the shape flips it.

[2]
Both shapes render the same glow; only the checkbox differs. Stopping pointer-down propagation
lets the checkbox receive the click instead of the select tool starting a drag.

[3]
Two shapes stacked vertically so you can pan sideways and watch both leave the viewport at once.
The one with "Prevent culling" checked keeps its glow visible past the edge; the other vanishes
as soon as its bounds are off-screen.

Culled shapes skip layout and paint, so only opt out of culling for shapes that genuinely
need it.
*/
