import {
	DEFAULT_THEME,
	Polygon2d,
	Rectangle2d,
	RecordPropsType,
	ShapeUtil,
	T,
	TLShape,
	TLThemeDefaultColors,
	Vec,
} from 'tldraw'
import { smoothPathData } from './smooth'

// A custom shape for a single Voronoi cell: a filled polygon in its owner's
// colour. Using a real ShapeUtil (rather than drawing cells on the overlay)
// means the finished board is made of genuine tldraw shapes you can select and
// restyle — the territory map is a real, shareable artifact.

export const VORONOI_CELL = 'voronoi-cell'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[VORONOI_CELL]: VoronoiCellProps
	}
}

const voronoiCellProps = {
	color: T.string,
	points: T.arrayOf(T.object({ x: T.number, y: T.number })),
}

type VoronoiCellProps = RecordPropsType<typeof voronoiCellProps>
type VoronoiCellShape = TLShape<typeof VORONOI_CELL>

export class VoronoiCellShapeUtil extends ShapeUtil<VoronoiCellShape> {
	static override type = VORONOI_CELL
	static override props = voronoiCellProps

	override canResize() {
		return false
	}
	override hideSelectionBoundsBg() {
		return true
	}

	override getDefaultProps(): VoronoiCellProps {
		return { color: 'grey', points: [] }
	}

	override getGeometry(shape: VoronoiCellShape) {
		const { points } = shape.props
		if (points.length < 3) return new Rectangle2d({ width: 1, height: 1, isFilled: true })
		return new Polygon2d({ points: points.map((p) => new Vec(p.x, p.y)), isFilled: true })
	}

	override component(shape: VoronoiCellShape) {
		const { points, color } = shape.props
		if (points.length < 3) return null
		const theme = (
			this.editor.getColorMode() === 'dark' ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light
		) as TLThemeDefaultColors
		const palette = theme[color as 'blue'] ?? theme.grey
		return (
			<svg className="tl-svg-container">
				<path d={smoothPathData(points)} fill={palette.solid} fillOpacity={0.85} />
			</svg>
		)
	}

	override getIndicatorPath(shape: VoronoiCellShape) {
		const { points } = shape.props
		if (points.length < 3) return new Path2D()
		return new Path2D(smoothPathData(points))
	}
}
