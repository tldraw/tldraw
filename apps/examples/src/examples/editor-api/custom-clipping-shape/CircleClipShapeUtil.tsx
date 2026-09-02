import {
	BaseBoxShapeUtil,
	Circle2d,
	Geometry2d,
	PI2,
	RecordProps,
	SVGContainer,
	T,
	TLResizeInfo,
	TLShape,
	Vec,
	atom,
	clamp,
	resizeBox,
	toDomPrecision,
} from 'tldraw'

const CIRCLE_CLIP_TYPE = 'circle-clip'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[CIRCLE_CLIP_TYPE]: {
			w: number
			h: number
		}
	}
}

export type CircleClipShape = TLShape<typeof CIRCLE_CLIP_TYPE>

export const isClippingEnabled$ = atom('isClippingEnabled', true)

const STROKE_WIDTH = 3

// There's a guide at the bottom of this file!

export class CircleClipShapeUtil extends BaseBoxShapeUtil<CircleClipShape> {
	static override type = CIRCLE_CLIP_TYPE
	static override props: RecordProps<CircleClipShape> = {
		w: T.number,
		h: T.number,
	}

	override canBind() {
		return false
	}

	// [1]
	override canReceiveNewChildrenOfType(shape: CircleClipShape) {
		return !shape.isLocked
	}

	override providesBackgroundForChildren(): boolean {
		return true
	}

	override getDefaultProps(): CircleClipShape['props'] {
		return {
			w: 200,
			h: 200,
		}
	}

	override getGeometry(shape: CircleClipShape): Geometry2d {
		const radius = Math.min(shape.props.w, shape.props.h) / 2
		return new Circle2d({
			radius,
			x: shape.props.w / 2 - radius,
			y: shape.props.h / 2 - radius,
			isFilled: true,
		})
	}

	// [2]
	override getClipPath(shape: CircleClipShape): Vec[] | undefined {
		const centerX = shape.props.w / 2
		const centerY = shape.props.h / 2
		const outerRadius = Math.min(shape.props.w, shape.props.h) / 2
		// Inset by half the stroke so children clip to the stroke's inner edge, not its center line.
		const clipRadius = outerRadius - STROKE_WIDTH / 2
		// Roughly one vertex every 8px of circumference.
		const segments = clamp(Math.round((PI2 * clipRadius) / 8), 3, 360)

		const points: Vec[] = []
		for (let i = 0; i < segments; i++) {
			const angle = (i / segments) * Math.PI * 2
			const x = centerX + Math.cos(angle) * clipRadius
			const y = centerY + Math.sin(angle) * clipRadius
			points.push(new Vec(x, y))
		}

		return points
	}

	// [3]
	override shouldClipChild(_child: TLShape): boolean {
		return isClippingEnabled$.get()
	}

	// [4]
	override component(shape: CircleClipShape) {
		const radius = Math.min(shape.props.w, shape.props.h) / 2
		const centerX = shape.props.w / 2
		const centerY = shape.props.h / 2

		const clippingEnabled = isClippingEnabled$.get()

		return (
			<SVGContainer>
				<circle
					cx={toDomPrecision(centerX)}
					cy={toDomPrecision(centerY)}
					r={toDomPrecision(radius)}
					fill={clippingEnabled ? 'rgba(100, 150, 255, 0.1)' : 'rgba(150, 150, 150, 0.1)'}
					stroke={clippingEnabled ? '#4285f4' : '#999'}
					strokeWidth={STROKE_WIDTH}
					strokeDasharray={clippingEnabled ? 'none' : '5,5'}
				/>
				<text
					x={centerX}
					y={centerY + 4}
					textAnchor="middle"
					fontSize="12"
					fill={clippingEnabled ? '#4285f4' : '#999'}
				>
					{clippingEnabled ? '✂️' : '○'}
				</text>
			</SVGContainer>
		)
	}

	override getIndicatorPath(shape: CircleClipShape) {
		const radius = Math.min(shape.props.w, shape.props.h) / 2
		const centerX = shape.props.w / 2
		const centerY = shape.props.h / 2
		const path = new Path2D()
		path.arc(centerX, centerY, radius, 0, Math.PI * 2)
		return path
	}

	override onResize(shape: CircleClipShape, info: TLResizeInfo<CircleClipShape>) {
		return resizeBox(shape, info)
	}
}

/*
[1]
Allow shapes to be dropped into the circle. Dragging a shape over the circle reparents it, at
which point the clip path applies. `providesBackgroundForChildren` makes children's backgrounds
render above this shape rather than behind it.

[2]
`getClipPath` returns a polygon in the shape's local space. The editor transforms it to page
space and intersects it with any ancestor clip paths, so a circle needs to be approximated with
enough vertices to look smooth at the sizes it's used at.

[3]
`shouldClipChild` is only called when `getClipPath` returns a polygon, and lets you exclude some
children (for example arrows, which frames don't clip). Here it reads a module-level atom so a
single toggle turns clipping on and off for every circle at once.

[4]
`component` reads the same atom. Shape components are rendered inside a reactive tracking scope,
so the circle restyles itself when the atom changes without any explicit subscription.
*/
