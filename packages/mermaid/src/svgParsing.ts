interface Vec2 {
	x: number
	y: number
}

interface ParsedNode {
	id: string
	center: Vec2
	width: number
	height: number
}

interface ParsedCluster {
	id: string
	topLeft: Vec2
	width: number
	height: number
}

type NodeIdParser = (domId: string) => string
type EdgeIdParser = (dataId: string) => { start: string; end: string } | null

function parseTranslate(attr: string | null): Vec2 {
	if (!attr) return { x: 0, y: 0 }
	// Matches SVG translate transforms, e.g. transform="translate(123.45, 67.8)".
	// Handles scientific notation (1.2e+3). Group 1 = x offset, group 2 = y offset.
	const translateMatch = attr.match(/translate\(\s*([\d.e+-]+)[,\s]+([\d.e+-]+)\s*\)/)
	if (!translateMatch) return { x: 0, y: 0 }
	return { x: parseFloat(translateMatch[1]), y: parseFloat(translateMatch[2]) }
}

export function getAccumulatedTranslate(el: Element): Vec2 {
	let x = 0
	let y = 0
	let cur: Element | null = el.parentElement
	while (cur) {
		const parentTranslate = parseTranslate(cur.getAttribute('transform'))
		x += parentTranslate.x
		y += parentTranslate.y
		cur = cur.parentElement
	}
	return { x, y }
}

/**
 * Extract element dimensions from a live SVG element using getBBox(),
 * falling back to attribute parsing for non-browser environments (jsdom).
 */
function getNodeDimensions(groupEl: Element): { w: number; h: number } {
	const shapeEl = groupEl.querySelector('.label-container')
	if (shapeEl) {
		try {
			const bbox = (shapeEl as SVGGraphicsElement).getBBox()
			if (bbox.width > 0 && bbox.height > 0) return { w: bbox.width, h: bbox.height }
		} catch {
			/* fall through */
		}
	}

	try {
		const bbox = (groupEl as SVGGraphicsElement).getBBox()
		if (bbox.width > 0 && bbox.height > 0) return { w: bbox.width, h: bbox.height }
	} catch {
		/* fall through */
	}

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
		const rawId = groupEl.getAttribute('id') || ''
		const id = idParser(rawId)
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

export function parseClustersFromSvg(root: Element, selector: string): Map<string, ParsedCluster> {
	const out = new Map<string, ParsedCluster>()
	for (const groupEl of root.querySelectorAll(selector)) {
		const id = groupEl.getAttribute('id') || ''
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

interface ParsedEdge {
	start: string
	end: string
	points: Vec2[]
}

/**
 * Parse every SVG edge path in DOM order (matching mermaid's edge list order).
 * Unlike the old per-pair map, this preserves all parallel edges individually.
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
			/* ignore malformed data */
		}
	}
	return out
}

/**
 * Build a map of node/cluster id → center (for flowchart and state diagram edge matching).
 */
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

// ---------------------------------------------------------------------------
// Layout scaling and bounds
// ---------------------------------------------------------------------------

export function scaleLayout(
	nodes: Map<string, ParsedNode>,
	clusters: Map<string, ParsedCluster>,
	edges: ParsedEdge[],
	scale: number
): void {
	for (const [, node] of nodes) {
		node.center.x *= scale
		node.center.y *= scale
		node.width *= scale
		node.height *= scale
	}
	for (const [, cluster] of clusters) {
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
