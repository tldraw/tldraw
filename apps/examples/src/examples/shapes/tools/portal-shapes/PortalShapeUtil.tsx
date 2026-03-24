import {
	BaseBoxShapeUtil,
	Ellipse2d,
	Geometry2d,
	Group2d,
	RecordProps,
	SVGContainer,
	T,
	TLDragShapesInInfo,
	TLDragShapesOutInfo,
	TLDropShapesOverInfo,
	TLResizeInfo,
	TLShape,
	resizeBox,
	toDomPrecision,
} from 'tldraw'

const PORTAL_SHAPE_TYPE = 'portal'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[PORTAL_SHAPE_TYPE]: {
			w: number
			h: number
			color: 'blue' | 'orange'
		}
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

export class PortalShapeUtil extends BaseBoxShapeUtil<PortalShape> {
	static override type = PORTAL_SHAPE_TYPE
	static override props: RecordProps<PortalShape> = {
		w: T.number,
		h: T.number,
		color: T.literalEnum('blue', 'orange'),
	}

	override getDefaultProps(): PortalShape['props'] {
		return { w: 250, h: 300, color: 'blue' }
	}

	override isFrameLike(): boolean {
		return true
	}

	override canReceiveNewChildrenOfType(shape: TLShape) {
		return !shape.isLocked
	}

	override canResize() {
		return true
	}

	override providesBackgroundForChildren(): boolean {
		return true
	}

	override getClipPath(shape: PortalShape) {
		return this.editor.getShapeGeometry(shape.id).vertices
	}

	override getGeometry(shape: PortalShape): Geometry2d {
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

	override onResize(shape: PortalShape, info: TLResizeInfo<PortalShape>) {
		return resizeBox(shape, info)
	}

	private findLinkedPortal(shape: PortalShape): PortalShape | undefined {
		const otherColor = shape.props.color === 'blue' ? 'orange' : 'blue'
		const allShapes = this.editor.getCurrentPageShapes()
		return allShapes.find(
			(s): s is PortalShape =>
				s.type === PORTAL_SHAPE_TYPE && (s as PortalShape).props.color === otherColor
		)
	}

	override onDragShapesIn(shape: PortalShape, shapes: TLShape[], _info: TLDragShapesInInfo) {
		if (shapes.every((s) => s.parentId === shape.id)) return
		if (shapes.some((s) => this.editor.hasAncestor(shape, s.id))) return
		this.editor.reparentShapes(shapes, shape.id)
	}

	override onDragShapesOut(
		shape: PortalShape,
		draggingShapes: TLShape[],
		info: TLDragShapesOutInfo
	): void {
		if (!info.nextDraggingOverShapeId) {
			this.editor.reparentShapes(
				draggingShapes.filter((s) => s.parentId === shape.id && !s.isLocked),
				this.editor.getCurrentPageId()
			)
		}
	}

	// On drop, teleport: move shapes from this portal to the linked one.
	override onDropShapesOver(shape: PortalShape, shapes: TLShape[], _info: TLDropShapesOverInfo) {
		const linked = this.findLinkedPortal(shape)
		if (!linked) return

		const { editor } = this

		// First, ensure all dropped shapes are children of this portal so we
		// have consistent local coordinates. Shapes dragged in during the drag
		// are already parented here; shapes dropped directly may not be.
		const needsReparent = shapes.filter((s) => s.parentId !== shape.id)
		if (needsReparent.length > 0) {
			editor.reparentShapes(needsReparent, shape.id)
		}

		// Re-read shapes after reparenting so local coords are up to date.
		const freshShapes = shapes.map((s) => editor.getShape(s.id)!).filter(Boolean)

		// Stash each shape's local position inside this portal, then
		// reparent to the linked portal and restore the same local offset.
		const localPositions = new Map<TLShape['id'], { x: number; y: number }>()
		for (const s of freshShapes) {
			localPositions.set(s.id, { x: s.x, y: s.y })
		}

		editor.reparentShapes(
			freshShapes.map((s) => s.id),
			linked.id
		)

		for (const s of freshShapes) {
			const pos = localPositions.get(s.id)!
			const current = editor.getShape(s.id)!
			editor.updateShape({ ...current, x: pos.x, y: pos.y })
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

	override indicator(shape: PortalShape) {
		const cx = shape.props.w / 2
		const cy = shape.props.h / 2
		return (
			<ellipse
				cx={toDomPrecision(cx)}
				cy={toDomPrecision(cy)}
				rx={toDomPrecision(shape.props.w / 2)}
				ry={toDomPrecision(shape.props.h / 2)}
			/>
		)
	}
}
