import { BaseBoxShapeUtil, HTMLContainer, RecordProps, T, TLShape, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1] Define the shape type
const GLOW_SHAPE_TYPE = 'glow-shape'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[GLOW_SHAPE_TYPE]: { w: number; h: number; preventCulling: boolean }
	}
}

type GlowShape = TLShape<typeof GLOW_SHAPE_TYPE>

// [2] Create the shape util
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

	// [3] Conditional culling based on shape props
	override canCull(shape: GlowShape) {
		return !shape.props.preventCulling
	}

	// [4] Both shapes always have glow - the checkbox controls culling behavior
	component(shape: GlowShape) {
		return (
			<HTMLContainer
				style={{
					width: shape.props.w,
					height: shape.props.h,
					backgroundColor: '#2f80ed',
					borderRadius: 8,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					boxShadow: '0 0 80px 50px rgba(47, 128, 237, 0.8)',
					pointerEvents: 'all',
				}}
			>
				<label
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 8,
						color: 'white',
						fontWeight: 'bold',
						fontSize: 13,
						cursor: 'pointer',
					}}
				>
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
						style={{ width: 16, height: 16, cursor: 'pointer' }}
					/>
					Prevent culling
				</label>
			</HTMLContainer>
		)
	}

	indicator(shape: GlowShape) {
		return <rect width={shape.props.w} height={shape.props.h} rx={8} />
	}
}

const shapeUtils = [GlowShapeUtil]

// [5]
export default function ConditionalCullingExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				onMount={(editor) => {
					// Create two shapes stacked vertically - easier to pan horizontally
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
This example demonstrates conditional culling - where some shapes can be culled
(hidden when off-screen) and others cannot, based on their properties.

Why is this useful?

Shapes with visual effects that extend beyond their bounds (like shadows, glows,
or other overflow effects) can appear to "pop" abruptly when scrolled on/off screen
if culling is enabled. By returning false from canCull(), the shape remains rendered
even when its bounds are outside the viewport, preventing this visual artifact.

[1] Define a shape type with a `preventCulling` property.

[2] Create a ShapeUtil that extends BaseBoxShapeUtil for simple rectangular shapes.

[3] Override canCull() to return false when preventCulling is true.

[4] Both shapes have the same glow effect. The checkbox controls culling behavior,
    not the visual appearance - this makes it easy to compare the two behaviors.

[5] Create two shapes stacked vertically. Pan the canvas horizontally to move them off-screen:
    - The shape with "Prevent culling" checked stays visible (glow doesn't pop)
    - The shape without it checked disappears abruptly at the viewport edge

Performance note: Disabling culling means the shape is always rendered, even when
off-screen. Use this sparingly for shapes that truly need it (overflow effects).
*/
