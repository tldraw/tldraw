import { Box, Vec } from '@tldraw/editor'
import { ElbowArrowOptions } from './definitions'

export interface BoxEdges {
	/** Center of top edge */
	top: Vec
	/** Center of right edge */
	right: Vec
	/** Center of bottom edge */
	bottom: Vec
	/** Center of left edge */
	left: Vec
}

export interface BoxCorners {
	/** Top left corner */
	topLeft: Vec
	/** Top right corner */
	topRight: Vec
	/** Bottom right corner */
	bottomRight: Vec
	/** Bottom left corner */
	bottomLeft: Vec
}

export interface BoxInfo extends BoxEdges, BoxCorners {
	/** bounds box */
	box: Box
	/** Center of box */
	center: Vec
}

export interface ArrowNavigationGridBox extends BoxEdges {
	/** Box */
	box: Box
	/** Center of box */
	center: Vec
	/** Expanded bounds */
	expanded: BoxInfo
}

export interface ArrowNavigationGrid {
	options: ElbowArrowOptions
	/** First box bounds */
	A: ArrowNavigationGridBox
	/** Second box bounds */
	B: ArrowNavigationGridBox
	overlap: boolean
	gapDir: 'h' | 'v' | null
	hDir: 'left' | 'right' | 'exact'
	vDir: 'up' | 'down' | 'exact'
	hPos:
		| 'a-left-of-b'
		| 'a-right-of-b'
		| 'a-overlaps-b-left'
		| 'a-overlaps-b-right'
		| 'a-overlaps-b-exact'
		| 'a-contains-b'
		| 'a-inside-b'
	vPos:
		| 'a-above-b'
		| 'a-below-b'
		| 'a-overlaps-b-top'
		| 'a-overlaps-b-bottom'
		| 'a-overlaps-b-exact'
		| 'a-contains-b'
		| 'a-inside-b'
	pathPoints: Vec[]
	gridPoints: Vec[][]
	gridPointsMap: Map<Vec, Vec>
}

