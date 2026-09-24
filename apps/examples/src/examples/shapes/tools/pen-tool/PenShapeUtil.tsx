import {
	Circle2d,
	CubicBezier2d,
	DefaultColorStyle,
	DefaultFillStyle,
	DefaultSizeStyle,
	type Editor,
	track,
	useUniqueSafeId,
	getColorValue,
	getIndicesAbove,
	PathBuilder,
	ShapeHandleOverlayUtil,
	ShapeUtil,
	SVGContainer,
	T,
	type RecordProps,
	type SvgExportContext,
	type TLDefaultColorStyle,
	type TLDefaultFillStyle,
	type TLDefaultSizeStyle,
	type TLHandle,
	type TLResizeInfo,
	type TLShape,
	type VecModel,
	Vec,
	vecModelValidator,
	ZERO_INDEX_KEY,
} from 'tldraw'

// [1]
export interface PenPoint {
	point: VecModel
	in: VecModel
	out: VecModel
	smooth: boolean
}

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		'pen-path': {
			points: PenPoint[]
			closed: boolean
			color: TLDefaultColorStyle
			fill: TLDefaultFillStyle
			size: TLDefaultSizeStyle
		}
	}
}

export type PenShape = TLShape<'pen-path'>

export function corner(point: VecModel): PenPoint {
	return { point, in: { x: 0, y: 0 }, out: { x: 0, y: 0 }, smooth: false }
}

export function getPenPath({ props: { points, closed, fill } }: PenShape) {
	const path = new PathBuilder()
	path.moveTo(points[0].point.x, points[0].point.y, {
		geometry: { isFilled: closed && fill !== 'none' },
	})
	for (let i = 0; i < points.length - (closed ? 0 : 1); i++) {
		const a = points[i]
		const b = points[(i + 1) % points.length]
		const cp1 = Vec.Add(a.point, a.out)
		const cp2 = Vec.Add(b.point, b.in)
		path.cubicBezierTo(b.point.x, b.point.y, cp1.x, cp1.y, cp2.x, cp2.y)
	}
	if (closed) path.close()
	return path
}

// [2]
export function insertPenPoint(shape: PenShape, position: VecModel, margin: number) {
	const points = [...shape.props.points]
	if (points.some((p) => Vec.Dist(p.point, position) < margin)) return
	let closest: { index: number; t: number; distance: number } | undefined
	for (let i = 0; i < points.length - (shape.props.closed ? 0 : 1); i++) {
		const a = points[i]
		const b = points[(i + 1) % points.length]
		const curve = new CubicBezier2d({
			start: Vec.From(a.point),
			cp1: Vec.Add(a.point, a.out),
			cp2: Vec.Add(b.point, b.in),
			end: Vec.From(b.point),
		})
		let t = 0
		let distance = Infinity
		for (let sample = 0; sample <= 32; sample++) {
			const d = Vec.Dist(CubicBezier2d.GetAtT(curve, sample / 32), position)
			if (d < distance) {
				t = sample / 32
				distance = d
			}
		}
		let lo = Math.max(0, t - 1 / 32)
		let hi = Math.min(1, t + 1 / 32)
		for (let step = 0; step < 16; step++) {
			const left = lo + (hi - lo) / 3
			const right = hi - (hi - lo) / 3
			if (
				Vec.Dist(CubicBezier2d.GetAtT(curve, left), position) <
				Vec.Dist(CubicBezier2d.GetAtT(curve, right), position)
			) {
				hi = right
			} else {
				lo = left
			}
		}
		t = (lo + hi) / 2
		distance = Vec.Dist(CubicBezier2d.GetAtT(curve, t), position)
		if (distance < margin && (!closest || distance < closest.distance)) {
			closest = { index: i, t, distance }
		}
	}
	if (!closest) return
	const { index, t } = closest
	const next = (index + 1) % points.length
	const a = points[index]
	const b = points[next]
	const cp1 = Vec.Add(a.point, a.out)
	const cp2 = Vec.Add(b.point, b.in)
	const ab = Vec.Lrp(a.point, cp1, t)
	const bc = Vec.Lrp(cp1, cp2, t)
	const cd = Vec.Lrp(cp2, b.point, t)
	const abc = Vec.Lrp(ab, bc, t)
	const bcd = Vec.Lrp(bc, cd, t)
	const point = Vec.Lrp(abc, bcd, t)
	points[index] = { ...a, out: Vec.Sub(ab, a.point).toJson() }
	points[next] = { ...b, in: Vec.Sub(cd, b.point).toJson() }
	points.splice(index + 1, 0, {
		point: point.toJson(),
		in: Vec.Sub(abc, point).toJson(),
		out: Vec.Sub(bcd, point).toJson(),
		smooth: true,
	})
	return points
}

