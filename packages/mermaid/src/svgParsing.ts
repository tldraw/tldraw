import { getArrowBend } from './utils'

export interface Vec2 {
	x: number
	y: number
}

export interface ParsedNode {
	id: string
	center: Vec2
	width: number
	height: number
}

export interface ParsedCluster {
	id: string
	topLeft: Vec2
	width: number
	height: number
}

export interface ParsedEdge {
	start: string
	end: string
	points: Vec2[]
}

/** Already-scaled node, cluster, and edge layout for flowchart and state diagram converters. */
export interface ParsedDiagramLayout {
	nodes: Map<string, ParsedNode>
	clusters: Map<string, ParsedCluster>
	edges: ParsedEdge[]
}

type NodeIdParser = (domId: string) => string
type EdgeIdParser = (dataId: string) => { start: string; end: string } | null

// Mermaid >= 11.15 prefixes every rendered element id with the diagram id
// (`mermaid-0-flowchart-A-0` instead of `flowchart-A-0`); older versions do not.
const DIAGRAM_ID_PREFIX = /^mermaid-\d+-/

export function stripDiagramIdPrefix(domId: string): string {
	return domId.replace(DIAGRAM_ID_PREFIX, '')
}

/** Extract the first capture group of `pattern` from a dom id, tolerating the diagram-id prefix. */
export function parseDomId(domId: string, pattern: RegExp): string {
	return stripDiagramIdPrefix(domId).match(pattern)?.[1] ?? domId
}

function parseTranslate(attr: string | null): Vec2 {
	// e.g. transform="translate(123.45, 67.8)", including scientific notation (1.2e+3).
	const match = attr?.match(/translate\(\s*([\d.e+-]+)[,\s]+([\d.e+-]+)\s*\)/)
	if (!match) return { x: 0, y: 0 }
	return { x: parseFloat(match[1]), y: parseFloat(match[2]) }
}

export function getAccumulatedTranslate(el: Element): Vec2 {
	let x = 0
	let y = 0
	for (let cur = el.parentElement; cur; cur = cur.parentElement) {
		const t = parseTranslate(cur.getAttribute('transform'))
		x += t.x
		y += t.y
	}
	return { x, y }
}

function getBBoxSize(el: Element | null): { w: number; h: number } | undefined {
	if (!el) return undefined
	try {
		const bbox = (el as SVGGraphicsElement).getBBox()
		if (bbox.width > 0 && bbox.height > 0) return { w: bbox.width, h: bbox.height }
	} catch {
		// not a live SVG element (e.g. jsdom)
	}
	return undefined
}

/**
 * Element dimensions via getBBox(), falling back to attribute parsing for
 * non-browser environments (jsdom).
 */
function getNodeDimensions(groupEl: Element): { w: number; h: number } {
	const bbox = getBBoxSize(groupEl.querySelector('.label-container')) ?? getBBoxSize(groupEl)
	if (bbox) return bbox

	const rect = groupEl.querySelector('rect')
	if (rect) {
		const w = parseFloat(rect.getAttribute('width') || '0')
		const h = parseFloat(rect.getAttribute('height') || '0')
		if (w > 0 && h > 0) return { w, h }
	}
	const poly = groupEl.querySelector('polygon')
	if (poly) {
		const pts = (poly.getAttribute('points') || '')
			.trim()
			.split(/\s+/)
			.map((pointStr) => pointStr.split(',').map(Number))
		let minX = Infinity
		let maxX = -Infinity
		let minY = Infinity
		let maxY = -Infinity
		for (const [px, py] of pts) {
			minX = Math.min(minX, px)
			maxX = Math.max(maxX, px)
			minY = Math.min(minY, py)
			maxY = Math.max(maxY, py)
		}
		if (maxX > minX && maxY > minY) return { w: maxX - minX, h: maxY - minY }
	}
	const circle = groupEl.querySelector('circle')
	if (circle) {
		const r = parseFloat(circle.getAttribute('r') || '0')
		if (r > 0) return { w: r * 2, h: r * 2 }
	}
	const ellipse = groupEl.querySelector('ellipse')
	if (ellipse) {
		const w = parseFloat(ellipse.getAttribute('rx') || '0') * 2
		const h = parseFloat(ellipse.getAttribute('ry') || '0') * 2
		if (w > 0 && h > 0) return { w, h }
	}
	return { w: 0, h: 0 }
}

