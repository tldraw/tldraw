/** A 2D point */
export interface Point {
	x: number
	y: number
}

/** A closed polygon extracted from an SVG */
export interface Polygon {
	points: Point[]
	id?: string
}

/** Available fill strategies */
export type FillStrategyType = 'zigzag' | 'contour'

/** Options for fill path generation */
export interface FillOptions {
	/** Fill strategy to use */
	strategy: FillStrategyType
	/** Distance between fill lines/offsets in pixels (default: 5) */
	stepOver: number
	/** Fill angle in degrees, for zigzag strategy (default: 45) */
	angle: number
	/** Inset margin from polygon boundary in pixels (default: 2) */
	margin: number
	/** Whether to connect zigzag line ends into a continuous path (default: true) */
	connectEnds: boolean
	/** Hole polygons to exclude from fill (negative space) */
	holes?: Polygon[]
}

/** A fill strategy implementation */
export interface FillStrategy {
	name: string
	/** Returns an array of sub-paths (one per connected fill region) */
	generate(polygon: Polygon, options: FillOptions): Point[][]
}

/** Result of fill path generation for a single polygon */
export interface FillResult {
	/** The source polygon */
	polygon: Polygon
	/** The generated fill path as a continuous series of points */
	path: Point[]
}

/** Default fill options */
export const DEFAULT_FILL_OPTIONS: FillOptions = {
	strategy: 'zigzag',
	stepOver: 5,
	angle: 45,
	margin: 2,
	connectEnds: true,
}