export class PenShapeUtil extends ShapeUtil<PenShape> {
	static override type = 'pen-path' as const
	static override props: RecordProps<PenShape> = {
		points: T.arrayOf(
			T.object({
				point: vecModelValidator,
				in: vecModelValidator,
				out: vecModelValidator,
				smooth: T.boolean,
			})
		),
		closed: T.boolean,
		color: DefaultColorStyle,
		fill: DefaultFillStyle,
		size: DefaultSizeStyle,
	}

	getDefaultProps(): PenShape['props'] {
		return {
			points: [corner({ x: 0, y: 0 })],
			closed: false,
			color: 'black',
			fill: 'solid',
			size: 'm',
		}
	}

	getGeometry(shape: PenShape) {
		if (shape.props.points.length < 2) {
			const { x, y } = shape.props.points[0].point
			return new Circle2d({ x: x - 1, y: y - 1, radius: 1, isFilled: true })
		}
		return getPenPath(shape).toGeometry()
	}

	override onDoubleClick(shape: PenShape) {
		if (!this.editor.isShapeOrAncestorLocked(shape)) {
			this.editor.select(shape.id).setCurrentTool('pen.editing', { shapeId: shape.id })
		}
		return { id: shape.id, type: shape.type }
	}

	override onDoubleClickEdge(shape: PenShape) {
		return this.onDoubleClick(shape)
	}
	override onDoubleClickCorner(shape: PenShape) {
		return this.onDoubleClick(shape)
	}

	override hideSelectionBoundsFg() {
		return this.editor.isIn('pen')
	}
	override hideSelectionBoundsBg() {
		return this.editor.isIn('pen')
	}

	override getHandles(shape: PenShape): TLHandle[] {
		const indices = getIndicesAbove(ZERO_INDEX_KEY, shape.props.points.length * 3)
		return shape.props.points.flatMap((node, i) => {
			const handles: TLHandle[] = [
				{ ...node.point, id: `${i}:point`, type: 'vertex', index: indices[i * 3] },
			]
			for (const [j, part] of (['in', 'out'] as const).entries()) {
				if (Vec.Len(node[part]) < 0.01) continue
				handles.push({
					...Vec.Add(node.point, node[part]).toJson(),
					id: `${i}:${part}`,
					type: 'vertex',
					index: indices[i * 3 + j + 1],
				})
			}
			return handles
		})
	}

	override onResize(shape: PenShape, { scaleX, scaleY }: TLResizeInfo<PenShape>) {
		const scale = (p: VecModel) => ({ x: p.x * scaleX, y: p.y * scaleY })
		return {
			props: {
				points: shape.props.points.map((p) => ({
					...p,
					point: scale(p.point),
					in: scale(p.in),
					out: scale(p.out),
				})),
			},
		}
	}

