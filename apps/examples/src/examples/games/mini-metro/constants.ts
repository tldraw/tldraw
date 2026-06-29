// Tuning constants and the shared station/line vocabulary. Kept free of tldraw
// imports so the pure simulation (sim.ts) can use them too.

// The fixed map the game is played on, in page space. The camera fits this box
// at the start; new stations only ever spawn inside it so nothing drifts
// off-screen.
export const WORLD = { minX: 0, minY: 0, maxX: 960, maxY: 640 }

export const STATION_R = 22 // station radius in page units
export const TRAIN_SPEED = 150 // page units per second
export const TRAIN_CAPACITY = 6
export const STATION_CAPACITY = 6 // waiting passengers before a station overcrowds
export const OVERCROWD_LIMIT_MS = 18000 // how long a station may stay overcrowded
export const STATION_DWELL_MS = 350 // how long a train pauses at each station
export const MAX_LINES = 3

export const NEW_STATION_MS = 16000 // a new station appears this often
export const PASSENGER_BASE_MS = 4200 // a new passenger appears this often (ramps up)
export const MIN_STATION_GAP = 90 // keep new stations this far from existing ones

// The station shapes, drawn with real tldraw geo shapes. Mini Metro's whole
// language is geometric shapes, which maps one-to-one onto tldraw's geo styles.
export type StationShape = 'circle' | 'triangle' | 'square' | 'diamond' | 'pentagon' | 'star'

// Maps each station shape to a tldraw `geo` style. There's no 'circle' geo, so a
// station circle is an ellipse with equal width and height.
export const GEO_FOR_SHAPE: Record<StationShape, string> = {
	circle: 'ellipse',
	triangle: 'triangle',
	square: 'rectangle',
	diamond: 'diamond',
	pentagon: 'pentagon',
	star: 'star',
}

// tldraw palette colour names, used both for the real line shapes and for the
// canvas overlays, so the game reads as genuinely tldraw.
export const LINE_COLORS = ['red', 'light-blue', 'green'] as const

// The palette names a line may use — a subset of tldraw's colours, narrow enough
// to index the theme directly.
export type LineColor = (typeof LINE_COLORS)[number]

// The shapes the first three stations always use, then the pool new stations are
// drawn from. Circles are weighted heaviest, like the real game.
export const STARTING_SHAPES: StationShape[] = ['circle', 'triangle', 'square']
export const SHAPE_POOL: StationShape[] = [
	'circle',
	'circle',
	'circle',
	'triangle',
	'triangle',
	'square',
	'square',
	'diamond',
	'pentagon',
	'star',
]
