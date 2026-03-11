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
	// SVG transform attributes look like: transform="translate(123.45, 67.8)"
	const m = attr.match(/translate\(\s*([\d.e+-]+)[,\s]+([\d.e+-]+)\s*\)/)
	if (!m) return { x: 0, y: 0 }
	return { x: parseFloat(m[1]), y: parseFloat(m[2]) }
}

export function getAccumulatedTranslate(el: Element): Vec2 {
	let x = 0
	let y = 0
	let cur: Element | null = el.parentElement
	while (cur) {
		const t = parseTranslate(cur.getAttribute('transform'))
		x += t.x
		y += t.y
		cur = cur.parentElement
	}
	return { x, y }
}

/**
 * Extract element dimensions from a live SVG element using getBBox(),
 * falling back to attribute parsing for non-browser environments (jsdom).
 */
function getNodeDimensions(g: Element): { w: number; h: number } {
	const shapeEl = g.querySelector('.label-container')
	if (shapeEl) {
		try {
			const bbox = (shapeEl as SVGGraphicsElement).getBBox()
			if (bbox.width > 0 && bbox.height > 0) return { w: bbox.width, h: bbox.height }
		} catch {
			/* fall through */
		}
	}

	try {
		const bbox = (g as SVGGraphicsElement).getBBox()
		if (bbox.width > 0 && bbox.height > 0) return { w: bbox.width, h: bbox.height }
	} catch {
		/* fall through */
	}

	const rect = g.querySelector('rect')
	if (rect) {
		const w = parseFloat(rect.getAttribute('width') || '0')
		const h = parseFloat(rect.getAttribute('height') || '0')
		if (w > 0 && h > 0) return { w, h }
	}
	const poly = g.querySelector('polygon')
	if (poly) {
		const pts = (poly.getAttribute('points') || '')
			.trim()
			.split(/\s+/)
			.map((p) => p.split(',').map(Number))
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
	const circle = g.querySelector('circle')
	if (circle) {
		const r = parseFloat(circle.getAttribute('r') || '0')
		if (r > 0) return { w: r * 2, h: r * 2 }
	}
	const ellipse = g.querySelector('ellipse')
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
	for (const g of root.querySelectorAll(selector)) {
		const rawId = g.getAttribute('id') || ''
		const id = idParser(rawId)
		const self = parseTranslate(g.getAttribute('transform'))
		const ancestor = getAccumulatedTranslate(g)
		const { w, h } = getNodeDimensions(g)
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
	for (const g of root.querySelectorAll(selector)) {
		const id = g.getAttribute('id') || ''
		const rect = g.querySelector('rect')
		if (!rect) continue
		const rx = parseFloat(rect.getAttribute('x') || '0')
		const ry = parseFloat(rect.getAttribute('y') || '0')
		const w = parseFloat(rect.getAttribute('width') || '0')
		const h = parseFloat(rect.getAttribute('height') || '0')
		const self = parseTranslate(g.getAttribute('transform'))
		const ancestor = getAccumulatedTranslate(g)
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
			for (const p of points) {
				p.x += ancestor.x
				p.y += ancestor.y
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
	for (const [id, n] of nodes) {
		out.set(id, { x: n.center.x, y: n.center.y })
	}
	for (const [id, c] of clusters) {
		out.set(id, { x: c.topLeft.x + c.width / 2, y: c.topLeft.y + c.height / 2 })
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
	for (const [, n] of nodes) {
		n.center.x *= scale
		n.center.y *= scale
		n.width *= scale
		n.height *= scale
	}
	for (const [, c] of clusters) {
		c.topLeft.x *= scale
		c.topLeft.y *= scale
		c.width *= scale
		c.height *= scale
	}
	for (const edge of edges) {
		for (const p of edge.points) {
			p.x *= scale
			p.y *= scale
		}
	}
}