export function getArrowNavigationGrid(
	A: Box,
	B: Box,
	options: ElbowArrowOptions
): ArrowNavigationGrid {
	const AE = A.clone().expandBy(options.expandElbowLegLength)
	const BE = B.clone().expandBy(options.expandElbowLegLength)
	const C = Box.FromPoints([A.center, B.center])
	const D = Box.Common([A, B]).expandBy(options.expandElbowLegLength)

	// are A and B disjoint on the x axis, and if so, what's min and max?

	let gapX: number,
		gapY: number,
		mx: number,
		my: number,
		hPos: ArrowNavigationGrid['hPos'],
		vPos: ArrowNavigationGrid['vPos'],
		overlap = false,
		gx = 0,
		gy = 0

	if (A.maxX < B.minX) {
		// range a is to the left of range b
		gapX = B.minX - A.maxX
		mx = A.maxX + gapX / 2
		hPos = 'a-left-of-b'
		gx = gapX
	} else if (A.minX > B.maxX) {
		// range a is to the right of range b
		gapX = A.minX - B.maxX
		mx = B.maxX + gapX / 2
		hPos = 'a-right-of-b'
		gx = gapX
	} else if (A.maxX > B.maxX && A.minX < B.minX) {
		// a contains whole B range
		gapX = Math.abs(B.maxX - B.minX)
		mx = B.center.x
		hPos = 'a-contains-b'
	} else if (B.maxX >= A.maxX && B.minX <= A.minX) {
		// b contains whole A range
		gapX = Math.abs(A.maxX - A.minX)
		mx = A.center.x
		hPos = 'a-inside-b'
	} else if (B.maxX >= A.maxX && B.minX <= A.maxX) {
		// b overlaps A right
		gapX = A.maxX - B.minX
		mx = B.minX + gapX / 2
		hPos = 'a-overlaps-b-right'
	} else if (B.minX <= A.minX && B.maxX >= A.minX) {
		// b overlaps A left
		gapX = B.maxX - A.minX
		mx = A.minX + gapX / 2
		hPos = 'a-overlaps-b-left'
	} else {
		// a overlaps b exactly
		gapX = B.maxX - B.minX
		mx = B.center.x
		hPos = 'a-overlaps-b-exact'
	}

	if (A.maxY < B.minY) {
		// range a is above range b
		gapY = B.minY - A.maxY
		my = A.maxY + gapY / 2
		vPos = 'a-above-b'
		gy = gapY
	} else if (A.minY > B.maxY) {
		// range a is below range b
		gapY = A.minY - B.maxY
		my = B.maxY + gapY / 2
		vPos = 'a-below-b'
		gy = gapY
	} else if (A.maxY > B.maxY && A.minY < B.minY) {
		// a contains whole B range
		gapY = Math.abs(B.maxY - B.minY)
		my = B.center.y
		vPos = 'a-contains-b'
	} else if (B.maxY >= A.maxY && B.minY <= A.minY) {
		// b contains whole A range
		gapY = Math.abs(A.maxY - A.minY)
		my = A.center.y
		vPos = 'a-inside-b'
	} else if (B.maxY >= A.maxY && B.minY <= A.maxY) {
		// b overlaps A bottom
		gapY = A.maxY - B.minY
		my = B.minY + gapY / 2
		vPos = 'a-overlaps-b-bottom'
	} else if (B.minY <= A.minY && B.maxY >= A.minY) {
		// b overlaps A top
		gapY = B.maxY - A.minY
		my = A.minY + gapY / 2
		vPos = 'a-overlaps-b-top'
	} else {
		// a overlaps b exactly
		gapY = B.maxY - B.minY
		my = B.center.y
		vPos = 'a-overlaps-b-exact'
	}

	// The shapes overlap if neither of the x or y ranges are disjoint
	overlap = !(
		hPos === 'a-left-of-b' ||
		hPos === 'a-right-of-b' ||
		vPos === 'a-above-b' ||
		vPos === 'a-below-b'
	)

	const g: ArrowNavigationGrid = {
		options,
		A: {
			box: A,
			center: A.center,
			top: new Vec(A.midX, A.minY),
			right: new Vec(A.maxX, A.midY),
			bottom: new Vec(A.midX, A.maxY),
			left: new Vec(A.minX, A.midY),
			expanded: {
				box: AE,
				center: AE.center,
				top: new Vec(AE.midX, AE.minY),
				right: new Vec(AE.maxX, AE.midY),
				bottom: new Vec(AE.midX, AE.maxY),
				left: new Vec(AE.minX, AE.midY),
				topLeft: new Vec(AE.minX, AE.minY),
				topRight: new Vec(AE.maxX, AE.minY),
				bottomRight: new Vec(AE.maxX, AE.maxY),
				bottomLeft: new Vec(AE.minX, AE.maxY),
			},
		},
		B: {
			box: B,
			center: B.center,
			top: new Vec(B.midX, B.minY),
			right: new Vec(B.maxX, B.midY),
			bottom: new Vec(B.midX, B.maxY),
			left: new Vec(B.minX, B.midY),
			expanded: {
				box: BE,
				center: BE.center,
				top: new Vec(BE.midX, BE.minY),
				right: new Vec(BE.maxX, BE.midY),
				bottom: new Vec(BE.midX, BE.maxY),
				left: new Vec(BE.minX, BE.midY),
				topLeft: new Vec(BE.minX, BE.minY),
				topRight: new Vec(BE.maxX, BE.minY),
				bottomRight: new Vec(BE.maxX, BE.maxY),
				bottomLeft: new Vec(BE.minX, BE.maxY),
			},
		},
		gapDir:
			gx > options.expandElbowLegLength * 2 || gy > options.expandElbowLegLength * 2
				? gx > gy
					? 'h'
					: 'v'
				: null,
		overlap,
		vPos,
		hPos,
		hDir: (A.midX === B.midX
			? 'exact'
			: A.midX > B.midX
				? 'left'
				: 'right') as ArrowNavigationGrid['hDir'],
		vDir: (A.midY === B.midY
			? 'exact'
			: A.midY > B.midY
				? 'up'
				: 'down') as ArrowNavigationGrid['vDir'],
		pathPoints: [],
		gridPoints: [],
		gridPointsMap: new Map(),
		// set of banned vectors (points on C or D that are contained in Ae or Be)
	}

	g.pathPoints = [
		g.A.top,
		g.A.right,
		g.A.bottom,
		g.A.left,
		g.A.expanded.top,
		g.A.expanded.right,
		g.A.expanded.bottom,
		g.A.expanded.left,
		// g.A.e.tr,
		// g.A.e.tl,
		// g.A.e.br,
		// g.A.e.bl,
		g.B.top,
		g.B.right,
		g.B.bottom,
		g.B.left,
		g.B.expanded.top,
		g.B.expanded.right,
		g.B.expanded.bottom,
		g.B.expanded.left,
		// g.B.e.tr,
		// g.B.e.tl,
		// g.B.e.br,
		// g.B.e.bl,
		// in order of ascending priority
		new Vec(D.minX, D.minY),
		new Vec(D.maxX, D.minY),
		new Vec(D.maxX, D.maxY),
		new Vec(D.minX, D.maxY),
		...[
			new Vec(C.minX, D.minY),
			new Vec(C.maxX, D.minY),
			new Vec(D.maxX, C.minY),
			new Vec(D.maxX, C.maxY),
			new Vec(C.maxX, D.maxY),
			new Vec(C.minX, D.maxY),
			new Vec(D.minX, C.maxY),
			new Vec(D.minX, C.minY),
			new Vec(mx, D.minY),
			new Vec(D.maxX, my),
			new Vec(mx, D.maxY),
			new Vec(D.minX, my),
			new Vec(mx, my),
			new Vec(mx, C.minY),
			new Vec(C.maxX, my),
			new Vec(mx, C.maxY),
			new Vec(C.minX, my),
			new Vec(C.minX, C.minY),
			new Vec(C.maxX, C.minY),
			new Vec(C.maxX, C.maxY),
			new Vec(C.minX, C.maxY),
		].filter((p) => !g.B.expanded.box.containsPoint(p) && !g.A.expanded.box.containsPoint(p)),
		g.A.center,
		g.B.center,
	]

	const xs = Array.from(new Set(g.pathPoints.map((p) => p.x))).sort((a, b) => a - b)
	const ys = Array.from(new Set(g.pathPoints.map((p) => p.y))).sort((a, b) => a - b)

	g.gridPoints = Array.from({ length: ys.length }, () => Array.from({ length: xs.length }))

	for (const point of g.pathPoints) {
		const yIndex = ys.indexOf(point.y)
		const xIndex = xs.indexOf(point.x)
		g.gridPoints[yIndex][xIndex] = point
		g.gridPointsMap.set(point, new Vec(xIndex, yIndex))
	}

	return g
}