export function parseNodesFromSvg(
	root: Element,
	selector: string,
	idParser: NodeIdParser
): Map<string, ParsedNode> {
	const out = new Map<string, ParsedNode>()
	for (const groupEl of root.querySelectorAll(selector)) {
		const id = idParser(groupEl.getAttribute('id') || '')
		const self = parseTranslate(groupEl.getAttribute('transform'))
		const ancestor = getAccumulatedTranslate(groupEl)
		const { w, h } = getNodeDimensions(groupEl)
		out.set(id, {
			id,
			center: { x: ancestor.x + self.x, y: ancestor.y + self.y },
			width: w,
			height: h,
		})
	}
	return out
}

export function parseClustersFromSvg(
	root: Element,
	selector: string,
	idParser: NodeIdParser
): Map<string, ParsedCluster> {
	const out = new Map<string, ParsedCluster>()
	for (const groupEl of root.querySelectorAll(selector)) {
		const id = idParser(groupEl.getAttribute('id') || '')
		const rect = groupEl.querySelector('rect')
		if (!rect) continue
		const rx = parseFloat(rect.getAttribute('x') || '0')
		const ry = parseFloat(rect.getAttribute('y') || '0')
		const w = parseFloat(rect.getAttribute('width') || '0')
		const h = parseFloat(rect.getAttribute('height') || '0')
		const self = parseTranslate(groupEl.getAttribute('transform'))
		const ancestor = getAccumulatedTranslate(groupEl)
		out.set(id, {
			id,
			topLeft: { x: ancestor.x + self.x + rx, y: ancestor.y + self.y + ry },
			width: w,
			height: h,
		})
	}
	return out
}

/**
 * Parse every SVG edge path in DOM order (matching mermaid's edge list order),
 * keeping parallel edges between the same pair as separate entries.
 */
export function parseAllEdgePointsFromSvg(root: Element, parser: EdgeIdParser): ParsedEdge[] {
	const out: ParsedEdge[] = []
	for (const path of root.querySelectorAll('path[data-points]')) {
		const dataId = path.getAttribute('data-id') || path.getAttribute('id') || ''
		const dataPoints = path.getAttribute('data-points')
		if (!dataPoints) continue
		const parsed = parser(dataId)
		if (!parsed) continue
		try {
			const points = JSON.parse(atob(dataPoints))
			const ancestor = getAccumulatedTranslate(path as Element)
			for (const point of points) {
				point.x += ancestor.x
				point.y += ancestor.y
			}
			out.push({ start: parsed.start, end: parsed.end, points })
		} catch {
			// ignore malformed data
		}
	}
	return out
}

/** Map of node/cluster id to center point, for matching DB edges to SVG edge paths. */
export function buildNodeCentersFromSvg(
	nodes: Map<string, ParsedNode>,
	clusters: Map<string, ParsedCluster>
): Map<string, Vec2> {
	const out = new Map<string, Vec2>()
	for (const [id, node] of nodes) {
		out.set(id, { x: node.center.x, y: node.center.y })
	}
	for (const [id, cluster] of clusters) {
		out.set(id, {
			x: cluster.topLeft.x + cluster.width / 2,
			y: cluster.topLeft.y + cluster.height / 2,
		})
	}
	return out
}

/**
 * Claim the unclaimed SVG edge whose endpoints lie closest to the given node
 * centers and return its bend, or 0 when nothing matches. Each SVG edge is
 * claimed at most once so parallel edges get distinct paths.
 */
export function claimNearestEdgeBend(
	svgEdges: ParsedEdge[],
	claimed: Set<number>,
	startCenter: Vec2 | undefined,
	endCenter: Vec2 | undefined
): number {
	if (!startCenter || !endCenter) return 0

	let bestIndex = -1
	let bestDistance = Infinity
	for (let i = 0; i < svgEdges.length; i++) {
		if (claimed.has(i) || svgEdges[i].points.length < 2) continue

		const points = svgEdges[i].points
		const last = points[points.length - 1]
		const distance =
			Math.hypot(points[0].x - startCenter.x, points[0].y - startCenter.y) +
			Math.hypot(last.x - endCenter.x, last.y - endCenter.y)
		if (distance < bestDistance) {
			bestDistance = distance
			bestIndex = i
		}
	}
	if (bestIndex < 0) return 0

	claimed.add(bestIndex)
	return getArrowBend(svgEdges[bestIndex])
}

export function scaleLayout(
	nodes: Map<string, ParsedNode>,
	clusters: Map<string, ParsedCluster>,
	edges: ParsedEdge[],
	scale: number
): void {
	for (const node of nodes.values()) {
		node.center.x *= scale
		node.center.y *= scale
		node.width *= scale
		node.height *= scale
	}
	for (const cluster of clusters.values()) {
		cluster.topLeft.x *= scale
		cluster.topLeft.y *= scale
		cluster.width *= scale
		cluster.height *= scale
	}
	for (const edge of edges) {
		for (const point of edge.points) {
			point.x *= scale
			point.y *= scale
		}
	}
}
