import {
	BaseFrameLikeShapeUtil,
	Ellipse2d,
	Group2d,
	RecordProps,
	SVGContainer,
	T,
	TLShape,
	TLShapePartial,
	toDomPrecision,
	toRichText,
} from 'tldraw'

// There's a guide at the bottom of this file!

const PORTAL_SHAPE_TYPE = 'portal'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[PORTAL_SHAPE_TYPE]: { w: number; h: number; color: 'blue' | 'orange' }
	}
}

export type PortalShape = TLShape<typeof PORTAL_SHAPE_TYPE>

const COLORS = {
	blue: {
		fill: 'rgba(60, 130, 246, 0.08)',
		stroke: '#3b82f6',
		glow: 'rgba(59, 130, 246, 0.4)',
	},
	orange: {
		fill: 'rgba(249, 115, 22, 0.08)',
		stroke: '#f97316',
		glow: 'rgba(249, 115, 22, 0.4)',
	},
} as const

let teleportCount = 0

// [1]
export class PortalShapeUtil extends BaseFrameLikeShapeUtil<PortalShape> {
	static override type = PORTAL_SHAPE_TYPE
	static override props: RecordProps<PortalShape> = {
		w: T.number,
		h: T.number,
		color: T.literalEnum('blue', 'orange'),
	}

	override getDefaultProps(): PortalShape['props'] {
		return { w: 250, h: 300, color: 'blue' }
	}

	// [2]
	override getGeometry(shape: PortalShape) {
		return new Group2d({
			children: [
				new Ellipse2d({
					width: shape.props.w,
					height: shape.props.h,
					isFilled: true,
				}),
			],
		})
	}

	private findLinkedPortal(shape: PortalShape): PortalShape | undefined {
		const otherColor = shape.props.color === 'blue' ? 'orange' : 'blue'
		return this.editor
			.getCurrentPageShapes()
			.find(
				(s): s is PortalShape =>
					this.editor.isShapeOfType(s, PORTAL_SHAPE_TYPE) && s.props.color === otherColor
			)
	}

	// [3]
	override onDropShapesOver(shape: PortalShape, shapes: TLShape[]) {
		const linked = this.findLinkedPortal(shape)
		if (!linked) return

		const { editor } = this

		// Shapes dragged in during the drag are already children of this portal (via
		// onDragShapesIn), but shapes dropped directly may not be. Reparent first so every
		// shape's x/y is a local offset inside this portal.
		editor.reparentShapes(
			shapes.filter((s) => s.parentId !== shape.id),
			shape.id
		)

		// Reparenting to the linked portal keeps the shapes' page positions, so restore the
		// local offsets they had in this portal to make them appear at the same spot in the other.
		const localPositions = shapes.map((s) => {
			const fresh = editor.getShape(s.id)!
			return { id: s.id, type: s.type, x: fresh.x, y: fresh.y } as TLShapePartial
		})

		editor.reparentShapes(shapes, linked.id)
		editor.updateShapes(localPositions)

		teleportCount++
		if (teleportCount === 3) {
			editor.createShape({
				type: 'text',
				x: linked.x + linked.props.w + 40,
				y: linked.y + linked.props.h / 2 - 20,
				props: { size: 'xl', richText: toRichText('🍰') },
			})
		}
	}

	override component(shape: PortalShape) {
		const theme = COLORS[shape.props.color]
		const cx = shape.props.w / 2
		const cy = shape.props.h / 2
		const rx = shape.props.w / 2
		const ry = shape.props.h / 2

		return (
			<SVGContainer>
				<ellipse
					cx={toDomPrecision(cx)}
					cy={toDomPrecision(cy)}
					rx={toDomPrecision(rx)}
					ry={toDomPrecision(ry)}
					fill={theme.fill}
					stroke={theme.stroke}
					strokeWidth={3}
					style={{ filter: `drop-shadow(0 0 12px ${theme.glow})` }}
				/>
			</SVGContainer>
		)
	}

	override getIndicatorPath(shape: PortalShape) {
		const path = new Path2D()
		path.ellipse(
			shape.props.w / 2,
			shape.props.h / 2,
			shape.props.w / 2,
			shape.props.h / 2,
			0,
			0,
			Math.PI * 2
		)
		return path
	}
}

/*
[1]
`BaseFrameLikeShapeUtil` gives a box shape the full frame behavior for free: it clips its
children, accepts dropped shapes (`onDragShapesIn` reparents them into the shape), releases
them when dragged out, and requires a full brush selection. Override only what should differ.

[2]
The base class clips children to the shape geometry's vertices, so returning an ellipse here
makes the portal clip in an oval without any extra work. Frame-like shapes must return a
`Group2d` (the editor's hit testing walks its `children`), so the ellipse is wrapped in one.

[3]
`onDropShapesOver` fires when the user releases shapes over this shape. By this point the base
class has usually already reparented them in; we reparent them again into the linked portal
and restore their local offsets so they appear at the same spot on the other side.
*/