	component(shape: PenShape) {
		const zoom = this.editor.getZoomLevel()
		const editing = this.editor.isIn('pen') && this.editor.getOnlySelectedShapeId() === shape.id
		let preview: string | undefined
		if (editing && this.editor.isIn('pen.drawing') && !this.editor.inputs.getIsPointing()) {
			const last = shape.props.points[shape.props.points.length - 1]
			const point = this.editor.getPointInShapeSpace(
				shape,
				this.editor.inputs.getCurrentPagePoint()
			)
			preview = `M ${Vec.From(last.point)} C ${Vec.Add(last.point, last.out)} ${point} ${point}`
		}
		return (
			<SVGContainer>
				<PenPath shape={shape} editor={this.editor} />
				{preview && (
					<path
						d={preview}
						fill="none"
						stroke="var(--tl-color-selected)"
						strokeWidth={1 / zoom}
						strokeDasharray={`${4 / zoom} ${4 / zoom}`}
					/>
				)}
				{editing &&
					shape.props.points.map((p, i) => (
						<path
							key={i}
							d={`M ${Vec.Add(p.point, p.in)} L ${Vec.From(p.point)} L ${Vec.Add(p.point, p.out)}`}
							fill="none"
							stroke="var(--tl-color-selected)"
							strokeWidth={1 / zoom}
							strokeDasharray={`${3 / zoom} ${3 / zoom}`}
						/>
					))}
			</SVGContainer>
		)
	}

	getIndicatorPath(shape: PenShape) {
		return new Path2D(getPenPath(shape).toD())
	}

	override toSvg(shape: PenShape, ctx: SvgExportContext) {
		return <PenPath shape={shape} editor={this.editor} colorMode={ctx.colorMode} />
	}
}

const PenPath = track(function PenPath({
	shape,
	editor,
	colorMode = editor.getColorMode(),
}: {
	shape: PenShape
	editor: Editor
	colorMode?: SvgExportContext['colorMode']
}) {
	const { color, fill, closed, size } = shape.props
	const theme = editor.getCurrentTheme()
	const colors = theme.colors[colorMode]
	const stroke = getColorValue(colors, color, 'solid')
	const fillColor =
		fill === 'none'
			? 'none'
			: fill === 'semi'
				? colors.solid
				: getColorValue(
						colors,
						color,
						{ solid: 'semi', pattern: 'pattern', fill: 'fill', 'lined-fill': 'linedFill' }[fill] as
							| 'semi'
							| 'pattern'
							| 'fill'
							| 'linedFill'
					)
	const patternId = useUniqueSafeId('pen-hatch')
	return (
		<>
			{fill === 'pattern' && (
				<defs>
					<pattern id={patternId} width={8} height={8} patternUnits="userSpaceOnUse">
						<path d="M -2 2 L 2 -2 M 0 8 L 8 0 M 6 10 L 10 6" stroke={fillColor} strokeWidth={1} />
					</pattern>
				</defs>
			)}
			<path
				d={getPenPath(shape).toD()}
				fill={closed ? (fill === 'pattern' ? `url(#${patternId})` : fillColor) : 'none'}
				stroke={stroke}
				strokeWidth={theme.strokeWidth * { s: 1, m: 1.75, l: 2.5, xl: 5 }[size]}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</>
	)
})

// [3]
export class PenHandleOverlayUtil extends ShapeHandleOverlayUtil {
	override isActive() {
		const shape = this.editor.getOnlySelectedShape()
		if (shape?.type !== 'pen-path') return super.isActive()
		return (
			this.editor.isIn('pen') &&
			!this.editor.getIsReadonly() &&
			!this.editor.getInstanceState().isChangingStyle
		)
	}
}

/*
[1] Handle vectors are relative to their point, so moving a point cannot leave its handles behind.
    A smooth point keeps its two handles collinear; a corner can have independent handles.
[2] De Casteljau subdivision preserves the curve when inserting a point, including the closing
    segment. The search only chooses a parameter; subdivision itself is exact at that parameter.
[3] A separate tool owns point editing. Extending the handle overlay keeps the SDK's handle
    rendering and hit targets without patching the select tool's internal states.
*/
